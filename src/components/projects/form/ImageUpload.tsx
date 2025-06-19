import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import {
  PROJECT_IMAGE_CONSTANTS,
  PROGRESS_NOTE_CONSTANTS,
  IMAGE_RESIZE_CONSTANTS,
  AVATAR_RESIZE_CONSTANTS,
  AVATAR_CONSTANTS,
} from '@/components/projects/ProgressNoteForm/constants';

// Helper functions for file size limits
const getMaxOriginalFileSize = (context: 'project-image' | 'progress-note' | 'avatar') => {
  if (context === 'avatar') return AVATAR_CONSTANTS.MAX_ORIGINAL_FILE_SIZE;
  if (context === 'progress-note') return PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE;
  if (context === 'project-image') return PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE;
  return PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE; // Default to project image max size
};

const getMaxProcessedFileSize = (context: 'project-image' | 'progress-note' | 'avatar') => {
  if (context === 'avatar') return AVATAR_CONSTANTS.MAX_FILE_SIZE;
  if (context === 'progress-note') return PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE;
  if (context === 'project-image') return PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE;
  return PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE; // Default to project image max size
};

const getMaxFileSizeText = (context: 'project-image' | 'progress-note' | 'avatar') => {
  if (context === 'avatar') return `${AVATAR_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`;
  if (context === 'progress-note')
    return `${PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`;
  if (context === 'project-image')
    return `${PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`;
  return `${PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`; // Default
};

const getContextName = (context: 'project-image' | 'progress-note' | 'avatar') => {
  if (context === 'avatar') return 'avatars';
  if (context === 'progress-note') return 'progress note images';
  return 'project images';
};

interface ImageUploadProps {
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadError: string | undefined;
  uploadContext?: 'project-image' | 'progress-note' | 'avatar';
}

const ImageUpload = ({
  onImageChange,
  uploadError,
  uploadContext = 'project-image',
}: ImageUploadProps) => {
  const { toast } = useToast();
  const [resizing, setResizing] = useState(false);

  const resizeImage = async (file: File): Promise<File> => {
    setResizing(true);
    try {
      return new Promise((resolve, reject) => {
        // Create an image element to load the file
        const img = new Image();
        img.onload = () => {
          // Determine resize constants based on context
          const currentResizeConstants =
            uploadContext === 'avatar' ? AVATAR_RESIZE_CONSTANTS : IMAGE_RESIZE_CONSTANTS;

          // Max dimensions for the resized image
          const MAX_WIDTH = currentResizeConstants.MAX_WIDTH;
          const MAX_HEIGHT = currentResizeConstants.MAX_HEIGHT;

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
            currentResizeConstants.QUALITY // Image quality (0-1)
          );
        };

        img.onerror = () => {
          // This happens when CSP blocks blob: URLs or other load issues
          console.error(
            'Failed to load image for preview. This might be due to Content Security Policy restrictions.'
          );
          reject(new Error('Failed to load image'));
        };

        // Handle potential CSP errors by adding a try/catch
        try {
          // Load the image from the file
          img.src = URL.createObjectURL(file);
        } catch (urlError) {
          console.error('Error creating object URL:', urlError);
          reject(new Error('Failed to create image preview'));
        }
      });
    } catch (error) {
      console.error('Error resizing image:', error);
      return file; // Return original file if resizing fails
    } finally {
      setResizing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    try {
      let file = e.target.files[0];
      const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100; // Round to 2 decimal places

      console.log(`File selected: ${file.name} (${fileSizeMB}MB, type: ${file.type})`);

      const isHeic =
        file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif') ||
        file.type === 'image/heic' ||
        file.type === 'image/heif';

      // Check if file is HEIC/HEIF and reject it
      if (isHeic) {
        console.error('HEIC/HEIF images are not supported');
        e.target.value = '';
        toast({
          title: 'Unsupported Image Format',
          description:
            'HEIC/HEIF images are not supported. Please convert to JPG, PNG, or another web-compatible format before uploading.',
          variant: 'destructive',
        });
        return; // Stop processing
      }

      // For avatars, check original file size against a higher limit (will validate processed size later)
      // For other contexts, validate against their normal limits
      const MAX_ORIGINAL_SIZE = getMaxOriginalFileSize(uploadContext);
      const contextName = getContextName(uploadContext);

      if (uploadContext !== 'avatar' && file.size > MAX_ORIGINAL_SIZE) {
        const maxSizeText = getMaxFileSizeText(uploadContext);
        console.error(`File too large: ${fileSizeMB}MB exceeds ${maxSizeText} limit`);
        e.target.value = '';
        toast({
          title: 'File Too Large',
          description: `Image is ${fileSizeMB}MB, which exceeds the ${maxSizeText} limit for ${contextName}. Please use a smaller image or compress it.`,
          variant: 'destructive',
        });
        return; // Stop processing
      }

      // For avatars, check against the higher original file size limit
      if (uploadContext === 'avatar' && file.size > MAX_ORIGINAL_SIZE) {
        const maxOriginalSizeMB = Math.round(MAX_ORIGINAL_SIZE / (1024 * 1024));
        console.error(
          `File too large: ${fileSizeMB}MB exceeds ${maxOriginalSizeMB}MB original file limit`
        );
        e.target.value = '';
        toast({
          title: 'File Too Large',
          description: `Image is ${fileSizeMB}MB, which exceeds the ${maxOriginalSizeMB}MB upload limit. Please use a smaller image.`,
          variant: 'destructive',
        });
        return; // Stop processing
      }

      // Validate supported image types with better messaging
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!file.type.startsWith('image/') || !validTypes.includes(file.type)) {
        console.error(`Unsupported file type: ${file.type}`);
        e.target.value = '';
        toast({
          title: 'Unsupported File Type',
          description: `File type "${file.type || 'unknown'}" is not supported. Please use JPG, PNG, GIF, or WebP format.`,
          variant: 'destructive',
        });
        return; // Stop processing
      }

      // Resize the image if it's an image
      if (file.type.startsWith('image/')) {
        try {
          // Determine if resizing should happen based on context and size
          // For example, only resize if it's a project image and above a certain size, or always for avatars
          // This logic can be refined based on specific requirements for each context
          let shouldResize = false;
          if (uploadContext === 'avatar') {
            shouldResize = true; // Always resize avatars for consistency
          } else if (uploadContext === 'project-image') {
            // Example: Resize project images if they are larger than a certain dimension or size after initial check
            // For now, let's assume the existing resize logic is generally applicable
            // but this could be tied to PROJECT_IMAGE_CONSTANTS.COMPRESSION_THRESHOLD or similar if needed
            shouldResize = true; // Or based on a specific condition for project images
          } else if (uploadContext === 'progress-note') {
            // Progress notes might have different resizing needs, e.g., less aggressive or none if handled by compression hook
            // For now, let's assume resize is not automatically applied here or handled by a different mechanism
            shouldResize = false;
          }

          if (shouldResize) {
            const resizedFile = await resizeImage(file);
            file = resizedFile;

            // For avatars, validate the processed file size
            if (uploadContext === 'avatar') {
              const processedSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
              const MAX_PROCESSED_SIZE = getMaxProcessedFileSize(uploadContext);

              if (file.size > MAX_PROCESSED_SIZE) {
                const maxProcessedSizeMB = Math.round(MAX_PROCESSED_SIZE / (1024 * 1024));
                console.error(
                  `Processed file too large: ${processedSizeMB}MB exceeds ${maxProcessedSizeMB}MB limit`
                );
                e.target.value = '';
                toast({
                  title: 'Processed Image Too Large',
                  description: `After processing, the image is still ${processedSizeMB}MB, which exceeds the ${maxProcessedSizeMB}MB limit for avatars. Please try a different image.`,
                  variant: 'destructive',
                });
                return; // Stop processing
              }
            }
          } else {
            console.log(`Resizing skipped for ${uploadContext}`);
          }
        } catch (resizeError) {
          console.error('Error resizing image:', resizeError);
          // Continue with original file if resize fails
          toast({
            title: 'Image Preview Issue',
            description:
              'There was a problem processing the image preview, but your image will still be uploaded.',
            variant: 'destructive',
          });
        }
      }

      // Create a new event with the processed file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // Create a new input event with the processed files
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          files: dataTransfer.files,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      onImageChange(newEvent);
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: 'Image Processing Error',
        description:
          'Failed to process the image, but your form data is still valid. You can continue with submission.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      {uploadError && <p className="mb-2 text-sm text-destructive">{uploadError}</p>}

      {/* Upload New Image Section */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <span className="text-base font-medium">Upload New Image</span>
        </div>

        <label className="block">
          <span className="sr-only">Choose project image</span>
          <Input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            // maxLength={10485760} // This was the old 10MB limit, now dynamic via getMaxFileSize
            onChange={handleFileChange}
            className="block h-auto w-full border-dashed py-2 text-sm text-gray-500 file:mr-4 file:inline-flex file:items-center file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
            disabled={resizing}
          />
        </label>

        <p className="mt-3 text-xs text-muted-foreground">
          {resizing
            ? 'Processing image...'
            : `Maximum file size: ${getMaxFileSizeText(uploadContext)}. Supported formats: JPG, PNG, GIF, WebP. HEIC/HEIF images are not supported.`}
          {uploadError && uploadError.includes('Content Security Policy') && (
            <span className="mt-1 block text-amber-600">
              Note: Image preview is disabled due to browser security settings, but uploads will
              still work.
            </span>
          )}
        </p>
        {uploadError && <p className="mt-1 text-xs font-medium text-destructive">{uploadError}</p>}
      </div>
    </div>
  );
};

export default ImageUpload;
