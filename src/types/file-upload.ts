/**
 * Type definitions for file upload and project update operations
 * Provides type safety for image uploads and project mutations
 */

import type { ProjectFormValues } from './shared';

/**
 * Data structure for file upload operations
 */
export interface FileUploadData {
  /** The File object to upload */
  file: File;
  /** Field name where the file will be stored */
  fieldName: string;
  /** Optional existing URL to replace */
  existingUrl?: string;
}

/**
 * Payload for project updates that may include file uploads
 * Separates file data from regular project data for proper handling
 */
export interface ProjectUpdatePayload {
  /** Project ID */
  id: string;
  /** Regular project data (snake_case for PocketBase) */
  data: ProjectUpdateData;
  /** Optional file upload data */
  fileUpload?: FileUploadData;
}

/**
 * Project update data in snake_case format for PocketBase
 * Maps from camelCase frontend fields to snake_case backend fields
 */
export interface ProjectUpdateData {
  title?: string;
  company?: string;
  artist?: string;
  status?: string;
  kit_category?: string;
  drill_shape?: string;
  date_purchased?: string | null;
  date_started?: string | null;
  date_completed?: string | null;
  date_received?: string | null;
  width?: number | null;
  height?: number | null;
  total_diamonds?: number | null;
  general_notes?: string;
  source_url?: string;
  // Image field - will be handled separately in file upload
  image?: string | File;
}

/**
 * Form data that includes file upload information
 * Extends ProjectFormValues with file handling
 */
export interface ProjectFormWithFile extends ProjectFormValues {
  /** File selected for upload */
  imageFile?: File | null;
  /** Flag indicating image replacement */
  _imageReplacement?: boolean | string;
}
