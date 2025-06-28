import { pb, getFileUrl } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';
import { PocketBaseRecord } from '@/types/pocketbase-common';

const logger = createLogger('PocketBaseStorage');

// PocketBase collection names
export type CollectionName = 'projects' | 'progress_notes' | 'users';

// Legacy bucket type for migration compatibility only
type LegacyBucketType = 'projects' | 'progress_notes' | 'users' | 'project-images' | 'avatars';

/**
 * Simple file upload to PocketBase
 * Files are stored directly on the record (project, progress_note, or user)
 */
export async function uploadFileToPocketBase(
  file: File,
  collection: string,
  recordId: string,
  fieldName: string = 'image'
): Promise<string> {
  try {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    // Create FormData for the file
    const formData = new FormData();
    formData.append(fieldName, file);

    console.log(
      `[PocketBaseStorage] Uploading file to collection: ${collection}, recordId: ${recordId}, fieldName: ${fieldName}`
    );

    // Update the record with the new file
    const record = await pb.collection(collection).update(recordId, formData);

    console.log(`[PocketBaseStorage] Upload response:`, {
      id: record.id,
      fieldValue: record[fieldName],
      allFields: Object.keys(record),
    });

    // Get the file URL
    const filename = record[fieldName];
    if (!filename) {
      console.error(
        `[PocketBaseStorage] No filename found in field '${fieldName}'. Record:`,
        record
      );
      throw new Error('File upload succeeded but no filename returned');
    }

    const url = getFileUrl(record, filename);

    console.log(`[PocketBaseStorage] Generated URL: ${url}`);

    if (!url) {
      console.error(`[PocketBaseStorage] getFileUrl returned empty URL for filename: ${filename}`);
      throw new Error('Failed to generate file URL');
    }

    logger.info('File uploaded successfully', {
      collection,
      recordId,
      fieldName,
      filename,
      fileSize: file.size,
      url,
    });

    return url;
  } catch (error) {
    logger.error('File upload failed', { error, collection, recordId, fieldName });
    throw error;
  }
}

/**
 * Get file URL from PocketBase record
 */
export function getPocketBaseFileUrl(
  record: PocketBaseRecord,
  fieldName: string = 'image',
  thumb?: string
): string {
  if (!record || !record[fieldName]) {
    return '';
  }

  return getFileUrl(record, record[fieldName] as string, thumb);
}

/**
 * Delete file from PocketBase record
 */
export async function deleteFileFromPocketBase(
  collection: string,
  recordId: string,
  fieldName: string = 'image'
): Promise<boolean> {
  try {
    // Set the field to null to remove the file
    const formData = new FormData();
    formData.append(fieldName, '');

    await pb.collection(collection).update(recordId, formData);

    logger.info('File deleted successfully', { collection, recordId, fieldName });
    return true;
  } catch (error) {
    logger.error('File deletion failed', { error, collection, recordId, fieldName });
    return false;
  }
}

/**
 * Legacy compatibility function for migration scripts only
 * Maps old bucket types to PocketBase collection names
 * @deprecated Use collection names directly instead
 */
export function mapBucketTypeToCollection(bucketType: LegacyBucketType): CollectionName {
  switch (bucketType) {
    case 'projects':
    case 'project-images':
      return 'projects';
    case 'progress_notes':
      return 'progress_notes';
    case 'users':
    case 'avatars':
      return 'users';
    default:
      return 'projects';
  }
}
