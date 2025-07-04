/**
 * Development utility for handling image uploads in development environments
 * For development environments, this provides alternative ways to handle images
 * when full Supabase integration isn't needed
 */

import { env } from '@/utils/env';
import { logger } from './logger';

/**
 * Determines if we're running in development mode
 */
export const isDevelopment = env.MODE === 'development';

/**
 * This helper provides development-specific image handling:
 * - In development: Can use local placeholders
 * - For demo purposes: Creates reproducible image placeholders
 *
 * @param file The file to upload
 * @param bucket The bucket type ('avatars' or 'project-images')
 * @returns The URL of the placeholder image
 */
export async function getDevPlaceholder(file: File, bucket: string): Promise<string> {
  logger.log(`Creating development placeholder for ${file.name}`);

  try {
    // Generate a unique identifier
    const timestamp = new Date().getTime();
    const fileName = file.name.replace(/\s+/g, '-').toLowerCase();
    const shortName = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;

    // For avatar placeholders, use a specialized service
    if (bucket === 'avatars') {
      const seed = fileName + timestamp;
      const hash = await hashString(seed);
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${hash.substring(0, 10)}`;
    }

    // For project images, create a placeholder with dimensions if possible
    if (file.type.startsWith('image/')) {
      try {
        // Read image dimensions
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

        return `https://placehold.co/${width}x${height}/png?text=${encodeURIComponent(shortName)}-${timestamp}`;
      } catch (dimError) {
        logger.warn('Could not get image dimensions:', dimError);
        return `https://placehold.co/400x400/png?text=${encodeURIComponent(shortName)}-${timestamp}`;
      }
    } else {
      // Default placeholder for non-image files
      return `https://placehold.co/400x400/png?text=${encodeURIComponent(shortName)}-${timestamp}`;
    }
  } catch (placeholderError) {
    logger.error('Error generating placeholder:', placeholderError);
    // Absolute fallback - simple object URL that will work during the session
    return URL.createObjectURL(file);
  }
}

/**
 * Simple hash function for creating reproducible seeds
 */
async function hashString(str: string): Promise<string> {
  // Use browser crypto for hashing if available
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hash = await window.crypto.subtle.digest('SHA-256', data);

      // Convert hash to hex string
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      // Fall back to simpler method if crypto fails
      logger.warn('Crypto API failed, using simple hash instead:', e);
    }
  }

  // Simple hash function fallback
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
