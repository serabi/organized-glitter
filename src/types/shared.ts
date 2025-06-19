/**
 * Shared type definitions used across the application
 * These types should be used to ensure consistency between the frontend and backend
 */

// Import project status types from dedicated file
import type { ProjectStatus, ProjectFilterStatus } from './project-status';
import type { Tag } from './tag';

// Re-export for use elsewhere
export type { ProjectStatus, ProjectFilterStatus, Tag }; // Added Tag here

// Re-export DbProject from the dedicated file
export type { DbProject } from './db-project';

export type ViewType = 'grid' | 'list';

/**
 * Project interface for the frontend application
 * Uses camelCase for JavaScript/TypeScript conventions
 */
export interface Project {
  id: string;
  userId: string;
  title: string;
  company?: string;
  artist?: string;
  drillShape?: string;
  drillType?: string;
  canvasType?: string;
  width?: number;
  height?: number;
  status: ProjectStatus;
  datePurchased?: string;
  dateReceived?: string;
  dateStarted?: string;
  dateCompleted?: string;
  generalNotes?: string;
  imageUrl?: string;
  sourceUrl?: string;
  totalDiamonds?: number;
  kit_category?: 'full' | 'mini'; // Added kit_category
  progressNotes?: ProgressNote[];
  progressImages?: string[];
  tags?: Tag[];
  tagNames?: string[]; // For CSV import compatibility
  createdAt: string;
  updatedAt: string;
}

export interface ProgressNote {
  id: string;
  projectId: string;
  content: string;
  date: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Type for form values when creating/editing a project
 */
export interface ProjectFormValues
  extends Omit<
    Project,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'progressNotes'
    | 'progressImages'
    | 'width'
    | 'height'
    | 'totalDiamonds'
  > {
  id?: string;
  imageFile?: File | null;
  _imageReplacement?: boolean | string;
  width?: string; // Keep as string for form input
  height?: string; // Keep as string for form input
  totalDiamonds?: string | number; // Allow both string (from form) and number (converted)
  kit_category?: 'full' | 'mini'; // Added kit_category
  tagIds?: string[]; // Add tagIds for form compatibility
}

/**
 * Type for project data that includes tag persistence information
 * Used when submitting project forms with tag associations
 */
export type ProjectPersistPayload = Required<Pick<ProjectFormValues, 'tags' | 'tagIds'>> &
  ProjectFormValues;

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

/**
 * Response type for paginated data
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Type for project creation DTO
 */
export interface ProjectCreateDTO {
  userId: string;
  title: string;
  company?: string;
  artist?: string;
  drillShape?: string;
  width?: number; // Change to number for DTO
  height?: number; // Change to number for DTO
  status?: ProjectStatus;
  datePurchased?: string;
  dateReceived?: string;
  dateStarted?: string;
  dateCompleted?: string;
  notes?: string;
  generalNotes?: string;
  imageUrl?: string;
  sourceUrl?: string;
  totalDiamonds?: number;
  // Optional fields that exist in database but not commonly used in imports yet:
  drillType?: string;
  canvasType?: string;
  kit_category?: 'full' | 'mini'; // Added kit_category
  tagIds?: string[]; // Changed from tagNames to tagIds for import optimization
}

/**
 * Type for project update DTO
 */
export type ProjectUpdateDTO = Partial<Omit<ProjectCreateDTO, 'userId'>> & { id: string };

/**
 * Service response types
 */
export type ServiceResponseSuccess<T> = {
  data: T;
  error: null;
  status: 'success';
};

export type ServiceResponseError = {
  data: null;
  error: Error;
  status: 'error';
};

export type ServiceResponse<T> = ServiceResponseSuccess<T> | ServiceResponseError;

// Type guards
export function isServiceResponseSuccess<T>(
  response: ServiceResponse<T>
): response is ServiceResponseSuccess<T> {
  return response.status === 'success' && response.data !== null;
}

export function isServiceResponseError<T>(
  response: ServiceResponse<T>
): response is ServiceResponseError {
  return response.status === 'error' && response.error !== null;
}

// Helper functions to create responses
export function createSuccessResponse<T>(data: T): ServiceResponseSuccess<T> {
  return {
    data,
    error: null,
    status: 'success',
  };
}

export function createErrorResponse(error: Error): ServiceResponseError {
  return {
    data: null,
    error,
    status: 'error',
  };
}
