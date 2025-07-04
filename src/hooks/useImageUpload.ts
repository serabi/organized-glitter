import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useProjectImageCompression } from '@/hooks/useProjectImageCompression';
import { uploadImage } from '@/utils/imageUpload'; // Assuming this utility handles the actual upload
import { logger } from '@/utils/logger';
import {
  PROJECT_IMAGE_CONSTANTS,
  PROGRESS_NOTE_CONSTANTS,
  AVATAR_CONSTANTS,
  AVATAR_RESIZE_CONSTANTS,
} from '@/components/projects/ProgressNoteForm/constants';

// Helper function to resize images
const resizeImage = async (
  file: File,
  resizeConstants: typeof AVATAR_RESIZE_CONSTANTS
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null; // Variable to store the object URL

    img.onload = () => {
      // Max dimensions for the resized image
      const MAX_WIDTH = resizeConstants.MAX_WIDTH;
      const MAX_HEIGHT = resizeConstants.MAX_HEIGHT;

      // Calculate new dimensions while maintaining aspect ratio
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

      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      // Draw resized image on canvas
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      // Convert canvas to Blob
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'));
            return;
          }

          // Create new File object from the blob
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          resolve(resizedFile);
        },
        file.type,
        resizeConstants.QUALITY // Image quality (0-1)
      );
    };

    img.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl); // Revoke URL on error
      }
      reject(new Error('Failed to load image'));
    };

    // Load the image from the file
    try {
      objectUrl = URL.createObjectURL(file); // Store the object URL
      img.src = objectUrl;
    } catch (urlError) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl); // Revoke URL on error
      }
      reject(new Error('Failed to create image preview'));
    }
  });
};

// Helper function to get max file size based on context
const getMaxFileSize = (context: string): number => {
  if (context === 'avatar') return AVATAR_CONSTANTS.MAX_FILE_SIZE; // 5MB for processed avatars
  if (context === 'project-image') return PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE;
  return PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE; // For progress notes
};

export interface ImageUploadState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  error: string | null;
  processedFile: File | null; // Store processed file for upload
  isReplacement: boolean; // Flag to track if this is replacing an existing image
  wasRemoved: boolean; // Flag to track if image was explicitly removed
  isCompressing: boolean; // Flag to track if image is being compressed
  compressionProgress: { percentage: number; status: string; currentStep: string } | null;
}

export const useImageUpload = (
  folder: 'project-images' | 'avatars',
  uploadContext: 'project-image' | 'progress-note' | 'avatar' = 'project-image'
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
  const { compressImage, isCompressing, compressionProgress } = useProjectImageCompression();

  // Update compression progress from the hook
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isCompressing,
      compressionProgress,
    }));
  }, [isCompressing, compressionProgress]);

  const handleImageChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<File | null> => {
      logger.log('handleImageChange called in useImageUpload hook - VERSION: 2025-05-26-v2');
      logger.log(`[useImageUpload] Upload context: ${uploadContext}, folder: ${folder}`);

      // Clear input value after handling to ensure onChange fires even if same file is selected
      const input = event.target;
      const file = input.files?.[0];
      let returnFile: File | null = null;

      if (file) {
        logger.log('File selected:', { name: file.name, type: file.type, size: file.size });

        // Clear any previous errors when a new file is selected
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
          logger.error('Invalid file type:', file.type);
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

          // Reset input so the same file can be selected again
          setTimeout(() => {
            if (input) input.value = '';
          }, 100);

          return null;
        }

        // Check original file size against appropriate limits
        let currentMaxFileSize: number;
        let maxSizeMB: number;

        if (uploadContext === 'avatar') {
          currentMaxFileSize = AVATAR_CONSTANTS.MAX_ORIGINAL_FILE_SIZE;
          maxSizeMB = Math.round(AVATAR_CONSTANTS.MAX_ORIGINAL_FILE_SIZE / (1024 * 1024));
        } else if (uploadContext === 'project-image') {
          currentMaxFileSize = PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE;
          maxSizeMB = Math.round(PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024));
        } else {
          currentMaxFileSize = PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE;
          maxSizeMB = Math.round(PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024));
        }

        // Check file size with specific limits based on upload context
        logger.log(
          `[useImageUpload] File size validation - uploadContext: ${uploadContext}, file size: ${file.size}, max allowed: ${currentMaxFileSize}`
        );

        const imageType =
          uploadContext === 'avatar'
            ? 'avatar'
            : uploadContext === 'progress-note'
              ? 'progress note'
              : 'project';

        if (file.size > currentMaxFileSize) {
          const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100; // Round to 2 decimal places
          logger.error('File too large:', file.size, 'bytes (', fileSizeMB, 'MB)');
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

          // Reset input so the same file can be selected again
          setTimeout(() => {
            if (input) input.value = '';
          }, 100);

          return null;
        }

        // Create a properly sanitized filename
        const sanitizedName = file.name
          .replace(/[#?%&=]/g, '_') // Replace problematic characters
          .replace(/\s+/g, '-'); // Replace spaces with hyphens

        // Create processed file with sanitized name if needed
        let processedFile = file;
        if (sanitizedName !== file.name) {
          processedFile = new File([file], sanitizedName, {
            type: file.type,
            lastModified: file.lastModified,
          });
          logger.log('Filename sanitized:', { original: file.name, sanitized: sanitizedName });
        }

        // Handle avatar resizing and validation
        if (uploadContext === 'avatar') {
          logger.log('[useImageUpload] Avatar selected, processing and resizing...');

          // Set initial state with the original file
          const preview = URL.createObjectURL(file);
          setState(prev => ({
            ...prev,
            file,
            preview,
            processedFile,
            error: null,
            isReplacement: true,
            wasRemoved: false,
            isCompressing: true, // Use this flag for processing
            compressionProgress: {
              percentage: 0,
              status: 'Starting',
              currentStep: 'Resizing image...',
            },
          }));

          try {
            // Resize the avatar image
            const resizedFile = await resizeImage(file, AVATAR_RESIZE_CONSTANTS);

            // Validate the processed file size
            if (resizedFile.size > AVATAR_CONSTANTS.MAX_FILE_SIZE) {
              const processedSizeMB = Math.round((resizedFile.size / (1024 * 1024)) * 100) / 100;
              const maxProcessedSizeMB = Math.round(AVATAR_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024));

              logger.error(
                `Processed avatar too large: ${processedSizeMB}MB exceeds ${maxProcessedSizeMB}MB limit`
              );

              setState(prev => ({
                ...prev,
                error: `After processing, the image is still ${processedSizeMB}MB, which exceeds the ${maxProcessedSizeMB}MB limit for avatars. Please try a different image.`,
                file: null,
                preview: null,
                processedFile: null,
                isCompressing: false,
                compressionProgress: null,
              }));

              toast({
                title: 'Processed Image Too Large',
                description: `After processing, the image is still ${processedSizeMB}MB, which exceeds the ${maxProcessedSizeMB}MB limit for avatars. Please try a different image.`,
                variant: 'destructive',
              });

              // Reset input
              setTimeout(() => {
                if (input) input.value = '';
              }, 100);

              return null;
            }

            // Create final file with sanitized name if needed
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
          } catch (resizeError) {
            logger.error('[useImageUpload] Avatar resize failed:', resizeError);

            setState(prev => ({
              ...prev,
              error: resizeError instanceof Error ? resizeError.message : 'Image processing failed',
              isCompressing: false,
              compressionProgress: null,
            }));

            toast({
              title: 'Image Processing Failed',
              description: 'Unable to process avatar image. Please try a different file.',
              variant: 'destructive',
            });

            return null;
          }
        }
        // Handle compression for project images
        else if (uploadContext === 'project-image') {
          logger.log('[useImageUpload] Project image selected, checking if compression needed');

          // Set initial state with the original file
          const preview = URL.createObjectURL(file);
          setState(prev => ({
            ...prev,
            file,
            preview,
            processedFile,
            error: null,
            isReplacement: true,
            wasRemoved: false,
            isCompressing: false,
            compressionProgress: null,
          }));

          // Compress in background if needed (> 5MB)
          if (file.size > 5 * 1024 * 1024) {
            logger.log('[useImageUpload] File size over 5MB, compressing...');

            try {
              const compressedFile = await compressImage(file);
              logger.log('[useImageUpload] Compression completed, updating processed file');

              // Create new file with sanitized name if needed
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
            } catch (compressionError) {
              logger.error('[useImageUpload] Compression failed:', compressionError);

              setState(prev => ({
                ...prev,
                error:
                  compressionError instanceof Error
                    ? compressionError.message
                    : 'Compression failed',
              }));

              toast({
                title: 'Image Compression Failed',
                description: 'Unable to optimize image. Please try a smaller file.',
                variant: 'destructive',
              });

              return null;
            }
          } else {
            logger.log('[useImageUpload] File size under 5MB, no compression needed');
            returnFile = processedFile;
          }
        } else {
          // For non-project images, use existing logic
          const preview = URL.createObjectURL(file);
          logger.log('Preview URL created:', preview);
          logger.log('Setting isReplacement flag to true for image change');
          setState(prev => ({
            ...prev,
            file,
            preview,
            processedFile,
            error: null,
            isReplacement: true,
            wasRemoved: false, // Reset the removed flag when a new file is selected
          }));
          returnFile = processedFile;
        }
      } else {
        logger.log('No file selected from input');
      }

      // Reset input so the same file can be selected again
      setTimeout(() => {
        if (input) input.value = '';
      }, 100);
      return returnFile;
    },
    [uploadContext, toast, compressImage, folder]
  ); // Updated dependencies

  const handleImageRemove = useCallback(() => {
    logger.log('Image removed - setting isReplacement flag to true');
    setState(prev => ({
      ...prev,
      file: null,
      preview: null,
      processedFile: null,
      error: null,
      isReplacement: true, // Mark as replacement even when removing
      wasRemoved: true, // Set the removed flag when image is explicitly removed
    }));
  }, []);

  const upload = useCallback(
    async (recordId?: string, fileToUploadOverride?: File | null): Promise<string | undefined> => {
      logger.log('===== UPLOAD FUNCTION CALLED IN useImageUpload HOOK =====');

      const fileToUpload = fileToUploadOverride || state.processedFile || state.file;

      // If we're explicitly replacing with nothing (isReplacement is true but no file)
      // or if image was explicitly removed (wasRemoved is true)
      if ((state.isReplacement && !fileToUpload) || state.wasRemoved) {
        logger.log(
          '[useImageUpload] Image removal detected - returning empty string to clear image'
        );
        return '';
      }

      if (!fileToUpload) {
        logger.error('[useImageUpload] No file to upload - state:', {
          hasFile: !!state.file,
          hasProcessedFile: !!state.processedFile,
          isReplacement: state.isReplacement,
          wasRemoved: state.wasRemoved,
          preview: !!state.preview,
        });
        return;
      }

      logger.log('[useImageUpload] Starting upload process with:', {
        file: fileToUpload.name,
        type: fileToUpload.type,
        size: `${(fileToUpload.size / 1024).toFixed(2)} KB`,
        folder,
        isReplacement: state.isReplacement,
        wasRemoved: state.wasRemoved,
        lastModified: new Date(fileToUpload.lastModified).toISOString(),
      });

      // Check if the file is actually an image by trying to read it
      try {
        const reader = new FileReader();
        reader.onload = () => {
          logger.log(
            `[useImageUpload] File read test successful. Data size: ${reader.result?.toString().length || 0} bytes`
          );
        };
        reader.onerror = e => {
          logger.error('[useImageUpload] Error reading file:', e);
        };
        reader.readAsDataURL(fileToUpload);
      } catch (readError) {
        logger.error('[useImageUpload] Error testing file readability:', readError);
      }

      setState(prev => ({ ...prev, uploading: true, error: null }));

      try {
        // Additional validation before upload
        if (fileToUpload.size === 0) {
          throw new Error('Cannot upload empty file');
        }

        // Use the same size limits as the uploadContext
        const maxSize = getMaxFileSize(uploadContext);
        if (fileToUpload.size > maxSize) {
          const maxSizeMB = Math.round(maxSize / (1024 * 1024));
          throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
        }

        // Validate file type again
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

        logger.log('[useImageUpload] Calling uploadImage function with folder:', folder);
        try {
          const url = await uploadImage(fileToUpload, folder, uploadContext, recordId);
          logger.log('[useImageUpload] Upload successful!');
          logger.log('[useImageUpload] Received URL:', url);

          if (!url) {
            logger.error('[useImageUpload] Upload completed but returned empty URL');
            throw new Error('Upload completed but no URL was returned');
          }

          setState(prev => ({ ...prev, uploading: false }));
          return url;
        } catch (uploadError) {
          logger.error('[useImageUpload] Error in uploadImage function:', uploadError);
          throw uploadError; // Re-throw to be caught by the outer try/catch
        }
      } catch (error) {
        logger.error('[useImageUpload] Upload failed:', error);
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
      state.preview,
      folder,
      toast,
      uploadContext,
    ]
  );

  // Return state and handlers
  return {
    ...state,
    handleImageChange,
    handleImageRemove,
    upload,
  };
};
