import imageCompression from 'browser-image-compression';
import { logger } from './logger';

/**
 * Compression statistics for user feedback
 */
export interface CompressionStats {
  originalSizeMB: number;
  compressedSizeMB: number;
  compressionRatio: number;
  originalDimensions: { width: number; height: number };
  compressedDimensions: { width: number; height: number };
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Optimized compression settings for project images
 * Prioritize maximum quality while ensuring reliable uploads (target ~5MB to stay under Supabase limits)
 */
const PROJECT_IMAGE_OPTIONS = {
  maxSizeMB: 5.0, // Target 5MB (safely under Supabase limits)
  maxWidthOrHeight: 2048, // High resolution for project detail
  useWebWorker: true, // Non-blocking compression
  fileType: 'image/jpeg' as const, // Default output format (JPEG), can be overridden for PNGs
  initialQuality: 0.98, // Maximum quality for project images (primarily for JPEG/WEBP)
  alwaysKeepResolution: false, // Allow smart resizing if needed
  preserveExif: false, // Remove EXIF for privacy and size
};

/**
 * File size limits for project images
 */
const FILE_SIZE_LIMITS = {
  MAX_UPLOAD_SIZE: 50 * 1024 * 1024, // 50MB pre-compression
  TARGET_SIZE: 5 * 1024 * 1024, // 5MB post-compression target
  WARNING_SIZE: 25 * 1024 * 1024, // 25MB warning threshold
};

/**
 * Supported file types for project images
 */
const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/**
 * Get image dimensions from a file
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for dimension measurement'));
    };

    img.src = url;
  });
}

/**
 * Calculate compression statistics
 */
export async function getCompressionPreview(
  originalFile: File,
  compressedFile: File
): Promise<CompressionStats> {
  const originalSizeMB = Math.round((originalFile.size / (1024 * 1024)) * 100) / 100;
  const compressedSizeMB = Math.round((compressedFile.size / (1024 * 1024)) * 100) / 100;
  const compressionRatio = Math.round(
    ((originalFile.size - compressedFile.size) / originalFile.size) * 100
  );

  try {
    const [originalDimensions, compressedDimensions] = await Promise.all([
      getImageDimensions(originalFile),
      getImageDimensions(compressedFile),
    ]);

    return {
      originalSizeMB,
      compressedSizeMB,
      compressionRatio,
      originalDimensions,
      compressedDimensions,
    };
  } catch (error) {
    logger.warn('Could not get image dimensions for compression stats:', error);
    return {
      originalSizeMB,
      compressedSizeMB,
      compressionRatio,
      originalDimensions: { width: 0, height: 0 },
      compressedDimensions: { width: 0, height: 0 },
    };
  }
}

/**
 * Validate a project image file before compression
 */
export function validateProjectImageFile(file: File): ValidationResult {
  const warnings: string[] = [];

  // Check file size
  if (file.size > FILE_SIZE_LIMITS.MAX_UPLOAD_SIZE) {
    const sizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
    return {
      isValid: false,
      error: `File size (${sizeMB}MB) exceeds the 50MB limit. Please use a smaller image.`,
    };
  }

  // Check file type
  const isValidType =
    SUPPORTED_TYPES.includes(file.type) ||
    file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|heif)$/);

  if (!isValidType) {
    return {
      isValid: false,
      error: 'Unsupported file type. Please use JPG, PNG, WebP, or HEIC formats.',
    };
  }

  // Add warnings for large files
  if (file.size > FILE_SIZE_LIMITS.WARNING_SIZE) {
    const sizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
    warnings.push(`Large file (${sizeMB}MB) will take longer to process.`);
  }

  // Check for potentially problematic file names
  if (file.name.includes('#') || file.name.includes('?') || file.name.includes('%')) {
    warnings.push('File name contains special characters that may cause upload issues.');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Get adaptive compression options based on file size and type
 * Project images prioritize quality over aggressive compression
 */
function getAdaptiveCompressionOptions(originalFile: File): {
  maxSizeMB: number;
  initialQuality: number;
  fileType: 'image/jpeg' | 'image/png';
} {
  const fileSizeMB = originalFile.size / (1024 * 1024);
  // Determine output file type: preserve PNG, otherwise default to JPEG from PROJECT_IMAGE_OPTIONS
  const outputFileType =
    originalFile.type === 'image/png' ? 'image/png' : PROJECT_IMAGE_OPTIONS.fileType;

  let maxSizeMB = PROJECT_IMAGE_OPTIONS.maxSizeMB;
  let initialQuality = PROJECT_IMAGE_OPTIONS.initialQuality;

  if (fileSizeMB > 30) {
    // Very large files (30MB+): More compression needed but maintain high quality
    maxSizeMB = 4.5;
    initialQuality = 0.96;
  } else if (fileSizeMB > 15) {
    // Large files (15-30MB): Moderate compression
    maxSizeMB = 4.8;
    initialQuality = 0.97;
  } else if (fileSizeMB > 8) {
    // Medium files (8-15MB): Light compression
    maxSizeMB = 5.0;
    initialQuality = 0.98;
  } else {
    // Smaller files: Minimal compression to preserve maximum quality
    maxSizeMB = Math.min(PROJECT_IMAGE_OPTIONS.maxSizeMB, fileSizeMB * 0.9);
    initialQuality = 0.99;
  }

  return {
    maxSizeMB,
    initialQuality,
    fileType: outputFileType,
  };
}

/**
 * Compress a project image with optional progress callback
 */
export async function compressProjectImage(
  file: File,
  onProgress?: ProgressCallback
): Promise<File> {
  // Validate file first
  const validation = validateProjectImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid file for compression');
  }

  try {
    const originalSizeMB = file.size / (1024 * 1024);
    logger.log(`[projectImageCompression] Starting compression for: ${file.name}`);
    logger.log(
      `[projectImageCompression] Original type: ${file.type}, Original size: ${originalSizeMB.toFixed(2)}MB`
    );

    // Report initial progress
    if (onProgress) {
      onProgress(5);
    }

    // Get adaptive compression options based on file size and type
    const adaptiveOptions = getAdaptiveCompressionOptions(file);
    logger.log(
      `[projectImageCompression] Using adaptive compression - target type: ${adaptiveOptions.fileType}, target size: ${adaptiveOptions.maxSizeMB}MB, quality: ${adaptiveOptions.initialQuality}`
    );

    // Prepare compression options with progress callback
    // Spread base options, then adaptive options to override specific fields like fileType, maxSizeMB, initialQuality
    const options = {
      ...PROJECT_IMAGE_OPTIONS,
      ...adaptiveOptions,
      onProgress: (progress: number) => {
        // Map compression progress to 5-95% range (reserve 5% for setup, 5% for finalization)
        const mappedProgress = 5 + progress * 0.9;
        if (onProgress) {
          onProgress(Math.round(mappedProgress));
        }
      },
    };

    // Perform compression
    const compressedFile = await imageCompression(file, options);

    // Report completion
    if (onProgress) {
      onProgress(100);
    }

    logger.log(
      `[projectImageCompression] Compression completed. Output type: ${compressedFile.type}`
    );
    logger.log(
      `[projectImageCompression] Compressed size: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`
    );
    logger.log(
      `[projectImageCompression] Reduction: ${Math.round(((file.size - compressedFile.size) / file.size) * 100)}%`
    );

    // Ensure compressed file has proper name
    const finalFile = new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });

    return finalFile;
  } catch (error) {
    logger.error('[projectImageCompression] Compression failed:', error);

    // If compression fails but original file is acceptable size, return original
    if (file.size <= FILE_SIZE_LIMITS.TARGET_SIZE) {
      logger.log('[projectImageCompression] Using original file as fallback (acceptable size)');
      if (onProgress) {
        onProgress(100);
      }
      return file;
    }

    // Otherwise, throw error with helpful message
    const errorMessage = error instanceof Error ? error.message : 'Unknown compression error';
    throw new Error(`Image compression failed: ${errorMessage}. Please try a smaller image.`);
  }
}

/**
 * Check if a file needs compression
 */
export function shouldCompressImage(file: File): boolean {
  // Always compress files larger than target size
  if (file.size > FILE_SIZE_LIMITS.TARGET_SIZE) {
    return true;
  }

  // Don't compress small files to avoid quality loss
  return false;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get user-friendly compression summary
 */
export function getCompressionSummary(stats: CompressionStats): string {
  if (stats.compressionRatio > 0) {
    return `Reduced from ${stats.originalSizeMB}MB to ${stats.compressedSizeMB}MB (${stats.compressionRatio}% smaller)`;
  } else {
    return `Size optimized: ${stats.compressedSizeMB}MB`;
  }
}
