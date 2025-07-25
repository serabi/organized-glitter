/**
 * Usage examples for FilesService
 * This file demonstrates how to use the modern file handling service
 */

import { FilesService } from './files.service';
import type { FileUploadOptions } from './files.service';

/**
 * Example: Upload a project image with compression
 */
export async function uploadProjectImage(file: File, projectId: string) {
  try {
    // Validate file first (optional - uploadFile does this automatically)
    const validation = FilesService.validateFile(file, 'project-image');
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Upload with compression and progress tracking
    const result = await FilesService.uploadFile(file, {
      context: 'project-image',
      collection: 'projects',
      recordId: projectId,
      fieldName: 'image',
      compress: true,
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress}%`);
      },
    });

    console.log('Upload successful:', {
      url: result.url,
      originalSize: `${(result.originalSize / 1024 / 1024).toFixed(2)}MB`,
      compressedSize: result.compressedSize 
        ? `${(result.compressedSize / 1024 / 1024).toFixed(2)}MB` 
        : 'No compression',
      savings: result.compressionRatio ? `${result.compressionRatio}%` : 'None',
    });

    return result.url;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

/**
 * Example: Upload a progress note image
 */
export async function uploadProgressNoteImage(file: File, progressNoteId: string) {
  const options: FileUploadOptions = {
    context: 'progress-note',
    collection: 'progress_notes',
    recordId: progressNoteId,
    fieldName: 'image',
    compress: true,
  };

  return await FilesService.uploadFile(file, options);
}

/**
 * Example: Upload user avatar
 */
export async function uploadUserAvatar(file: File, userId: string) {
  const options: FileUploadOptions = {
    context: 'avatar',
    collection: 'users',
    recordId: userId,
    fieldName: 'avatar',
    compress: true,
  };

  return await FilesService.uploadFile(file, options);
}

/**
 * Example: Get file URL with thumbnail
 */
export function getProjectImageUrl(project: any, size: 'thumbnail' | 'card' | 'full' = 'card') {
  const thumbSizes = {
    thumbnail: '150x150',
    card: '300x200f',
    full: undefined, // No thumbnail = full size
  };

  return FilesService.getFileUrl(project, 'image', thumbSizes[size]);
}

/**
 * Example: Delete a file
 */
export async function deleteProjectImage(projectId: string) {
  const success = await FilesService.deleteFile('projects', projectId, 'image');
  
  if (success) {
    console.log('Image deleted successfully');
  } else {
    console.error('Failed to delete image');
  }
  
  return success;
}

/**
 * Example: Check if file should be compressed before upload
 */
export function shouldCompressBeforeUpload(file: File, context: 'project-image' | 'progress-note' | 'avatar') {
  const needsCompression = FilesService.shouldCompressFile(file, context);
  
  if (needsCompression) {
    console.log(`File ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) should be compressed`);
  } else {
    console.log(`File ${file.name} is already optimally sized`);
  }
  
  return needsCompression;
}

/**
 * Example: Validate file before showing upload UI
 */
export function validateFileForUpload(file: File, context: 'project-image' | 'progress-note' | 'avatar') {
  const validation = FilesService.validateFile(file, context);
  
  if (!validation.isValid) {
    // Show error to user
    alert(`Upload error: ${validation.error}`);
    return false;
  }
  
  if (validation.warnings) {
    // Show warnings to user
    validation.warnings.forEach(warning => {
      console.warn(`Upload warning: ${warning}`);
    });
  }
  
  return true;
}