import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud, AlertCircle, CheckCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useToast } from '@/components/ui/use-toast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { pb } from '@/lib/pocketbase'; // Added import for pb
import { AvatarConfig, AvatarManagerProps } from '@/types/avatar';
import ImageCropModal from './ImageCropModal';
import { dataURLtoFile } from '@/utils/imageUtils';
import { logger } from '@/utils/logger';

// Utility functions for iOS Safari detection and HEIC handling
const isIOSSafari = (): boolean => {
  const userAgent = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
  );
};

interface UploadState {
  previewUrl?: string;
  uploadedFile?: File;
  croppedImageUrl?: string;
}

export function AvatarManager({
  currentAvatar,
  currentConfig,
  onAvatarUpdate,
  onClose,
  isOpen,
  userEmail: _userEmail,
}: AvatarManagerProps): React.JSX.Element {
  const { toast } = useToast();
  const imageUploadHook = useImageUpload('avatars', 'avatar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const validBlobUrlsRef = useRef<Set<string>>(new Set());

  const [uploadState, setUploadState] = useState<UploadState>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [finalCompressedFile, setFinalCompressedFile] = useState<File | null>(null);

  // Use a cleanup queue to safely revoke blob URLs without timing conflicts
  const cleanupQueue = useRef<Set<string>>(new Set());

  // Safe blob URL cleanup with queue system
  const queueBlobForCleanup = useCallback((url: string) => {
    if (url && url.startsWith('blob:')) {
      cleanupQueue.current.add(url);
      logger.log('[AvatarManager] Queued blob URL for cleanup:', url);
    }
  }, []);

  // Process cleanup queue on next animation frame
  const processCleanupQueue = useCallback(() => {
    if (cleanupQueue.current.size > 0) {
      requestAnimationFrame(() => {
        const urlsToCleanup = Array.from(cleanupQueue.current);
        cleanupQueue.current.clear();

        urlsToCleanup.forEach(url => {
          try {
            validBlobUrlsRef.current.delete(url);
            URL.revokeObjectURL(url);
            logger.log('[AvatarManager] Successfully cleaned up blob URL:', url);
          } catch (error) {
            logger.warn('[AvatarManager] Failed to cleanup blob URL:', url, error);
          }
        });
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      logger.log('[AvatarManager] Modal opened, initializing state');
      // Initialize state from current config when opening
      if (currentConfig?.type === 'upload' && currentAvatar) {
        logger.log('[AvatarManager] Initializing with existing avatar:', currentAvatar);
        setUploadState({
          previewUrl: currentAvatar,
        });
      } else {
        logger.log('[AvatarManager] Initializing with empty state');
        setUploadState({});
      }
      setProcessingError(null);
      setIsProcessing(false);
      setShowCropModal(false);
      setUploadFile(null);
      setFinalCompressedFile(null);
    } else {
      // Clean up when modal closes using the queue system
      logger.log('[AvatarManager] Modal closed, cleaning up state');
      setUploadState(prev => {
        // Queue blob URLs for safe cleanup
        if (prev.previewUrl && prev.previewUrl.startsWith('blob:')) {
          queueBlobForCleanup(prev.previewUrl);
        }
        if (prev.croppedImageUrl && prev.croppedImageUrl.startsWith('blob:')) {
          queueBlobForCleanup(prev.croppedImageUrl);
        }
        processCleanupQueue();
        return {};
      });
      setUploadFile(null);
      setFinalCompressedFile(null);
    }
  }, [isOpen, currentConfig, currentAvatar, queueBlobForCleanup, processCleanupQueue]);

  // Cleanup blob URLs when component unmounts using queue system
  useEffect(() => {
    // Capture refs at effect time to avoid stale closure issues
    const currentBlobUrlRefCurrent = currentBlobUrlRef.current;
    const validBlobUrlsRefCurrent = validBlobUrlsRef.current;

    return () => {
      logger.log('[AvatarManager] Component unmounting, starting cleanup...');

      // Copy ref values at cleanup time to avoid stale closure issues
      const currentUrl = currentBlobUrlRefCurrent;
      const validUrls = Array.from(validBlobUrlsRefCurrent);

      // Queue current blob URL for cleanup
      if (currentUrl) {
        queueBlobForCleanup(currentUrl);
        currentBlobUrlRef.current = null;
      }

      // Queue all remaining blob URLs for cleanup
      validUrls.forEach(url => {
        queueBlobForCleanup(url);
      });
      validBlobUrlsRefCurrent.clear();

      // Process the cleanup queue
      processCleanupQueue();

      logger.log('[AvatarManager] Cleanup queue processed on unmount');
    };
  }, [queueBlobForCleanup, processCleanupQueue]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      logger.log('[AvatarManager] File select triggered');
      const file = event.target.files?.[0];
      if (!file) {
        logger.log('[AvatarManager] No file selected');
        return;
      }

      // Prevent duplicate processing if already processing (StrictMode guard)
      if (isProcessing || isProcessingRef.current) {
        logger.log('[AvatarManager] Already processing, ignoring duplicate file select');
        return;
      }
      isProcessingRef.current = true;

      logger.log('[AvatarManager] File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      setProcessingError(null);
      setIsProcessing(true);
      setFinalCompressedFile(null);

      try {
        const options = {
          maxSizeMB: 10,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8,
        };
        // Show specific message for HEIC files during compression
        const isHEIC =
          file.type.includes('heic') ||
          file.type.includes('heif') ||
          file.name.toLowerCase().includes('.heic') ||
          file.name.toLowerCase().includes('.heif');
        if (isHEIC) {
          logger.log('[AvatarManager] Processing HEIC file, converting to JPEG...');
        }

        const compressedFile = await imageCompression(file, options);

        // Handle filename and extension correctly after compression
        // Note: browser-image-compression converts HEIC to JPEG, so we need to use the correct extension
        const originalExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const baseFileName = file.name.replace(/\.[^/.]+$/, '') || 'image';

        // If the original was HEIC/HEIF but compression converted it to JPEG, use .jpg extension
        let finalExt = originalExt;
        if (
          (originalExt === 'heic' || originalExt === 'heif') &&
          compressedFile.type === 'image/jpeg'
        ) {
          finalExt = 'jpg';
        }

        const preservedFileName = `${baseFileName}.${finalExt}`;

        const fileWithCorrectName = new File([compressedFile], preservedFileName, {
          type: compressedFile.type ?? file.type,
        });

        logger.log('[AvatarManager] Initial compression completed:', {
          originalName: file.name,
          compressedName: compressedFile.name,
          preservedName: fileWithCorrectName.name,
          originalSize: file.size,
          compressedSize: compressedFile.size,
          finalSize: fileWithCorrectName.size,
        });

        // Create blob URL safely without immediate cleanup
        const newBlobUrl = URL.createObjectURL(fileWithCorrectName);
        currentBlobUrlRef.current = newBlobUrl;
        validBlobUrlsRef.current.add(newBlobUrl);
        logger.log('[AvatarManager] Created new preview blob URL:', newBlobUrl);

        // Update state in a single batch using queue system
        React.startTransition(() => {
          setUploadFile(fileWithCorrectName);
          setUploadState(prev => {
            // Queue previous URL for cleanup if it's different
            if (
              prev.previewUrl &&
              prev.previewUrl !== newBlobUrl &&
              prev.previewUrl.startsWith('blob:')
            ) {
              queueBlobForCleanup(prev.previewUrl);
              processCleanupQueue();
            }
            return {
              ...prev,
              previewUrl: newBlobUrl,
            };
          });
          setShowCropModal(true);
        });
      } catch (error) {
        logger.error('Error during initial image processing:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process image.';

        // Provide specific error message for HEIC files
        const isHEIC =
          file.type.includes('heic') ||
          file.type.includes('heif') ||
          file.name.toLowerCase().includes('.heic') ||
          file.name.toLowerCase().includes('.heif');
        const userFriendlyMessage = isHEIC
          ? isIOSSafari()
            ? 'HEIC file processing failed on iPad. Try taking a photo in "Most Compatible" format (Settings > Camera > Formats) or use the Files app to convert to JPEG.'
            : 'HEIC file processing failed. Please try converting to JPEG first or use a different image.'
          : errorMessage;

        setProcessingError(`Processing Error: ${userFriendlyMessage}`);
        toast({
          title: isHEIC ? 'HEIC Processing Failed' : 'Image Processing Failed',
          description: userFriendlyMessage,
          variant: 'destructive',
        });
        setUploadFile(null);
      } finally {
        setIsProcessing(false);
        isProcessingRef.current = false;
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [
      setProcessingError,
      setIsProcessing,
      setFinalCompressedFile,
      setUploadFile,
      setUploadState,
      setShowCropModal,
      toast,
      queueBlobForCleanup,
      processCleanupQueue,
      isProcessing,
    ]
  );

  const handleCropComplete = useCallback(
    async (croppedImageBase64: string): Promise<void> => {
      logger.log('[AvatarManager] Crop completed, processing...');
      setShowCropModal(false);
      if (!uploadFile) {
        logger.error('[AvatarManager] No upload file available for cropping');
        setProcessingError('Original file context lost for cropping.');
        return;
      }
      setProcessingError(null);
      setIsProcessing(true);

      try {
        // Since cropping always converts to JPEG, use .jpg extension
        const baseFileName = uploadFile.name.replace(/\.[^/.]+$/, '') || 'avatar';
        const croppedFileName = `cropped-${baseFileName}.jpg`;

        const croppedFile = dataURLtoFile(croppedImageBase64, croppedFileName);
        if (!croppedFile) {
          throw new Error('Failed to convert cropped image to file.');
        }

        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          initialQuality: 0.7,
        };
        const compressedCroppedFile = await imageCompression(croppedFile, options);

        // Ensure the compressed file has the correct name and extension (JPEG)
        const finalFileName = `avatar-${Date.now()}.jpg`;
        const finalFile = new File([compressedCroppedFile], finalFileName, {
          type: compressedCroppedFile.type ?? 'image/jpeg',
        });

        logger.log('[AvatarManager] Crop and compression completed:', {
          uploadFileName: uploadFile.name,
          croppedFileName: croppedFile.name,
          compressedFileName: compressedCroppedFile.name,
          finalFileName: finalFile.name,
          finalType: finalFile.type,
          finalSize: finalFile.size,
        });

        // Create blob URL safely without immediate cleanup
        const newBlobUrl = URL.createObjectURL(finalFile);
        currentBlobUrlRef.current = newBlobUrl;
        validBlobUrlsRef.current.add(newBlobUrl);
        logger.log('[AvatarManager] Created new cropped blob URL:', newBlobUrl);

        // Update state in a single batch using queue system
        React.startTransition(() => {
          setFinalCompressedFile(finalFile);
          setUploadState(prev => {
            // Queue previous URLs for cleanup if they're different
            if (
              prev.previewUrl &&
              prev.previewUrl !== newBlobUrl &&
              prev.previewUrl.startsWith('blob:')
            ) {
              queueBlobForCleanup(prev.previewUrl);
            }
            if (
              prev.croppedImageUrl &&
              prev.croppedImageUrl !== newBlobUrl &&
              prev.croppedImageUrl.startsWith('blob:')
            ) {
              queueBlobForCleanup(prev.croppedImageUrl);
            }
            processCleanupQueue();
            return {
              ...prev,
              previewUrl: newBlobUrl,
              croppedImageUrl: newBlobUrl,
            };
          });
        });
        toast({
          title: 'Image Cropped & Compressed',
          description: 'Ready to save.',
        });
      } catch (error) {
        logger.error('Error during final image processing:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to process cropped image.';

        setProcessingError(`Processing Error: ${errorMessage}`);
        toast({
          title: 'Cropping/Compression Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        setFinalCompressedFile(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      uploadFile,
      setShowCropModal,
      setProcessingError,
      setIsProcessing,
      setFinalCompressedFile,
      setUploadState,
      toast,
      queueBlobForCleanup,
      processCleanupQueue,
    ]
  );

  const handleSave = useCallback(async (): Promise<void> => {
    logger.log('[AvatarManager] Starting avatar save process');
    setIsProcessing(true);
    setProcessingError(null);

    try {
      if (!finalCompressedFile) {
        logger.error('[AvatarManager] No compressed file available');
        setProcessingError('No image file is ready for upload.');
        toast({
          title: 'Upload Error',
          description: 'No image file selected or processed.',
          variant: 'destructive',
        });
        return;
      }

      logger.log('[AvatarManager] Uploading file directly to PocketBase:', {
        name: finalCompressedFile.name,
        size: finalCompressedFile.size,
        type: finalCompressedFile.type,
      });

      // Get user ID
      const userId = pb.authStore.record?.id;
      if (!userId) {
        throw new Error('User ID not found. Unable to upload avatar.');
      }

      // Upload directly to PocketBase using FormData
      const formData = new FormData();
      formData.append('avatar', finalCompressedFile);

      const updatedUser = await pb.collection('users').update(userId, formData);
      logger.log('[AvatarManager] Upload completed successfully');

      // Create the avatar URL from the updated user record
      const uploadedUrl = updatedUser.avatar
        ? pb.files.getURL(updatedUser, updatedUser.avatar)
        : null;

      if (!uploadedUrl) {
        throw new Error('Upload completed but no avatar URL was generated.');
      }

      const avatarConfig: AvatarConfig = {
        type: 'upload',
        uploadUrl: uploadedUrl,
      };

      logger.log('[AvatarManager] Calling onAvatarUpdate with config:', avatarConfig);

      await onAvatarUpdate(avatarConfig);
      onClose();
    } catch (error) {
      logger.error('Upload error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred during upload.';

      setProcessingError(`Upload Failed: ${errorMessage}`);
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [finalCompressedFile, setIsProcessing, setProcessingError, toast, onAvatarUpdate, onClose]);

  const handleRemoveAvatar = useCallback(async (): Promise<void> => {
    const avatarConfig: AvatarConfig = {
      type: 'initials',
    };
    await onAvatarUpdate(avatarConfig);
    onClose();
  }, [onAvatarUpdate, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px] md:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Manage Your Avatar</DialogTitle>
          <DialogDescription>
            Upload and manage your profile avatar. You can upload an image, crop it to fit, and save
            it to your profile.
          </DialogDescription>
        </DialogHeader>

        {/* Preview Section */}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 items-center gap-4">
            <Label htmlFor="avatar-preview" className="sr-only text-center">
              Avatar Preview
            </Label>
            <div className="col-span-1 flex min-h-[160px] min-w-[160px] items-center justify-center rounded-md border border-dashed p-4">
              {/* Loading state */}
              {isProcessing && <Loader2 className="h-12 w-12 animate-spin text-primary" />}

              {/* Preview */}
              {!isProcessing && uploadState.previewUrl && (
                <div className="h-32 w-32 overflow-hidden rounded-full border-2 border-border bg-muted">
                  <img
                    key={uploadState.previewUrl} // Force remount when URL changes
                    src={uploadState.previewUrl}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                    onLoad={() =>
                      logger.log(
                        '[AvatarManager] Preview image loaded successfully:',
                        uploadState.previewUrl
                      )
                    }
                    onError={e => {
                      const img = e.target as HTMLImageElement;
                      const failedUrl = img.src;
                      logger.error('[AvatarManager] Preview image failed to load:', failedUrl);
                      logger.error('[AvatarManager] Failed image element:', {
                        src: img.src,
                        currentSrc: img.currentSrc,
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        isKnownBlob: validBlobUrlsRef.current.has(failedUrl),
                        expectedUrl: uploadState.previewUrl,
                        urlsMatch: failedUrl === uploadState.previewUrl,
                      });

                      // Use React state to handle error instead of direct DOM manipulation
                      setUploadState(prev => ({
                        ...prev,
                        previewUrl: undefined,
                      }));

                      // Queue failed blob URL for cleanup
                      if (failedUrl && failedUrl.startsWith('blob:')) {
                        queueBlobForCleanup(failedUrl);
                        processCleanupQueue();
                      }
                    }}
                  />
                </div>
              )}

              {/* Placeholder */}
              {!isProcessing && !uploadState.previewUrl && (
                <div className="text-center text-muted-foreground">
                  <UploadCloud className="mx-auto h-12 w-12" />
                  <p>Upload an image to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="space-y-4 rounded-md border p-4 text-center">
          <div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || imageUploadHook.uploading || showCropModal}
            >
              {isProcessing && !showCropModal ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              Choose Image
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={
                isIOSSafari()
                  ? 'image/png, image/jpeg, image/webp, image/gif'
                  : 'image/png, image/jpeg, image/webp, image/gif, image/heic, image/heif'
              }
              style={{ display: 'none' }}
              disabled={isProcessing || imageUploadHook.uploading || showCropModal}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Max file size: 50MB. JPG, PNG, GIF, WEBP{isIOSSafari() ? '' : ', HEIC'}.
            </p>
          </div>

          {uploadState.previewUrl && !showCropModal && uploadFile && (
            <Button
              onClick={() => setShowCropModal(true)}
              variant="outline"
              disabled={isProcessing || imageUploadHook.uploading}
            >
              Crop Image
            </Button>
          )}

          {currentConfig?.type === 'upload' && (
            <Button
              onClick={handleRemoveAvatar}
              variant="outline"
              disabled={isProcessing || imageUploadHook.uploading}
            >
              Remove Avatar
            </Button>
          )}
        </div>

        {/* Error Display */}
        {(processingError || imageUploadHook.error) && (
          <div className="mt-4 flex items-center rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error</p>
              {processingError && <p>{processingError}</p>}
              {imageUploadHook.error && <p>{imageUploadHook.error}</p>}
            </div>
          </div>
        )}

        {/* Success Display */}
        {finalCompressedFile && !processingError && !imageUploadHook.error && (
          <div className="mt-4 flex items-center rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700">
            <CheckCircle className="mr-2 h-5 w-5 flex-shrink-0" />
            <p>Image processed and ready! See preview above</p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={() => {
              logger.log('[AvatarManager] Save button clicked');
              logger.log('[AvatarManager] Button state:', {
                isProcessing,
                hasFinalFile: !!finalCompressedFile,
                hasError: !!processingError,
                isUploading: imageUploadHook.uploading,
              });
              handleSave();
            }}
            disabled={
              isProcessing || !finalCompressedFile || !!processingError || imageUploadHook.uploading
            }
          >
            {(isProcessing || imageUploadHook.uploading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Avatar
          </Button>
        </DialogFooter>
      </DialogContent>

      {showCropModal && uploadFile && (
        <ImageCropModal
          file={uploadFile}
          imageUrl={uploadState.previewUrl}
          onCropComplete={handleCropComplete}
          onCancel={() => setShowCropModal(false)}
        />
      )}
    </Dialog>
  );
}
