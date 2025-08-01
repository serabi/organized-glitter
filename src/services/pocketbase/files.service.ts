/**
 * File handling service for PocketBase integration
 * Consolidates file upload, compression, and validation patterns
 * @author @serabi
 * @created 2025-01-24
 */

import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/logger';
import { ErrorHandler } from './base/ErrorHandler';
import { compressProjectImage, validateProjectImageFile } from '@/utils/projectImageCompression';
import { compressProgressImage, validateProgressImageFile } from '@/utils/progressImageCompression';
import type { ValidationResult } from '@/utils/projectImageCompression';

const logger = createLogger('FilesService');

/**
 * Supported file upload contexts
 */
export type FileUploadContext = 'project-image' | 'progress-note' | 'avatar';

/**
 * PocketBase collection mapping for file uploads
 */
export type FileCollection = 'projects' | 'progress_notes' | 'users';

/**
 * File upload options
 */
export interface FileUploadOptions {
  context: FileUploadContext;
  collection: FileCollection;
  recordId: string;
  fieldName?: string;
  compress?: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  url: string;
  filename: string;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
}

/**
 * File validation configuration
 */
interface FileValidationConfig {
  maxSizeMB: number;
  allowedTypes: string[];
  allowedExtensions: string[];
}

/**
 * Context-specific validation configurations
 */
const VALIDATION_CONFIGS: Record<FileUploadContext, FileValidationConfig> = {
  'project-image': {
    maxSizeMB: 50,
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
  },
  'progress-note': {
    maxSizeMB: 50,
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
  },
  avatar: {
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
};

/**
 * Modern files service with consistent patterns
 */
export class FilesService {
  /**
   * Validate file based on upload context
   */
  static validateFile(file: File, context: FileUploadContext): ValidationResult {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    const config = VALIDATION_CONFIGS[context];
    const warnings: string[] = [];

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > config.maxSizeMB) {
      return {
        isValid: false,
        error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds the ${config.maxSizeMB}MB limit for ${context} uploads.`,
      };
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const isAllowedType =
      config.allowedTypes.includes(file.type) ||
      (file.type === '' && config.allowedExtensions.includes('.' + fileExtension));

    if (!isAllowedType) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`,
      };
    }

    // Add warnings for potentially problematic file names
    if (file.name.includes('#') || file.name.includes('?') || file.name.includes('%')) {
      warnings.push('File name contains special characters that might cause upload issues.');
    }

    // Add warning for large files
    if (fileSizeMB > config.maxSizeMB * 0.5) {
      warnings.push(`Large file (${fileSizeMB.toFixed(2)}MB) will take longer to process.`);
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Compress file based on context
   */
  static async compressFile(
    file: File,
    context: FileUploadContext,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    try {
      switch (context) {
        case 'project-image':
          return await compressProjectImage(file, onProgress);
        case 'progress-note':
          return await compressProgressImage(file, onProgress);
        case 'avatar':
          // Use project image compression for avatars (similar quality requirements)
          return await compressProjectImage(file, onProgress);
        default:
          logger.warn(`No compression handler for context: ${context}, returning original file`);
          return file;
      }
    } catch (error) {
      logger.error(`Compression failed for context ${context}:`, error);

      // If compression fails but file is acceptable size, return original
      const targetSizeMB = context === 'avatar' ? 2 : 5; // Conservative targets

      if (file.size <= targetSizeMB * 1024 * 1024) {
        logger.info('Using original file as fallback (acceptable size)');
        return file;
      }

      throw error;
    }
  }

  /**
   * Upload file to PocketBase with validation and compression
   */
  static async uploadFile(file: File, options: FileUploadOptions): Promise<FileUploadResult> {
    const {
      context,
      collection,
      recordId,
      fieldName = 'image',
      compress = true,
      onProgress,
    } = options;

    try {
      // Validate file
      const validation = this.validateFile(file, context);
      if (!validation.isValid) {
        throw new Error(validation.error || 'File validation failed');
      }

      // Log warnings if any
      if (validation.warnings) {
        validation.warnings.forEach(warning => logger.warn(warning));
      }

      let processedFile = file;
      let compressionRatio: number | undefined;

      // Compress file if requested
      if (compress) {
        onProgress?.(10);
        const originalSize = file.size;

        processedFile = await this.compressFile(file, context, progress => {
          // Map compression progress to 10-80% range
          onProgress?.(10 + progress * 0.7);
        });

        if (processedFile.size !== originalSize) {
          compressionRatio = Math.round(((originalSize - processedFile.size) / originalSize) * 100);
          logger.info(
            `File compressed: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(processedFile.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reduction)`
          );
        }
      }

      onProgress?.(85);

      // Ensure file has proper extension
      if (!processedFile.name.includes('.')) {
        const extension = this.getExtensionFromMimeType(processedFile.type);
        processedFile = new File([processedFile], `${processedFile.name}.${extension}`, {
          type: processedFile.type,
          lastModified: processedFile.lastModified,
        });
      }

      // Upload to PocketBase
      const url = await this.uploadToPocketBase(processedFile, collection, recordId, fieldName);

      onProgress?.(100);

      return {
        url,
        filename: processedFile.name,
        originalSize: file.size,
        compressedSize: compress ? processedFile.size : undefined,
        compressionRatio,
      };
    } catch (error) {
      logger.error('File upload failed:', error);
      throw ErrorHandler.handleError(error, `File upload (${context})`);
    }
  }

  /**
   * Upload file directly to PocketBase (internal method)
   */
  private static async uploadToPocketBase(
    file: File,
    collection: FileCollection,
    recordId: string,
    fieldName: string
  ): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Upload attempt ${attempt}/${maxRetries}`, {
          collection,
          recordId,
          fieldName,
          fileName: file.name,
          fileSize: file.size,
        });

        // Create FormData
        const formData = new FormData();
        formData.append(fieldName, file);

        // Update record with file
        const record = await pb.collection(collection).update(recordId, formData);

        // Get filename from response
        const filename = record[fieldName];
        if (!filename) {
          throw new Error(`Upload succeeded but no filename returned in field '${fieldName}'`);
        }

        // Generate file URL
        const url = pb.files.getURL(record, filename);
        if (!url) {
          throw new Error('Failed to generate file URL');
        }

        logger.info('File upload successful', {
          collection,
          recordId,
          fieldName,
          filename,
          url,
          attempt,
        });

        return url;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`Upload attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * attempt, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Upload failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Get file URL from PocketBase record
   */
  static getFileUrl(
    record: { id: string; [key: string]: unknown },
    fieldName: string = 'image',
    thumb?: string
  ): string {
    if (!record || !record[fieldName]) {
      return '';
    }

    try {
      const options = thumb ? { thumb } : undefined;
      return pb.files.getURL(record, record[fieldName] as string, options);
    } catch (error) {
      logger.error('Failed to generate file URL:', error);
      return '';
    }
  }

  /**
   * Delete file from PocketBase record
   */
  static async deleteFile(
    collection: FileCollection,
    recordId: string,
    fieldName: string = 'image'
  ): Promise<boolean> {
    try {
      // Clear the field by setting it to empty string
      const formData = new FormData();
      formData.append(fieldName, '');

      await pb.collection(collection).update(recordId, formData);

      logger.info('File deleted successfully', { collection, recordId, fieldName });
      return true;
    } catch (error) {
      logger.error('File deletion failed:', error);
      return false;
    }
  }

  /**
   * Get file extension from MIME type
   */
  private static getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/heic': 'heic',
      'image/heif': 'heif',
    };

    return mimeToExt[mimeType] || 'jpg';
  }

  /**
   * Check if file needs compression based on context and size
   */
  static shouldCompressFile(file: File, context: FileUploadContext): boolean {
    const targetSizes = {
      'project-image': 5 * 1024 * 1024, // 5MB
      'progress-note': 8 * 1024 * 1024, // 8MB
      avatar: 2 * 1024 * 1024, // 2MB
    };

    return file.size > targetSizes[context];
  }

  /**
   * Get context-specific validation using existing utilities
   */
  static validateFileWithContext(file: File, context: FileUploadContext): ValidationResult {
    switch (context) {
      case 'project-image':
        return validateProjectImageFile(file);
      case 'progress-note':
        return validateProgressImageFile(file);
      case 'avatar':
        // Use project image validation for avatars (similar requirements)
        return validateProjectImageFile(file);
      default:
        return this.validateFile(file, context);
    }
  }
}
