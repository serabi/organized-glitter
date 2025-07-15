/**
 * Utility functions for mapping between frontend (camelCase) and backend (snake_case) field names
 * Provides type-safe conversion for PocketBase operations and FormData building
 *
 * @author @serabi
 * @created 2025-01-14
 */

import type { ProjectFormValues } from '@/types/project';
import type { ProjectUpdateData } from '@/types/file-upload';
import { toUserDateString } from '@/utils/timezoneUtils';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('field-mapping');

/**
 * Maps camelCase form fields to snake_case PocketBase fields
 * Handles type conversion and null values appropriately
 * Preserves proper data types for PocketBase API
 */
export function mapFormDataToPocketBase(
  formData: ProjectFormValues,
  userTimezone?: string
): ProjectUpdateData {
  // Helper function to safely parse integers
  const safeParseInt = (value: string | number | undefined): number | null => {
    if (value === undefined || value === null || value === '') return null;
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return isNaN(num) ? null : num;
  };

  // Helper function to handle optional string fields
  const safeString = (value: string | undefined): string | undefined => {
    return value === '' ? undefined : value;
  };

  // Helper function to format dates for PocketBase (YYYY-MM-DD format only)
  const formatDateForPocketBase = (
    value: string | undefined,
    userTimezone?: string
  ): string | null => {
    if (!value || value === '') return null;

    // Use timezone-safe conversion
    return toUserDateString(value, userTimezone);
  };

  // Helper function to check if a value looks like a PocketBase ID (15 characters)
  const isValidPocketBaseId = (value: string | undefined): boolean => {
    return typeof value === 'string' && value.length === 15 && /^[a-zA-Z0-9]+$/.test(value);
  };

  // Helper function to handle relation fields - only include if they look like valid IDs
  const safeRelationId = (value: string | undefined): string | undefined => {
    if (!value || value === '' || value === 'N/A') return undefined;
    return isValidPocketBaseId(value) ? value : undefined;
  };

  const result: ProjectUpdateData = {
    title: formData.title,
    status: formData.status,
    kit_category: safeString(formData.kit_category),
    drill_shape: safeString(formData.drillShape),
    date_purchased: formatDateForPocketBase(formData.datePurchased, userTimezone),
    date_started: formatDateForPocketBase(formData.dateStarted, userTimezone),
    date_completed: formatDateForPocketBase(formData.dateCompleted, userTimezone),
    date_received: formatDateForPocketBase(formData.dateReceived, userTimezone),
    width: safeParseInt(formData.width),
    height: safeParseInt(formData.height),
    total_diamonds: safeParseInt(formData.totalDiamonds),
    general_notes: safeString(formData.generalNotes),
    source_url: safeString(formData.sourceUrl),
  };

  // Only include company and artist if they are valid PocketBase IDs
  const companyId = safeRelationId(formData.company);
  const artistId = safeRelationId(formData.artist);

  if (companyId) {
    result.company = companyId;
  }

  if (artistId) {
    result.artist = artistId;
  }

  return result;
}

/**
 * Field mapping configuration for dynamic conversions
 */
export const FIELD_MAPPING = {
  // Frontend (camelCase) -> Backend (snake_case)
  datePurchased: 'date_purchased',
  dateReceived: 'date_received',
  dateStarted: 'date_started',
  dateCompleted: 'date_completed',
  drillShape: 'drill_shape',
  generalNotes: 'general_notes',
  sourceUrl: 'source_url',
  totalDiamonds: 'total_diamonds',
  kitCategory: 'kit_category',
} as const;

/**
 * Reverse mapping for backend to frontend field conversion
 */
export const REVERSE_FIELD_MAPPING = Object.fromEntries(
  Object.entries(FIELD_MAPPING).map(([frontend, backend]) => [backend, frontend])
) as Record<string, string>;

/**
 * Type-safe field name mapper
 * Converts a camelCase field name to snake_case
 */
export function mapFieldName(camelCaseField: keyof typeof FIELD_MAPPING): string {
  return FIELD_MAPPING[camelCaseField] || camelCaseField;
}

/**
 * Converts snake_case field name back to camelCase
 */
export function reverseMapFieldName(snakeCaseField: string): string {
  return REVERSE_FIELD_MAPPING[snakeCaseField] || snakeCaseField;
}

/**
 * Generic function to convert any object from camelCase to snake_case
 * Useful for dynamic field mapping scenarios
 */
export function camelToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = FIELD_MAPPING[key as keyof typeof FIELD_MAPPING] || key;
    result[snakeKey] = value;
  }

  return result;
}

/**
 * Generic function to convert any object from snake_case to camelCase
 */
export function snakeToCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = REVERSE_FIELD_MAPPING[key] || key;
    result[camelKey] = value;
  }

  return result;
}

/**
 * Options for building FormData for PocketBase project updates
 */
export interface ProjectFormDataOptions {
  /** Resolved company ID (if company name was resolved) */
  companyId?: string | null;
  /** Resolved artist ID (if artist name was resolved) */
  artistId?: string | null;
  /** User timezone for date formatting */
  userTimezone?: string;
}

/**
 * Builds FormData for PocketBase project update operations
 * Handles field mapping, type conversion, and file uploads
 *
 * @param formData - Form values to convert
 * @param options - Additional options for FormData building
 * @returns FormData ready for PocketBase submission
 */
export function buildProjectFormData(
  formData: ProjectFormValues,
  options: ProjectFormDataOptions = {}
): FormData {
  const { companyId, artistId, userTimezone } = options;
  const pbFormData = new FormData();

  // Fields to exclude from direct mapping
  const fieldsToExclude = [
    'id',
    'tags',
    'tagIds',
    'imageFile',
    '_imageReplacement',
    'company',
    'artist',
    'tagNames', // CSV import compatibility field
  ];

  // Date fields that should allow empty strings (to clear the field in PocketBase)
  const dateFields = ['datePurchased', 'dateReceived', 'dateStarted', 'dateCompleted'];

  // Helper function to format dates for PocketBase (YYYY-MM-DD format only)
  const formatDateForPocketBase = (value: string | undefined): string | null => {
    if (!value || value === '') return null;
    return toUserDateString(value, userTimezone);
  };

  // Map form fields to PocketBase fields with proper type conversion
  Object.entries(formData).forEach(([key, value]) => {
    if (!fieldsToExclude.includes(key) && value !== undefined && value !== null) {
      // For date fields, allow empty strings (required to clear DateFields in PocketBase)
      const shouldInclude = dateFields.includes(key) ? true : value !== '';

      if (shouldInclude) {
        // Convert camelCase field names to snake_case for PocketBase
        const fieldName = FIELD_MAPPING[key as keyof typeof FIELD_MAPPING] || key;

        // Handle special date field formatting
        if (dateFields.includes(key)) {
          const formattedDate = formatDateForPocketBase(value as string);
          if (formattedDate !== null) {
            pbFormData.append(fieldName, formattedDate);
          } else if (value === '') {
            // Explicitly append empty string to clear the field
            pbFormData.append(fieldName, '');
          }
        } else {
          pbFormData.append(fieldName, String(value));
        }

        // Log field mapping for debugging
        if (FIELD_MAPPING[key as keyof typeof FIELD_MAPPING]) {
          logger.debug(`Field mapping: ${key} -> ${fieldName} = "${value}"`);
        }
      }
    }
  });

  // Add resolved company and artist IDs if provided
  if (companyId) {
    pbFormData.append('company', companyId);
    logger.debug(`Added resolved company ID: ${companyId}`);
  }

  if (artistId) {
    pbFormData.append('artist', artistId);
    logger.debug(`Added resolved artist ID: ${artistId}`);
  }

  // Handle image upload if present
  if (formData.imageFile && formData.imageFile instanceof File) {
    pbFormData.append('image', formData.imageFile);
    logger.debug(`Added image file: ${formData.imageFile.name}`);
  }

  return pbFormData;
}
