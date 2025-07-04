import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CropModalProps } from '@/types/avatar';
import { validateImageFile, createFilePreviewUrl, revokePreviewUrl } from '@/utils/imageUtils';
import { useToast } from '@/hooks/use-toast';
import { trackEvent, captureException } from '@/utils/posthog';
import { logger } from '@/utils/logger';

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ImageCropModal: React.FC<CropModalProps> = ({
  file: initialFileFromProps,
  imageUrl: providedImageUrl,
  onCropComplete,
  onCancel,
}) => {
  const [file, setFile] = useState<File | null>(initialFileFromProps);
  const [imageSrc, setImageSrc] = useState<string | null>(
    providedImageUrl || (initialFileFromProps ? createFilePreviewUrl(initialFileFromProps) : null)
  );
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropData, setCropData] = useState<CropData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Cleanup effect for image source (only if we created it) - use requestAnimationFrame for safer timing
  useEffect(() => {
    return () => {
      // Only revoke if we created the URL ourselves (not provided from parent)
      if (imageSrc && !providedImageUrl && imageSrc !== providedImageUrl) {
        requestAnimationFrame(() => {
          revokePreviewUrl(imageSrc);
        });
      }
    };
  }, [imageSrc, providedImageUrl]);

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      const validation = validateImageFile(selectedFile);

      if (!validation.isValid) {
        // Track validation failure for analytics
        trackEvent('avatar_validation_failed', {
          file_type: selectedFile.type,
          file_size_mb: Math.round((selectedFile.size / (1024 * 1024)) * 100) / 100,
          is_heic:
            selectedFile.type.includes('heic') ||
            selectedFile.type.includes('heif') ||
            selectedFile.name.toLowerCase().includes('.heic') ||
            selectedFile.name.toLowerCase().includes('.heif'),
          error_message: validation.error,
          user_agent: navigator.userAgent.includes('Safari') ? 'safari' : 'other',
        });

        toast({
          variant: 'destructive',
          title: 'Invalid File',
          description: validation.error,
        });
        return;
      }

      // Clean up previous preview URL (only if we created it) - use requestAnimationFrame for safer timing
      if (imageSrc && !providedImageUrl && imageSrc !== providedImageUrl) {
        requestAnimationFrame(() => {
          revokePreviewUrl(imageSrc);
        });
      }

      setFile(selectedFile);
      const previewUrl = createFilePreviewUrl(selectedFile);
      setImageSrc(previewUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    },
    [imageSrc, providedImageUrl, toast]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const handleCropAreaChange = useCallback(
    (
      _croppedAreaPercentage: { x: number; y: number; width: number; height: number },
      croppedAreaPixels: CropData
    ) => {
      setCropData(croppedAreaPixels);
    },
    []
  );

  const handleCropConfirm = useCallback(async () => {
    if (!file || !cropData || !imageSrc) return;

    setIsProcessing(true);

    try {
      const croppedImageUrl = await new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        const img = new Image();

        img.onload = () => {
          try {
            const targetSize = 200;
            canvas.width = targetSize;
            canvas.height = targetSize;

            ctx.drawImage(
              img,
              cropData.x,
              cropData.y,
              cropData.width,
              cropData.height,
              0,
              0,
              targetSize,
              targetSize
            );

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            resolve(dataUrl);
          } catch (drawError) {
            reject(drawError);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image for cropping'));
        };

        img.src = imageSrc;
      });

      // Only cleanup if we created the URL ourselves - use requestAnimationFrame for safer timing
      if (imageSrc && !providedImageUrl && imageSrc !== providedImageUrl) {
        requestAnimationFrame(() => {
          revokePreviewUrl(imageSrc);
        });
      }

      onCropComplete(croppedImageUrl);
    } catch (error) {
      logger.error('Error cropping image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to crop image';

      // Track cropping error for analytics
      trackEvent('avatar_crop_error', {
        error_message: errorMessage,
        user_agent: navigator.userAgent.includes('Safari') ? 'safari' : 'other',
      });

      // Capture exception for debugging
      captureException(error instanceof Error ? error : new Error(errorMessage), {
        context: 'avatar_crop_canvas_operation',
      });

      toast({
        variant: 'destructive',
        title: 'Cropping Error',
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [file, cropData, imageSrc, providedImageUrl, onCropComplete, toast]);

  const handleCancel = useCallback(() => {
    // Only cleanup if we created the URL ourselves - use requestAnimationFrame for safer timing
    if (imageSrc && !providedImageUrl && imageSrc !== providedImageUrl) {
      requestAnimationFrame(() => {
        revokePreviewUrl(imageSrc);
      });
    }
    onCancel();
  }, [imageSrc, providedImageUrl, onCancel]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  return (
    <Dialog
      open={true}
      onOpenChange={openStatus => {
        if (!openStatus) handleCancel();
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crop Your Photo</DialogTitle>
          <DialogDescription>
            Upload an image and adjust the crop area to create your avatar. You can drag to
            reposition and use the zoom slider to resize.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {!imageSrc ? (
            // File upload area
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">Upload Your Photo</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Drag and drop an image, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPEG, PNG, WebP, HEIC • Max 5MB
              </p>

              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            // Crop interface
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">Adjust Crop</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Only cleanup if we created the URL ourselves - use requestAnimationFrame for safer timing
                    if (imageSrc && !providedImageUrl && imageSrc !== providedImageUrl) {
                      requestAnimationFrame(() => {
                        revokePreviewUrl(imageSrc);
                      });
                    }
                    setImageSrc(null);
                    setFile(null);
                  }}
                >
                  <X className="mr-1 h-4 w-4" /> Change Photo
                </Button>
              </div>

              <div
                className="relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                style={{ height: '300px' }}
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={handleCropChange}
                  onZoomChange={handleZoomChange}
                  onCropAreaChange={handleCropAreaChange}
                  showGrid={false}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zoom">Zoom</Label>
                <input
                  id="zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setZoom(Number(e.target.value));
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleCropConfirm} disabled={!cropData || isProcessing || !imageSrc}>
            {isProcessing ? 'Processing...' : 'Crop & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropModal;
