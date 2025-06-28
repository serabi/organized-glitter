import { isAuthenticated, getCurrentUserId } from '@/lib/pocketbase';
import { isDevelopment } from '@/utils/env';
import { uploadFile } from '@/utils/storageService';
import { createLogger } from '@/utils/secureLogger';

const imageUploadLogger = createLogger('ImageUpload');
import {
  PROJECT_IMAGE_CONSTANTS,
  PROGRESS_NOTE_CONSTANTS,
} from '@/components/projects/ProgressNoteForm/constants';

/**
 * Uploads an image using PocketBase storage
 * @param file The file to upload
 * @param bucketFolder The folder to use within storage ('avatars' or 'project-images')
 * @param uploadContext Context for the upload ('project-image' | 'progress-note' | 'avatar')
 * @param recordId Optional record ID for PocketBase file attachment
 * @returns A URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  bucketFolder: 'avatars' | 'project-images' = 'project-images',
  uploadContext: 'project-image' | 'progress-note' | 'avatar' = 'project-image',
  recordId?: string
): Promise<string> {
  // Validate file
  if (!file) {
    throw new Error('No file provided for upload');
  }

  // Validate file size based on upload context
  // Both progress notes and project images allow larger uploads (50MB) for pre-compression
  const getMaxFileSize = (context: string) => {
    if (context === 'avatar') return 5 * 1024 * 1024; // 5MB for avatars
    if (context === 'project-image') return PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE;
    if (context === 'progress-note') return PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE;
    return 50 * 1024 * 1024; // Default fallback, though should be covered by specific contexts
  };

  const MAX_FILE_SIZE = getMaxFileSize(uploadContext);
  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
    // Determine maxSizeMB based on the constant used, for accurate error messaging
    let maxSizeMB;
    if (uploadContext === 'avatar') {
      maxSizeMB = 5;
    } else if (uploadContext === 'project-image') {
      maxSizeMB = PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024);
    } else if (uploadContext === 'progress-note') {
      maxSizeMB = PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024);
    } else {
      maxSizeMB = 50; // Fallback, should align with the default in getMaxFileSize
    }
    const imageType =
      uploadContext === 'avatar'
        ? 'avatar'
        : uploadContext === 'progress-note'
          ? 'progress note'
          : 'project';
    throw new Error(
      `File size is ${fileSizeMB}MB, which exceeds the ${maxSizeMB}MB limit for ${imageType} images.`
    );
  }

  // Validate file type
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];

  // Check file type and extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const isAllowedType =
    ALLOWED_TYPES.includes(file.type) ||
    (file.type === '' && ALLOWED_EXTENSIONS.includes('.' + fileExtension));

  if (!isAllowedType) {
    throw new Error(
      `Invalid file type. Allowed types: ${ALLOWED_TYPES.filter(t => !t.startsWith('image/')).join(', ')}, HEIC`
    );
  }

  // Validate file name
  if (file.name.includes('#') || file.name.includes('?') || file.name.includes('%')) {
    console.warn('File name contains special characters that might cause issues with storage');
  }

  // Initialize variables for retry logic
  const maxAttempts = 3;

  try {
    console.log('Uploading image to PocketBase Storage...');

    // Check authentication
    if (!isAuthenticated()) {
      throw new Error('No active user session found. Please log in and try again.');
    }

    // Upload file with retry logic
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Upload attempt ${attempts}/${maxAttempts}...`);

      try {
        // Enhanced metadata for debugging
        console.log('File details:', {
          name: file.name,
          type: file.type,
          size: `${(file.size / 1024).toFixed(2)} KB`,
          lastModified: new Date(file.lastModified).toISOString(),
        });

        // Ensure file has a proper extension before upload
        let fileToUpload = file;
        const hasExtension =
          file.name.includes('.') && (file.name.split('.').pop()?.length || 0) > 0;

        if (!hasExtension) {
          console.warn(
            `[imageUpload] File "${file.name}" has no extension, adding based on MIME type`
          );
          // Determine extension from MIME type
          let extension = 'jpg'; // default
          if (file.type === 'image/png') extension = 'png';
          else if (file.type === 'image/gif') extension = 'gif';
          else if (file.type === 'image/webp') extension = 'webp';
          else if (file.type === 'image/heic') extension = 'heic';
          else if (file.type === 'image/heif') extension = 'heif';

          const newFileName = `${file.name}.${extension}`;
          fileToUpload = new File([file], newFileName, { type: file.type });
          console.log(`[imageUpload] Renamed file to: ${newFileName}`);
        }

        // Call the storage service upload function
        console.log(
          `[imageUpload] Calling uploadFile with file: ${fileToUpload.name}, bucket: ${bucketFolder}`
        );

        // Get the current user ID to include in logs
        const userId = getCurrentUserId() || 'unknown';

        imageUploadLogger.debug(`Current user ID: ${userId}`);

        try {
          console.log(`[imageUpload] About to call uploadFile with bucket: ${bucketFolder}`);

          // For PocketBase, we need a record ID for file uploads
          if (!recordId) {
            throw new Error(
              'Record ID is required for PocketBase file uploads. Please provide a recordId parameter.'
            );
          }

          // Map upload context to collection name and field name
          let collection: 'users' | 'progress_notes' | 'projects';
          let fieldName: string;

          if (uploadContext === 'avatar') {
            collection = 'users';
            fieldName = 'avatar';
          } else if (uploadContext === 'progress-note') {
            collection = 'progress_notes';
            fieldName = 'image';
          } else {
            // Default to projects for project-image context
            collection = 'projects';
            fieldName = 'image';
          }

          console.log(
            `[imageUpload] Upload context: ${uploadContext}, collection: ${collection}, recordId: ${recordId}, fieldName: ${fieldName}`
          );

          const fileUrl = await uploadFile(fileToUpload, collection, recordId, fieldName);

          if (!fileUrl) {
            console.error('[imageUpload] uploadFile returned empty URL');
            console.error('[imageUpload] Upload parameters:', {
              collection,
              recordId,
              fieldName,
              fileName: fileToUpload.name,
            });
            throw new Error('Storage upload completed but no URL was returned');
          }

          console.log(`[imageUpload] Image upload successful! URL length: ${fileUrl.length}`);
          console.log(`[imageUpload] URL: ${fileUrl}`);

          return fileUrl;
        } catch (storageError) {
          console.error('[imageUpload] Error in uploadFile:', storageError);
          console.error('[imageUpload] Storage error details:', {
            name: storageError instanceof Error ? storageError.name : 'Unknown',
            message: storageError instanceof Error ? storageError.message : String(storageError),
            stack: storageError instanceof Error ? storageError.stack : undefined,
          });
          throw storageError; // Re-throw to be caught by the outer try/catch
        }
      } catch (attemptError) {
        lastError = attemptError instanceof Error ? attemptError : new Error(String(attemptError));
        console.error(`Error in attempt ${attempts}:`, lastError);

        // More detailed logging of the error
        console.error('Upload error details:', {
          attempt: attempts,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          timestamp: new Date().toISOString(),
          errorObject: attemptError,
        });

        if (attemptError instanceof Error && attemptError.message.includes('Unauthorized')) {
          // Check authentication status
          console.log('Authentication failed, checking PocketBase auth status...');
          if (!isAuthenticated()) {
            throw new Error('Authentication failed. Please log in and try again.');
          }
        }

        if (attempts >= maxAttempts) break;

        // Exponential backoff for retries
        const delay = Math.min(1000 * attempts, 10000); // Cap at 10 seconds
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If we get here, all attempts failed
    const errorMessage = lastError
      ? `Upload failed after ${maxAttempts} attempts: ${lastError.message}`
      : `Upload failed after ${maxAttempts} attempts`;

    console.error('Final upload error details:', {
      error: lastError,
      attempts,
      maxAttempts,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });

    // Try to get more information about the file
    try {
      const reader = new FileReader();
      reader.onload = () => {
        console.log(
          `File read successful. Data size: ${reader.result?.toString().length || 0} bytes`
        );
      };
      reader.onerror = e => {
        console.error('Error reading file:', e);
      };
      reader.readAsDataURL(file);
    } catch (readError) {
      console.error('Error setting up file reader:', readError);
    }

    // Try fallback for development environments
    if (isDevelopment) {
      console.log('In development environment, using placeholder image as fallback...');
      try {
        // Generate a placeholder image URL (not authenticated - for development only)
        const timestamp = new Date().getTime();
        const fileName = file.name.replace(/\s+/g, '-').toLowerCase();
        const shortName = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;

        // Create a placeholder
        let placeholderUrl: string;

        try {
          // Read image dimensions for better placeholder
          // Since this is only for development, we don't need authentication for placeholders
          const dimensions = await new Promise<{ width: number; height: number }>(
            (resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                resolve({ width: img.width, height: img.height });
                URL.revokeObjectURL(img.src); // Clean up
              };
              img.onerror = () => reject(new Error('Failed to load image for dimensions'));
              img.src = URL.createObjectURL(file);
            }
          );

          // Use dimensions for a better placeholder
          const width = Math.min(dimensions.width, 800); // Cap at 800px
          const height = Math.min(dimensions.height, 800); // Cap at 800px

          placeholderUrl = `https://placehold.co/${width}x${height}/png?text=${encodeURIComponent(shortName)}-${timestamp}`;
        } catch (dimError) {
          // Default placeholder if dimensions can't be determined
          placeholderUrl = `https://placehold.co/400x400/png?text=${encodeURIComponent(shortName)}-${timestamp}`;
        }

        console.log('Created placeholder image:', placeholderUrl);
        return `${placeholderUrl}#fallback=true`;
      } catch (fallbackError) {
        console.error('Fallback placeholder creation failed:', fallbackError);
      }
    }

    throw new Error(errorMessage);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? `Image upload failed: ${error.message}`
        : 'An unknown error occurred during image upload';

    console.error('Upload error:', {
      message: errorMessage,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    });

    // Re-throw with a user-friendly message
    throw new Error(errorMessage);
  }
}
