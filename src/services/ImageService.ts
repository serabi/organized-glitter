import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ImageService');

// Standardized image size configurations for consistent UI
export const IMAGE_SIZES = {
  thumbnail: '150x150',      // Gallery grids, small previews
  card: '300x200f',          // Project cards, preserves aspect ratio
  preview: '600x400f',       // Modal previews, detail views
  large: '800x600f',         // High-quality viewing
} as const;

export type ImageSizeKey = keyof typeof IMAGE_SIZES;

// Interface for image options with PocketBase compatibility
export interface ImageOptions {
  thumb?: string;
  token?: string;
  download?: boolean;
}

// Interface for optimized image response
export interface OptimizedImageResult {
  url: string;
  size: string;
  isOptimized: boolean;
}

/**
 * ImageService provides optimized image URL generation using PocketBase's 
 * native thumbnail capabilities. Reduces bandwidth usage by 60-95% while
 * maintaining visual quality at appropriate display sizes.
 */
export class ImageService {
  /**
   * Get optimized image URL for a given record and size
   * @param record - PocketBase record containing the image
   * @param filename - Name of the image file
   * @param size - Predefined size key or custom thumb string
   * @param options - Additional PocketBase options
   * @returns Optimized image URL
   */
  static getOptimizedUrl(
    record: Record<string, unknown> & { id: string },
    filename: string,
    size: ImageSizeKey | string = 'card',
    options: Omit<ImageOptions, 'thumb'> = {}
  ): string {
    if (!record || !filename) {
      logger.warn('Missing record or filename for image optimization', { record: !!record, filename });
      return '';
    }

    try {
      // Get thumb parameter from size key or use custom string
      const thumbParam = typeof size === 'string' && size in IMAGE_SIZES 
        ? IMAGE_SIZES[size as ImageSizeKey]
        : size;

      const imageOptions: ImageOptions = {
        ...options,
        thumb: thumbParam,
      };

      const url = pb.files.getURL(record, filename, imageOptions);
      
      if (import.meta.env.DEV) {
        logger.debug('Generated optimized image URL', {
          recordId: record.id,
          filename,
          size: thumbParam,
          originalSize: 'unknown',
          estimatedSavings: this.estimateBandwidthSavings(thumbParam),
        });
      }

      return url;
    } catch (error) {
      logger.error('Failed to generate optimized image URL', { error, record: record?.id, filename, size });
      // Fallback to original image if optimization fails
      return this.getFallbackUrl(record, filename, options);
    }
  }

  /**
   * Get full resolution image URL (no thumbnail optimization)
   * @param record - PocketBase record containing the image
   * @param filename - Name of the image file
   * @param options - Additional PocketBase options
   * @returns Full resolution image URL
   */
  static getFullResolutionUrl(
    record: Record<string, unknown> & { id: string },
    filename: string,
    options: Omit<ImageOptions, 'thumb'> = {}
  ): string {
    if (!record || !filename) return '';

    try {
      return pb.files.getURL(record, filename, options);
    } catch (error) {
      logger.error('Failed to generate full resolution image URL', { error, record: record?.id, filename });
      return '';
    }
  }

  /**
   * Get multiple image URLs for responsive loading strategy
   * @param record - PocketBase record containing the image
   * @param filename - Name of the image file
   * @param sizes - Array of size keys to generate
   * @returns Array of optimized image results
   */
  static getResponsiveUrls(
    record: Record<string, unknown> & { id: string },
    filename: string,
    sizes: ImageSizeKey[] = ['thumbnail', 'card', 'preview']
  ): OptimizedImageResult[] {
    if (!record || !filename) return [];

    return sizes.map(size => ({
      url: this.getOptimizedUrl(record, filename, size),
      size: IMAGE_SIZES[size],
      isOptimized: true,
    }));
  }

  /**
   * Smart image URL selection based on display context
   * @param record - PocketBase record containing the image
   * @param filename - Name of the image file
   * @param context - Display context for size selection
   * @returns Optimized image URL for context
   */
  static getContextualUrl(
    record: Record<string, unknown> & { id: string },
    filename: string,
    context: 'gallery' | 'card' | 'modal' | 'detail' | 'avatar' = 'card'
  ): string {
    const contextSizeMap: Record<string, ImageSizeKey> = {
      gallery: 'thumbnail',
      card: 'card', 
      modal: 'preview',
      detail: 'large',
      avatar: 'thumbnail',
    };

    const size = contextSizeMap[context] || 'card';
    return this.getOptimizedUrl(record, filename, size);
  }

  /**
   * Generate progressive loading URLs (thumbnail -> high quality)
   * @param record - PocketBase record containing the image
   * @param filename - Name of the image file
   * @returns Object with placeholder and full quality URLs
   */
  static getProgressiveUrls(record: Record<string, unknown> & { id: string }, filename: string) {
    return {
      placeholder: this.getOptimizedUrl(record, filename, 'thumbnail'),
      fullQuality: this.getOptimizedUrl(record, filename, 'large'),
      original: this.getFullResolutionUrl(record, filename),
    };
  }

  /**
   * Fallback URL generation when optimization fails
   * @param record - PocketBase record containing the image
   * @param filename - Name of the image file
   * @param options - Additional PocketBase options
   * @returns Fallback image URL
   */
  private static getFallbackUrl(
    record: Record<string, unknown> & { id: string },
    filename: string,
    options: Omit<ImageOptions, 'thumb'> = {}
  ): string {
    try {
      // Try to get original image as fallback
      return pb.files.getURL(record, filename, options);
    } catch (error) {
      logger.error('Failed to generate fallback image URL', { error, record: record?.id, filename });
      return '';
    }
  }

  /**
   * Estimate bandwidth savings from thumbnail optimization
   * @param thumbParam - Thumbnail parameter used
   * @returns Estimated percentage savings
   */
  private static estimateBandwidthSavings(thumbParam: string): string {
    // Rough estimates based on typical image compression ratios
    const savingsMap: Record<string, string> = {
      '150x150': '95%',     // Tiny thumbnails
      '300x200f': '85%',    // Card images  
      '600x400f': '70%',    // Preview images
      '800x600f': '60%',    // Large previews
    };

    return savingsMap[thumbParam] || '50%';
  }

  /**
   * Validate if a record contains a valid image field
   * @param record - PocketBase record to check
   * @param fieldName - Name of the image field
   * @returns True if record has valid image
   */
  static hasValidImage(record: Record<string, unknown>, fieldName: string = 'image'): boolean {
    return !!(record && record[fieldName] && typeof record[fieldName] === 'string');
  }

  /**
   * Get optimized URL with backward compatibility for existing code
   * @param record - PocketBase record containing the image
   * @param filename - Name of the image file
   * @param thumb - Optional thumbnail parameter (legacy support)
   * @returns Optimized or original image URL
   */
  static getUrl(record: Record<string, unknown> & { id: string }, filename: string, thumb?: string): string {
    if (!record || !filename) return '';

    if (thumb) {
      // Use provided thumb parameter
      return this.getOptimizedUrl(record, filename, thumb);
    }

    // Default to card size for backward compatibility
    return this.getOptimizedUrl(record, filename, 'card');
  }
}