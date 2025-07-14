/**
 * Project Data Transformation Utilities
 * 
 * Provides functions for transforming project data between different formats:
 * - PocketBase records to ProjectType format
 * - ProjectType to form values
 * - Data validation and sanitization
 * 
 * Extracted from useEditProject for reusability across project operations.
 * 
 * @author @serabi
 * @created 2025-01-14
 */

import { ProjectType, ProjectFormValues } from '@/types/project';
import { extractDateOnly } from '@/lib/utils';
import { pb } from '@/lib/pocketbase';
import {
  ProjectsResponse,
  CompaniesResponse,
  ArtistsResponse,
} from '@/types/pocketbase.types';

/**
 * Extended project interface with PocketBase expand relations
 */
export interface ProjectWithExpand extends ProjectsResponse {
  expand?: {
    company?: CompaniesResponse;
    artist?: ArtistsResponse;
    user?: ProjectsResponse['user'];
    project_tags_via_project?: Array<{
      id: string;
      tag?: {
        id: string;
        name: string;
        color?: string;
      };
    }>;
  };
}

/**
 * Transforms PocketBase project record to ProjectType format
 * Handles field mapping, relation expansion, and data sanitization
 * 
 * @param record - PocketBase project record with optional expansions
 * @returns Transformed project in ProjectType format
 */
export function transformProjectFromPocketBase(record: ProjectWithExpand): ProjectType {
  // Extract tags from expanded relations
  const tags = record.expand?.project_tags_via_project?.map(pt => ({
    id: pt.tag?.id || '',
    name: pt.tag?.name || '',
    color: pt.tag?.color || '#gray',
    userId: '', // Will be populated by calling code if needed
    slug: pt.tag?.name?.toLowerCase().replace(/\s+/g, '-') || '',
    createdAt: '',
    updatedAt: '',
  })) || [];

  return {
    id: record.id,
    title: record.title || '',
    userId: record.user || '',
    company: record.expand?.company?.name || '',
    artist: record.expand?.artist?.name || '',
    status: record.status as ProjectType['status'],
    kit_category: record.kit_category || undefined,
    drillShape: record.drill_shape || undefined,
    datePurchased: extractDateOnly(record.date_purchased),
    dateStarted: extractDateOnly(record.date_started),
    dateCompleted: extractDateOnly(record.date_completed),
    dateReceived: extractDateOnly(record.date_received),
    width: record.width || undefined,
    height: record.height || undefined,
    totalDiamonds: record.total_diamonds || undefined,
    generalNotes: record.general_notes || '',
    imageUrl: record.image ? pb.files.getURL(record, record.image) : undefined,
    sourceUrl: record.source_url || undefined,
    createdAt: record.created || '',
    updatedAt: record.updated || '',
    progressNotes: [], // Will be populated separately if needed
    progressImages: [], // Will be populated separately if needed
    tags,
  };
}

/**
 * Prepares initial form data from project data
 * Converts ProjectType to ProjectFormValues format for editing
 * 
 * @param project - Project data from database
 * @returns Form data prepared for editing
 */
export function prepareProjectFormData(project: ProjectType): ProjectFormValues {
  return {
    title: project.title || '',
    userId: project.userId,
    company: project.company || '',
    artist: project.artist || '',
    status: project.status || 'wishlist',
    kit_category: project.kit_category || undefined,
    drillShape: project.drillShape || '',
    datePurchased: project.datePurchased || '',
    dateStarted: project.dateStarted || '',
    dateCompleted: project.dateCompleted || '',
    dateReceived: project.dateReceived || '',
    width: project.width?.toString() || '',
    height: project.height?.toString() || '',
    totalDiamonds: project.totalDiamonds || 0,
    generalNotes: project.generalNotes || '',
    sourceUrl: project.sourceUrl || '',
    imageUrl: project.imageUrl || '',
    tags: project.tags || [],
    tagIds: project.tags?.map(tag => tag.id) || [],
  };
}

/**
 * Validates project form data for common issues
 * 
 * @param formData - Form data to validate
 * @returns Validation result with errors if any
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export function validateProjectFormData(formData: ProjectFormValues): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Required field validation
  if (!formData.title?.trim()) {
    result.errors.push({
      field: 'title',
      message: 'Project title is required',
    });
  }

  if (!formData.userId?.trim()) {
    result.errors.push({
      field: 'userId',
      message: 'User ID is required',
    });
  }

  // Numeric field validation
  if (formData.width && isNaN(Number(formData.width))) {
    result.errors.push({
      field: 'width',
      message: 'Width must be a valid number',
    });
  }

  if (formData.height && isNaN(Number(formData.height))) {
    result.errors.push({
      field: 'height',
      message: 'Height must be a valid number',
    });
  }

  if (formData.totalDiamonds && isNaN(Number(formData.totalDiamonds))) {
    result.errors.push({
      field: 'totalDiamonds',
      message: 'Total diamonds must be a valid number',
    });
  }

  // Date validation
  const dateFields = ['datePurchased', 'dateReceived', 'dateStarted', 'dateCompleted'] as const;
  for (const field of dateFields) {
    const dateValue = formData[field];
    if (dateValue && dateValue !== '') {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        result.errors.push({
          field,
          message: `${field} must be a valid date`,
        });
      }
    }
  }

  // URL validation
  if (formData.sourceUrl && formData.sourceUrl !== '') {
    try {
      new URL(formData.sourceUrl);
    } catch {
      result.warnings.push({
        field: 'sourceUrl',
        message: 'Source URL appears to be invalid',
      });
    }
  }

  // Business logic validation
  if (formData.dateStarted && formData.dateCompleted) {
    const startDate = new Date(formData.dateStarted);
    const completedDate = new Date(formData.dateCompleted);
    if (completedDate < startDate) {
      result.warnings.push({
        field: 'dateCompleted',
        message: 'Completion date is before start date',
      });
    }
  }

  if (formData.datePurchased && formData.dateReceived) {
    const purchaseDate = new Date(formData.datePurchased);
    const receivedDate = new Date(formData.dateReceived);
    if (receivedDate < purchaseDate) {
      result.warnings.push({
        field: 'dateReceived',
        message: 'Received date is before purchase date',
      });
    }
  }

  // Set overall validity
  result.valid = result.errors.length === 0;

  return result;
}

/**
 * Sanitizes form data by trimming strings and normalizing values
 * 
 * @param formData - Form data to sanitize
 * @returns Sanitized form data
 */
export function sanitizeProjectFormData(formData: ProjectFormValues): ProjectFormValues {
  return {
    ...formData,
    title: formData.title?.trim() || '',
    company: formData.company?.trim() || '',
    artist: formData.artist?.trim() || '',
    generalNotes: formData.generalNotes?.trim() || '',
    sourceUrl: formData.sourceUrl?.trim() || '',
    drillShape: formData.drillShape?.trim() || '',
    // Normalize numeric fields
    width: formData.width?.toString().trim() || '',
    height: formData.height?.toString().trim() || '',
    totalDiamonds: typeof formData.totalDiamonds === 'string' 
      ? Number(formData.totalDiamonds.trim()) || 0
      : formData.totalDiamonds || 0,
  };
}

/**
 * Creates a default project form data structure
 * Useful for new project creation
 * 
 * @param userId - User ID for the new project
 * @param overrides - Optional field overrides
 * @returns Default project form data
 */
export function createDefaultProjectFormData(
  userId: string,
  overrides: Partial<ProjectFormValues> = {}
): ProjectFormValues {
  return {
    title: '',
    userId,
    company: '',
    artist: '',
    status: 'wishlist',
    kit_category: undefined,
    drillShape: '',
    datePurchased: '',
    dateStarted: '',
    dateCompleted: '',
    dateReceived: '',
    width: '',
    height: '',
    totalDiamonds: 0,
    generalNotes: '',
    sourceUrl: '',
    imageUrl: '',
    tags: [],
    tagIds: [],
    ...overrides,
  };
}

/**
 * Compares two project form data objects for changes
 * Useful for dirty state detection
 * 
 * @param original - Original form data
 * @param current - Current form data
 * @returns Array of changed field names
 */
export function getChangedFields(
  original: ProjectFormValues,
  current: ProjectFormValues
): string[] {
  const changedFields: string[] = [];

  // Compare all keys from both objects
  const allKeys = new Set([...Object.keys(original), ...Object.keys(current)]);

  for (const key of allKeys) {
    const originalValue = original[key as keyof ProjectFormValues];
    const currentValue = current[key as keyof ProjectFormValues];

    // Handle special cases for comparison
    if (key === 'tags') {
      // Compare tag arrays by ID
      const originalTags = Array.isArray(originalValue) ? originalValue : [];
      const currentTags = Array.isArray(currentValue) ? currentValue : [];
      const originalTagIds = originalTags.map((t: { id: string }) => t.id).sort();
      const currentTagIds = currentTags.map((t: { id: string }) => t.id).sort();
      if (JSON.stringify(originalTagIds) !== JSON.stringify(currentTagIds)) {
        changedFields.push(key);
      }
    } else if (key === 'tagIds') {
      // Compare tag ID arrays
      const originalIds = Array.isArray(originalValue) ? (originalValue as string[]).sort() : [];
      const currentIds = Array.isArray(currentValue) ? (currentValue as string[]).sort() : [];
      if (JSON.stringify(originalIds) !== JSON.stringify(currentIds)) {
        changedFields.push(key);
      }
    } else {
      // Standard comparison for other fields
      if (originalValue !== currentValue) {
        changedFields.push(key);
      }
    }
  }

  return changedFields;
}