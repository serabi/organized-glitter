import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { X } from 'lucide-react';

interface CompressionProgress {
  percentage: number;
  status: string;
  currentStep: string;
}

interface ImageUploadProps {
  imageFile: File | null;
  isCompressing: boolean;
  compressionProgress: CompressionProgress | null;
  disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  error?: string; // Added error prop
}

/**
 * ImageUpload component for the ProgressNoteForm.
 * Handles image file selection, displays compression progress, and shows selected file information or errors.
 *
 * @param {ImageUploadProps} props - The component props.
 * @param {File | null} props.imageFile - The currently selected image file.
 * @param {boolean} props.isCompressing - Flag indicating if image compression is in progress.
 * @param {CompressionProgress | null} props.compressionProgress - Object detailing the compression status.
 * @param {boolean} props.disabled - Whether the input is disabled.
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onChange - Handler for image file changes.
 * @param {() => void} props.onClearImage - Handler for clearing the selected image.
 * @param {string} [props.error] - Optional error message to display for the image input.
 * @returns {JSX.Element} The rendered ImageUpload component.
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
  imageFile,
  isCompressing,
  compressionProgress,
  disabled,
  onChange,
  onClearImage,
  error,
}) => {
  // Generate a unique ID for the input to connect the label and input
  const inputId = React.useId();

  // Create preview URL for the selected image
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // Create and cleanup preview URL when imageFile changes
  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);

      // Cleanup function to revoke the object URL
      return () => {
        URL.revokeObjectURL(url);
        setPreviewUrl(null);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [imageFile]);

  // Handler to remove the selected image
  const handleRemoveImage = () => {
    onClearImage();
  };

  return (
    <div>
      <Label
        htmlFor={inputId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Photo (optional)
      </Label>

      {/* Show upload button only when no image is selected */}
      {!imageFile && (
        <div className="mt-2">
          <Label
            htmlFor={inputId}
            className={cn(
              buttonVariants({ variant: 'default' }),
              'cursor-pointer',
              disabled && 'cursor-not-allowed opacity-50',
              error &&
                'border-destructive text-destructive hover:border-destructive/80 hover:text-destructive/80'
            )}
          >
            Choose File
          </Label>
          <Input
            id={inputId}
            type="file"
            accept="image/*"
            onChange={onChange}
            className="sr-only"
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'image-error' : undefined}
          />
        </div>
      )}

      {/* Compression Progress */}
      {isCompressing && compressionProgress && (
        <div className="mt-2 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{compressionProgress.currentStep}</span>
            <span>{compressionProgress.percentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${compressionProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Image Preview */}
      {imageFile && previewUrl && (
        <div className="mt-3">
          <div className="group relative mx-auto max-w-[200px]">
            <AspectRatio
              ratio={4 / 3}
              className="overflow-hidden rounded-lg border border-border bg-muted"
            >
              <img
                src={previewUrl}
                alt="Image preview"
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
            </AspectRatio>

            {/* Remove image button */}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 shadow-md transition-colors hover:bg-destructive/80 focus:opacity-100 group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {isCompressing && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                <div className="text-sm font-medium text-white">Compressing...</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image File Info */}
      {imageFile && !isCompressing && (
        <p className="mt-2 text-xs text-muted-foreground">
          Selected: {imageFile.name} ({Math.round((imageFile.size / (1024 * 1024)) * 100) / 100}MB)
        </p>
      )}

      {error && (
        <p id="image-error" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
