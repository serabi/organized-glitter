import {
  uploadFileToPocketBase,
  getPocketBaseFileUrl,
  deleteFileFromPocketBase,
} from './pocketbaseStorage';
import { createLogger } from '@/utils/logger';
import { PocketBaseRecord } from '@/types/pocketbase-common';

const logger = createLogger('StorageService');

// PocketBase collection names for file storage
export type CollectionName = 'projects' | 'progress_notes' | 'users';

/**
 * Simplified file upload using PocketBase
 * Note: This requires the record to already exist since PocketBase files are attached to records
 */
export async function uploadFile(
  file: File,
  collection: CollectionName,
  recordId: string,
  fieldName: string = 'image'
): Promise<string> {
  try {
    if (!recordId) {
      throw new Error('Record ID is required for PocketBase file uploads');
    }

    return await uploadFileToPocketBase(file, collection, recordId, fieldName);
  } catch (error) {
    logger.error('File upload failed', { error, collection, recordId, fieldName });
    throw error;
  }
}

/**
 * Get file URL from PocketBase record
 */
export async function getFileUrl(
  record: PocketBaseRecord,
  fieldName: string = 'image'
): Promise<string | null> {
  try {
    return getPocketBaseFileUrl(record, fieldName);
  } catch (error) {
    logger.error('Failed to get file URL', { error, fieldName });
    return null;
  }
}

/**
 * Delete file from PocketBase record
 */
export async function deleteFile(
  recordId: string,
  collection: string,
  fieldName: string = 'image'
): Promise<boolean> {
  try {
    return await deleteFileFromPocketBase(collection, recordId, fieldName);
  } catch (error) {
    logger.error('File deletion failed', { error, recordId, collection, fieldName });
    return false;
  }
}

/**
 * Legacy compatibility - always returns 'pocketbase' now
 */
export async function getCurrentStorageProvider(): Promise<'pocketbase'> {
  return 'pocketbase';
}
