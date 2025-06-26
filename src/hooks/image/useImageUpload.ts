import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { uploadImage } from '@/utils/imageUpload';
import { compressProgressImage } from '@/utils/progressImageCompression';
import { compressProjectImage } from '@/utils/projectImageCompression';
import { useProgressNoteFormTracking } from '@/hooks/useProgressNoteFormTracking';
import { createLogger } from '@/utils/secureLogger';
import {
  PROJECT_IMAGE_CONSTANTS,
  PROGRESS_NOTE_CONSTANTS,
  AVATAR_CONSTANTS,
  AVATAR_RESIZE_CONSTANTS,
} from '@/components/projects/ProgressNoteForm/constants';

const logger = createLogger('useImageUpload');

// Upload state interface
export interface ImageUploadState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  error: string | null;
  processedFile: File | null;
  isReplacement: boolean;
  wasRemoved: boolean;
  isCompressing: boolean;
  compressionProgress: { percentage: number; status: string; currentStep: string } | null;
}

// Compression progress interface
interface CompressionProgress {
  percentage: number;
  status: string;
  currentStep: string;
}

// Upload context types
type UploadContext = 'project-image' | 'progress-note' | 'avatar';
type FolderType = 'project-images' | 'avatars';

// Helper function to resize images for avatars
const resizeImage = async (
  file: File,
  resizeConstants: typeof AVATAR_RESIZE_CONSTANTS
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;

    img.onload = () => {
      const MAX_WIDTH = resizeConstants.MAX_WIDTH;
      const MAX_HEIGHT = resizeConstants.MAX_HEIGHT;

      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = Math.round(height * (MAX_WIDTH / width));
        width = MAX_WIDTH;
      }

      if (height > MAX_HEIGHT) {
        width = Math.round(width * (MAX_HEIGHT / height));
        height = MAX_HEIGHT;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'));
            return;
          }

          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          resolve(resizedFile);
        },
        file.type,
        resizeConstants.QUALITY
      );
    };

    img.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error('Failed to load image'));
    };

    try {
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    } catch (urlError) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error('Failed to create image preview'));
    }
  });
};

// Helper function to get max file size based on context
const getMaxFileSize = (context: UploadContext): number => {
  if (context === 'avatar') return AVATAR_CONSTANTS.MAX_FILE_SIZE;
  if (context === 'project-image') return PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE;
  return PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE;
};

// Helper function to get original file size limit for validation
const getOriginalMaxFileSize = (context: UploadContext): number => {
  if (context === 'avatar') return AVATAR_CONSTANTS.MAX_ORIGINAL_FILE_SIZE;
  if (context === 'project-image') return PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE;
  return PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE;
};

/**
 * Consolidated image upload hook that combines functionality from:
 * - useImageUpload: File upload with validation and processing
 * - useProgressImageCompression: Progress note compression
 * - useProjectImageCompression: Project image compression
 * 
 * This hook fixes security issues by using secure logging instead of console.* statements
 */
export const useImageUpload = (
  folder: FolderType,
  uploadContext: UploadContext = 'project-image'
) => {
  const [state, setState] = useState<ImageUploadState>({
    file: null,
    preview: null,
    uploading: false,
    error: null,
    processedFile: null,
    isReplacement: false,
    wasRemoved: false,
    isCompressing: false,
    compressionProgress: null,
  });

  const { toast } = useToast();
  const { trackImageCompression, trackCompressionFailure } = useProgressNoteFormTracking();

  // Compression function for progress notes
  const compressProgressNoteImage = useCallback(
    async (file: File): Promise<File> => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const compressionThreshold = 3 * 1024 * 1024; // 3MB

      if (file.size > maxSize) {
        const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
        const errorMsg = `File too large: ${fileSizeMB}MB exceeds 50MB limit`;
        logger.error('Progress note image too large', { size: fileSizeMB, limit: 50 });
        throw new Error(errorMsg);
      }

      if (file.size <= compressionThreshold) {
        return file;
      }

      try {
        setState(prev => ({ ...prev, isCompressing: true }));

        const compressedFile = await compressProgressImage(file, (progress: number) => {
          setState(prev => ({
            ...prev,
            compressionProgress: {
              percentage: progress,
              status: progress < 100 ? 'Compressing...' : 'Complete',
              currentStep:
                progress < 50
                  ? 'Analyzing image...'
                  : progress < 90
                    ? 'Compressing...'
                    : 'Finalizing...',
            },
          }));
        });

        trackImageCompression({
          originalSize: file.size,
          compressedSize: compressedFile.size,
          compressionRatio: Math.round((1 - compressedFile.size / file.size) * 100),
          originalSizeMB: Math.round((file.size / (1024 * 1024)) * 100) / 100,
          compressedSizeMB: Math.round((compressedFile.size / (1024 * 1024)) * 100) / 100,
        });

        logger.info('Progress note compression successful', {
          originalSize: file.size,
          compressedSize: compressedFile.size,
          ratio: Math.round((1 - compressedFile.size / file.size) * 100),
        });

        return compressedFile;
      } catch (error) {
        logger.error('Progress note compression failed', { error });
        trackCompressionFailure(error, file.size);
        throw error;
      } finally {
        setState(prev => ({
          ...prev,
          isCompressing: false,
          compressionProgress: null,
        }));
      }
    },
    [trackImageCompression, trackCompressionFailure]
  );

  // Compression function for project images
  const compressProjectImageFile = useCallback(
    async (file: File): Promise<File> => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const compressionThreshold = 5 * 1024 * 1024; // 5MB

      if (file.size > maxSize) {
        const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
        const errorMsg = `File too large: ${fileSizeMB}MB exceeds 50MB limit`;
        logger.error('Project image too large', { size: fileSizeMB, limit: 50 });
        throw new Error(errorMsg);
      }

      if (file.size <= compressionThreshold) {
        logger.debug('Project image under compression threshold', {
          size: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
          threshold: '5MB',
        });
        return file;
      }

      try {
        setState(prev => ({ ...prev, isCompressing: true }));

        const compressedFile = await compressProjectImage(file, (progress: number) => {
          setState(prev => ({
            ...prev,
            compressionProgress: {
              percentage: progress,
              status: progress < 100 ? 'Compressing...' : 'Complete',
              currentStep:
                progress < 50
                  ? 'Analyzing image...'
                  : progress < 90
                    ? 'Compressing...'
                    : 'Finalizing...',
            },
          }));
        });

        const originalSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
        const compressedSizeMB = Math.round((compressedFile.size / (1024 * 1024)) * 100) / 100;
        const compressionRatio = Math.round((1 - compressedFile.size / file.size) * 100);

        logger.info('Project image compression successful', {
          original: originalSizeMB + 'MB',
          compressed: compressedSizeMB + 'MB',
          ratio: compressionRatio + '%',
        });

        return compressedFile;
      } catch (error) {
        logger.error('Project image compression failed', { error });

        // Fall back to original file if compression fails and it's under 6MB
        if (file.size <= 6 * 1024 * 1024) {
          logger.info('Using original file as fallback (under 6MB)');
          return file;
        }

        throw new Error(
          `Image compression failed and file is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please use a smaller image.`
        );
      } finally {
        setState(prev => ({
          ...prev,
          isCompressing: false,
          compressionProgress: null,
        }));
      }
    },
    []
  );

  // Main image change handler
  const handleImageChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<File | null> => {
      logger.debug('Image change handler called', { 
        uploadContext, 
        folder,
        version: '2025-06-26-consolidated'
      });

      const input = event.target;
      const file = input.files?.[0];
      let returnFile: File | null = null;

      if (file) {
        logger.debug('File selected', { 
          name: file.name, 
          type: file.type, 
          size: file.size 
        });

        // Clear any previous errors
        setState(prev => ({ ...prev, error: null }));

        // Validate file type
        const validTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/heic',
          'image/heif',
        ];

        if (
          !validTypes.includes(file.type.toLowerCase()) &&
          !file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)
        ) {
          logger.warn('Invalid file type selected', { type: file.type, name: file.name });
          const errorMsg = `Invalid file type "${file.type || 'unknown'}". Please select a JPG, PNG, GIF, WebP, or HEIC image.`;
          setState(prev => ({
            ...prev,
            error: errorMsg,
            file: null,
            preview: null,
            processedFile: null,
          }));

          toast({
            title: 'Invalid File Type',
            description: errorMsg,
            variant: 'destructive',
          });

          setTimeout(() => {
            if (input) input.value = '';
          }, 100);

          return null;
        }

        // Check file size
        const currentMaxFileSize = getOriginalMaxFileSize(uploadContext);
        const maxSizeMB = Math.round(currentMaxFileSize / (1024 * 1024));

        logger.debug('File size validation', {
          uploadContext,
          fileSize: file.size,
          maxAllowed: currentMaxFileSize,
          maxSizeMB,
        });

        if (file.size > currentMaxFileSize) {
          const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
          logger.warn('File too large', { 
            size: fileSizeMB,
            limit: maxSizeMB,
            context: uploadContext 
          });

          const imageType =
            uploadContext === 'avatar'
              ? 'avatar'
              : uploadContext === 'progress-note'
                ? 'progress note'
                : 'project';

          const errorMsg = `File size is ${fileSizeMB}MB, which exceeds the ${maxSizeMB}MB upload limit for ${imageType} images.`;
          setState(prev => ({
            ...prev,
            error: errorMsg,
            file: null,
            preview: null,
            processedFile: null,
          }));

          toast({
            title: 'File Too Large',
            description: errorMsg,
            variant: 'destructive',
          });

          setTimeout(() => {
            if (input) input.value = '';
          }, 100);

          return null;
        }

        // Create sanitized filename
        const sanitizedName = file.name
          .replace(/[#?%&=]/g, '_')
          .replace(/\s+/g, '-');

        let processedFile = file;
        if (sanitizedName !== file.name) {
          processedFile = new File([file], sanitizedName, {
            type: file.type,
            lastModified: file.lastModified,
          });
          logger.debug('Filename sanitized', { 
            original: file.name, 
            sanitized: sanitizedName 
          });
        }

        // Set initial state
        const preview = URL.createObjectURL(file);
        setState(prev => ({
          ...prev,
          file,
          preview,
          processedFile,
          error: null,
          isReplacement: true,
          wasRemoved: false,
        }));

        try {
          // Handle different upload contexts
          if (uploadContext === 'avatar') {
            logger.debug('Processing avatar image');
            setState(prev => ({
              ...prev,
              isCompressing: true,
              compressionProgress: {
                percentage: 0,
                status: 'Starting',
                currentStep: 'Resizing image...',
              },
            }));

            const resizedFile = await resizeImage(file, AVATAR_RESIZE_CONSTANTS);

            // Validate processed file size
            if (resizedFile.size > AVATAR_CONSTANTS.MAX_FILE_SIZE) {
              const processedSizeMB = Math.round((resizedFile.size / (1024 * 1024)) * 100) / 100;
              const maxProcessedSizeMB = Math.round(AVATAR_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024));

              logger.error('Processed avatar too large', {
                processedSize: processedSizeMB,
                limit: maxProcessedSizeMB,
              });

              const errorMsg = `After processing, the image is still ${processedSizeMB}MB, which exceeds the ${maxProcessedSizeMB}MB limit for avatars. Please try a different image.`;
              setState(prev => ({
                ...prev,
                error: errorMsg,
                file: null,
                preview: null,
                processedFile: null,
                isCompressing: false,
                compressionProgress: null,
              }));

              toast({
                title: 'Processed Image Too Large',
                description: errorMsg,
                variant: 'destructive',
              });

              setTimeout(() => {
                if (input) input.value = '';
              }, 100);

              return null;
            }

            const finalFile =
              sanitizedName !== file.name
                ? new File([resizedFile], sanitizedName, {
                    type: resizedFile.type,
                    lastModified: resizedFile.lastModified,
                  })
                : resizedFile;

            setState(prev => ({
              ...prev,
              processedFile: finalFile,
              isCompressing: false,
              compressionProgress: {
                percentage: 100,
                status: 'Complete',
                currentStep: 'Processing complete',
              },
            }));

            returnFile = finalFile;
          } else if (uploadContext === 'project-image') {
            logger.debug('Processing project image');

            // Compress if needed (> 5MB)
            if (file.size > 5 * 1024 * 1024) {
              logger.debug('File size over 5MB, compressing');
              const compressedFile = await compressProjectImageFile(file);

              const finalFile =
                sanitizedName !== file.name
                  ? new File([compressedFile], sanitizedName, {
                      type: compressedFile.type,
                      lastModified: compressedFile.lastModified,
                    })
                  : compressedFile;

              setState(prev => ({
                ...prev,
                processedFile: finalFile,
              }));

              returnFile = finalFile;
            } else {
              logger.debug('File size under 5MB, no compression needed');
              returnFile = processedFile;
            }
          } else if (uploadContext === 'progress-note') {
            logger.debug('Processing progress note image');

            // Compress if needed (> 3MB)
            if (file.size > 3 * 1024 * 1024) {
              logger.debug('File size over 3MB, compressing');
              const compressedFile = await compressProgressNoteImage(file);

              const finalFile =
                sanitizedName !== file.name
                  ? new File([compressedFile], sanitizedName, {
                      type: compressedFile.type,
                      lastModified: compressedFile.lastModified,
                    })
                  : compressedFile;

              setState(prev => ({
                ...prev,
                processedFile: finalFile,
              }));

              returnFile = finalFile;
            } else {
              logger.debug('File size under 3MB, no compression needed');
              returnFile = processedFile;
            }
          } else {
            returnFile = processedFile;
          }
        } catch (processingError) {
          logger.error('Image processing failed', { error: processingError });

          setState(prev => ({
            ...prev,
            error:
              processingError instanceof Error
                ? processingError.message
                : 'Image processing failed',
            isCompressing: false,
            compressionProgress: null,
          }));

          toast({
            title: 'Image Processing Failed',
            description: 'Unable to process image. Please try a different file.',
            variant: 'destructive',
          });

          return null;
        }
      } else {
        logger.debug('No file selected from input');
      }

      // Reset input
      setTimeout(() => {
        if (input) input.value = '';
      }, 100);

      return returnFile;
    },
    [
      uploadContext,
      folder,
      toast,
      compressProjectImageFile,
      compressProgressNoteImage,
    ]
  );

  // Image removal handler
  const handleImageRemove = useCallback(() => {
    logger.debug('Image removed');
    setState(prev => ({
      ...prev,
      file: null,
      preview: null,
      processedFile: null,
      error: null,
      isReplacement: true,
      wasRemoved: true,
    }));
  }, []);

  // Upload function
  const upload = useCallback(
    async (recordId?: string, fileToUploadOverride?: File | null): Promise<string | undefined> => {
      logger.debug('Upload function called');

      const fileToUpload = fileToUploadOverride || state.processedFile || state.file;

      // Handle image removal
      if ((state.isReplacement && !fileToUpload) || state.wasRemoved) {
        logger.debug('Image removal detected - returning empty string');
        return '';
      }

      if (!fileToUpload) {
        logger.error('No file to upload', {
          hasFile: !!state.file,
          hasProcessedFile: !!state.processedFile,
          isReplacement: state.isReplacement,
          wasRemoved: state.wasRemoved,
        });
        return;
      }

      logger.debug('Starting upload process', {
        fileName: fileToUpload.name,
        fileType: fileToUpload.type,
        fileSize: `${(fileToUpload.size / 1024).toFixed(2)} KB`,
        folder,
        uploadContext,
        isReplacement: state.isReplacement,
      });

      setState(prev => ({ ...prev, uploading: true, error: null }));

      try {
        // Additional validation
        if (fileToUpload.size === 0) {
          throw new Error('Cannot upload empty file');
        }

        const maxSize = getMaxFileSize(uploadContext);
        if (fileToUpload.size > maxSize) {
          const maxSizeMB = Math.round(maxSize / (1024 * 1024));
          throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
        }

        // Validate file type
        const validTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/heic',
          'image/heif',
        ];
        const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase();
        const validExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];

        if (!validTypes.includes(fileToUpload.type) && (!fileExt || !validExts.includes(fileExt))) {
          throw new Error('Invalid file type. Please upload a JPG, PNG, GIF, WebP, or HEIC image.');
        }

        logger.debug('Calling uploadImage function');
        const url = await uploadImage(fileToUpload, folder, uploadContext, recordId);

        if (!url) {
          logger.error('Upload completed but returned empty URL');
          throw new Error('Upload completed but no URL was returned');
        }

        logger.info('Upload successful', { url });
        setState(prev => ({ ...prev, uploading: false }));
        return url;
      } catch (error) {
        logger.error('Upload failed', { error });
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during upload';

        setState(prev => ({ ...prev, uploading: false, error: errorMessage }));

        toast({
          title: 'Upload Failed',
          description: `Please try again or use a different image. Make sure the file is a valid image and under ${Math.round(getMaxFileSize(uploadContext) / (1024 * 1024))}MB.`,
          variant: 'destructive',
        });
        return undefined;
      }
    },
    [
      state.file,
      state.processedFile,
      state.isReplacement,
      state.wasRemoved,
      folder,
      uploadContext,
      toast,
    ]
  );

  return {
    ...state,
    handleImageChange,
    handleImageRemove,
    upload,
  };
};

/**
 * Standalone compression hooks for specific use cases
 */
export const useProgressImageCompression = () => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null);
  const { toast } = useToast();
  const { trackImageCompression, trackCompressionFailure } = useProgressNoteFormTracking();

  const compressImage = useCallback(
    async (file: File): Promise<File> => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const compressionThreshold = 3 * 1024 * 1024; // 3MB

      if (file.size > maxSize) {
        const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
        toast({
          title: 'File Too Large',
          description: `Image is ${fileSizeMB}MB, which exceeds the 50MB limit for progress note images. Please use a smaller image.`,
          variant: 'destructive',
        });
        throw new Error(`File too large: ${fileSizeMB}MB exceeds 50MB limit`);
      }

      if (file.size <= compressionThreshold) {
        return file;
      }

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

        trackImageCompression({
          originalSize: file.size,
          compressedSize: compressedFile.size,
          compressionRatio: Math.round((1 - compressedFile.size / file.size) * 100),
          originalSizeMB: Math.round((file.size / (1024 * 1024)) * 100) / 100,
          compressedSizeMB: Math.round((compressedFile.size / (1024 * 1024)) * 100) / 100,
        });

        toast({
          title: 'Image Uploaded',
          description: 'Image is successfully uploaded!',
        });

        return compressedFile;
      } catch (error) {
        logger.error('Compression failed', { error });
        trackCompressionFailure(error, file.size);

        toast({
          title: 'Compression Failed',
          description: 'Unable to compress image. Using original file.',
          variant: 'destructive',
        });

        return file;
      } finally {
        setIsCompressing(false);
        setCompressionProgress(null);
      }
    },
    [toast, trackImageCompression, trackCompressionFailure]
  );

  const resetCompressionState = useCallback(() => {
    setIsCompressing(false);
    setCompressionProgress(null);
  }, []);

  return {
    compressImage,
    isCompressing,
    compressionProgress,
    resetCompressionState,
  };
};

export const useProjectImageCompression = () => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null);
  const { toast } = useToast();

  const compressImage = useCallback(
    async (file: File): Promise<File> => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const compressionThreshold = 5 * 1024 * 1024; // 5MB

      if (file.size > maxSize) {
        const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
        toast({
          title: 'File Too Large',
          description: `Image is ${fileSizeMB}MB, which exceeds the 50MB limit for project images. Please use a smaller image.`,
          variant: 'destructive',
        });
        throw new Error(`File too large: ${fileSizeMB}MB exceeds 50MB limit`);
      }

      if (file.size <= compressionThreshold) {
        logger.debug('File size under compression threshold', {
          size: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
        });
        return file;
      }

      try {
        setIsCompressing(true);
        logger.debug('Starting compression', { fileName: file.name });

        const compressedFile = await compressProjectImage(file, (progress: number) => {
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

        const originalSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
        const compressedSizeMB = Math.round((compressedFile.size / (1024 * 1024)) * 100) / 100;
        const compressionRatio = Math.round((1 - compressedFile.size / file.size) * 100);

        logger.info('Compression successful', {
          original: originalSizeMB + 'MB',
          compressed: compressedSizeMB + 'MB',
          ratio: compressionRatio + '%',
        });

        toast({
          title: 'Image Uploaded',
          description: 'Image is successfully uploaded!',
        });

        return compressedFile;
      } catch (error) {
        logger.error('Compression failed', { error });

        toast({
          title: 'Compression Failed',
          description: 'Unable to optimize image. Using original file.',
          variant: 'destructive',
        });

        if (file.size <= 6 * 1024 * 1024) {
          logger.info('Using original file as fallback (under 6MB)');
          return file;
        }

        throw new Error(
          `Image compression failed and file is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please use a smaller image.`
        );
      } finally {
        setIsCompressing(false);
        setCompressionProgress(null);
      }
    },
    [toast]
  );

  const resetCompressionState = useCallback(() => {
    setIsCompressing(false);
    setCompressionProgress(null);
  }, []);

  return {
    compressImage,
    isCompressing,
    compressionProgress,
    resetCompressionState,
  };
};

export default useImageUpload;