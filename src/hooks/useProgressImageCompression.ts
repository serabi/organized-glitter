import { useState } from 'react';
import { compressProgressImage } from '@/utils/progressImageCompression';
import { useToast } from '@/hooks/use-toast';
import { useProgressNoteFormTracking } from './useProgressNoteFormTracking';

/**
 * @interface CompressionProgress
 * @description Interface for tracking the progress of image compression.
 */
interface CompressionProgress {
  percentage: number;
  status: string;
  currentStep: string;
}

/**
 * Custom hook for handling image compression with progress tracking and user feedback.
 * It uses `compressProgressImage` utility for the actual compression,
 * `useToast` for notifications, and `useProgressNoteFormTracking` for logging.
 * @returns {Object} An object containing the `compressImage` function, compression state, and a reset function.
 */
export const useProgressImageCompression = () => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null);
  const { toast } = useToast();
  const { trackImageCompression, trackCompressionFailure } = useProgressNoteFormTracking();

  /**
   * Compresses an image file if it exceeds a certain threshold.
   * Provides progress updates and user notifications.
   * @param {File} file - The image file to compress.
   * @returns {Promise<File>} A promise that resolves to the compressed file, or the original file if compression is skipped or fails.
   * @throws {Error} If the file exceeds the maximum allowed size (50MB).
   */
  const compressImage = async (file: File): Promise<File> => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const compressionThreshold = 3 * 1024 * 1024; // 3MB

    // Check file size limit
    if (file.size > maxSize) {
      const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
      toast({
        title: 'File Too Large',
        description: `Image is ${fileSizeMB}MB, which exceeds the 50MB limit for progress note images. Please use a smaller image.`,
        variant: 'destructive',
      });
      throw new Error(`File too large: ${fileSizeMB}MB exceeds 50MB limit`);
    }

    // Return original file if it's small enough
    if (file.size <= compressionThreshold) {
      return file;
    }

    // Compress the image
    try {
      setIsCompressing(true);

      const compressedFile = await compressProgressImage(file, (progress: number) => {
        setCompressionProgress({
          percentage: progress,
          status: progress < 100 ? 'Compressing...' : 'Complete',
          currentStep:
            progress < 50
              ? 'Analyzing image...'
              : progress < 90
                ? 'Compressing...'
                : 'Finalizing...',
        });
      });

      // Track compression success
      trackImageCompression({
        originalSize: file.size,
        compressedSize: compressedFile.size,
        compressionRatio: Math.round((1 - compressedFile.size / file.size) * 100),
        originalSizeMB: Math.round((file.size / (1024 * 1024)) * 100) / 100,
        compressedSizeMB: Math.round((compressedFile.size / (1024 * 1024)) * 100) / 100,
      });

      // Show simplified upload success toast
      toast({
        title: 'Image Uploaded',
        description: 'Image is successfully uploaded!',
      });

      return compressedFile;
    } catch (error) {
      console.error('Compression failed:', error);

      trackCompressionFailure(error, file.size);

      toast({
        title: 'Compression Failed',
        description: 'Unable to compress image. Using original file.',
        variant: 'destructive',
      });

      // Fall back to original file if compression fails
      return file;
    } finally {
      setIsCompressing(false);
      setCompressionProgress(null);
    }
  };

  /**
   * Resets the compression state (isCompressing and compressionProgress).
   */
  const resetCompressionState = () => {
    setIsCompressing(false);
    setCompressionProgress(null);
  };

  return {
    compressImage,
    isCompressing,
    compressionProgress,
    resetCompressionState,
  };
};
