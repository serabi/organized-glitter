import imageCompression from 'browser-image-compression';
import { logger } from '@/utils/logger';

// Type definitions for better type safety
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom?: number;
}

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType?: string;
  initialQuality?: number;
}

// Constants for better maintainability
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const DEFAULT_TARGET_SIZE = 200;
export const DEFAULT_QUALITY = 0.9;

/**
 * Compress an image file for avatar upload
 */
export async function compressAvatarImage(
  file: File,
  customOptions?: Partial<CompressionOptions>
): Promise<File> {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error ?? 'Invalid image file');
  }

  const options: CompressionOptions = {
    maxSizeMB: 1, // 1MB max file size
    maxWidthOrHeight: 400, // Max dimension
    useWebWorker: true,
    fileType: 'image/jpeg', // Convert to JPEG for consistency
    initialQuality: 0.8,
    ...customOptions,
  };

  try {
    const compressedFile = await imageCompression(file, options);

    // Ensure the compressed file has a proper name
    const originalName = file.name.replace(/\.[^/.]+$/, '') || 'compressed-image';
    const extension = options.fileType === 'image/jpeg' ? 'jpg' : 'png';

    return new File([compressedFile], `${originalName}.${extension}`, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    logger.error('Error compressing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown compression error';
    throw new Error(`Failed to compress image: ${errorMessage}`);
  }
}

/**
 * Validate image file type and size
 */
export function validateImageFile(file: File): ValidationResult {
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided.',
    };
  }

  // Check file type
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    return {
      isValid: false,
      error: 'Please upload a JPEG, PNG, WebP, or HEIC image file.',
    };
  }

  // Check file size (50MB max before compression - let compression handle optimization)
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `Image file must be smaller than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    };
  }

  // Check for minimum file size (prevent corrupted files)
  if (file.size < 100) {
    return {
      isValid: false,
      error: 'Image file appears to be corrupted or too small.',
    };
  }

  return { isValid: true };
}

/**
 * Create a canvas from an image file for cropping
 */
export function createImageCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      reject(new Error(validation.error ?? 'Invalid image file'));
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let objectUrl: string | null = null;

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        cleanup();
        resolve(canvas);
      } catch {
        cleanup();
        reject(new Error('Failed to draw image on canvas'));
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image'));
    };

    try {
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    } catch {
      reject(new Error('Failed to create object URL from file'));
    }
  });
}

// Helper function to convert data URL to File object
export function dataURLtoFile(dataurl: string, filename: string): File {
  if (!dataurl || typeof dataurl !== 'string') {
    throw new Error('Invalid data URL: dataurl must be a non-empty string');
  }

  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename: filename must be a non-empty string');
  }

  const arr = dataurl.split(',');
  if (arr.length < 2) {
    throw new Error('Invalid data URL: missing comma separator');
  }

  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch || mimeMatch.length < 2) {
    throw new Error('Invalid data URL: could not extract MIME type');
  }

  const mime = mimeMatch[1];

  // Validate that it's a supported image type
  if (!SUPPORTED_IMAGE_TYPES.includes(mime as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    throw new Error(`Unsupported MIME type: ${mime}`);
  }

  try {
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }

    return new File([u8arr], filename, {
      type: mime,
      lastModified: Date.now(),
    });
  } catch {
    throw new Error('Failed to decode base64 data');
  }
}

/**
 * Convert canvas to blob for upload
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number = DEFAULT_QUALITY,
  type: string = 'image/jpeg'
): Promise<Blob> {
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    return Promise.reject(new Error('Invalid canvas element'));
  }

  if (quality < 0 || quality > 1) {
    return Promise.reject(new Error('Quality must be between 0 and 1'));
  }

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        type,
        quality
      );
    } catch {
      reject(new Error('Canvas toBlob operation failed'));
    }
  });
}

/**
 * Create a cropped image from crop data
 */
export function createCroppedImage(
  imageSrc: string,
  cropData: CropData,
  targetSize: number = DEFAULT_TARGET_SIZE,
  quality: number = DEFAULT_QUALITY
): Promise<string> {
  if (!imageSrc || typeof imageSrc !== 'string') {
    return Promise.reject(new Error('Invalid image source'));
  }

  if (!cropData || typeof cropData !== 'object') {
    return Promise.reject(new Error('Invalid crop data'));
  }

  if (targetSize <= 0 || targetSize > 2000) {
    return Promise.reject(new Error('Target size must be between 1 and 2000 pixels'));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      try {
        // Set canvas to target size
        canvas.width = targetSize;
        canvas.height = targetSize;

        // Calculate zoom factor
        const zoom = cropData.zoom ?? 1;

        // Validate crop data
        if (cropData.x < 0 || cropData.y < 0 || cropData.width <= 0 || cropData.height <= 0) {
          reject(new Error('Invalid crop dimensions'));
          return;
        }

        // Calculate source dimensions
        const sourceX = cropData.x;
        const sourceY = cropData.y;
        const sourceWidth = cropData.width;
        const sourceHeight = cropData.height;

        // Draw the cropped image
        ctx.drawImage(
          img,
          sourceX * zoom,
          sourceY * zoom,
          sourceWidth * zoom,
          sourceHeight * zoom,
          0,
          0,
          targetSize,
          targetSize
        );

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch {
        reject(new Error('Failed to process image crop'));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for cropping'));
    };

    // Set cross-origin for external URLs
    if (imageSrc.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }

    img.src = imageSrc;
  });
}

/**
 * Generate a preview URL for a file
 */
export function createFilePreviewUrl(file: File): string {
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid file: must be a File object');
  }

  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error ?? 'Invalid image file');
  }

  try {
    return URL.createObjectURL(file);
  } catch {
    throw new Error('Failed to create preview URL');
  }
}

/**
 * Clean up preview URL
 */
export function revokePreviewUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    return;
  }

  if (url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.warn('Failed to revoke object URL:', error);
    }
  }
}

/**
 * Check if an image URL is a placeholder image
 */
export function isPlaceholderImage(url: string): boolean {
  if (!url) return true;

  // Check for common placeholder patterns
  const placeholderPatterns = [
    /placeholder/i,
    /via\.placeholder/i,
    /picsum\.photos/i,
    /unsplash\.it/i,
    /lorempixel/i,
    /dummyimage/i,
    /placehold/i,
    /example\.com/i,
    /data:image\/svg\+xml.*placeholder/i,
  ];

  return placeholderPatterns.some(pattern => pattern.test(url));
}

/**
 * Handle image load errors by attempting to refresh the URL
 */
export async function handleImageLoadError(
  authenticatedUrl: string | undefined,
  refreshUrl: (force?: boolean) => Promise<void>
): Promise<string | null> {
  if (!authenticatedUrl || typeof authenticatedUrl !== 'string') {
    return null;
  }

  if (typeof refreshUrl !== 'function') {
    logger.error('refreshUrl must be a function');
    return null;
  }

  try {
    // Attempt to refresh the URL
    await refreshUrl(true);

    // Return the current authenticated URL (this is a simplified implementation)
    // The actual URL refresh happens in the useImage hook
    return authenticatedUrl;
  } catch (error) {
    logger.error('Failed to refresh image URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Image URL refresh failed: ${errorMessage}`);
  }
}
