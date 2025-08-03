import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2 } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AVATAR_CONSTANTS } from '@/components/projects/ProgressNoteForm/constants';
import { logger } from '@/utils/logger';

interface AvatarUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAvatarUploaded: (url: string) => void;
}

export function AvatarUploadDialog({
  isOpen,
  onOpenChange,
  onAvatarUploaded,
}: AvatarUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { file, preview, uploading, error, handleImageChange, upload } = useImageUpload(
    'avatars',
    'avatar'
  );

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileSizeMB = Math.round((selectedFile.size / (1024 * 1024)) * 100) / 100; // Round to 2 decimal places
      logger.debug(
        `Avatar file selected: ${selectedFile.name} (${fileSizeMB}MB, type: ${selectedFile.type})`
      );

      // Check original file size against the maximum allowed for upload
      if (selectedFile.size > AVATAR_CONSTANTS.MAX_ORIGINAL_FILE_SIZE) {
        const maxOriginalSizeMB = Math.round(
          AVATAR_CONSTANTS.MAX_ORIGINAL_FILE_SIZE / (1024 * 1024)
        );
        toast({
          title: 'File Too Large',
          description: `Avatar image is ${fileSizeMB}MB, which exceeds the ${maxOriginalSizeMB}MB upload limit. Please choose a smaller image.`,
          variant: 'destructive',
        });
        // Reset the input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate file type
      if (
        !selectedFile.type.startsWith('image/') ||
        !(AVATAR_CONSTANTS.ACCEPTED_FILE_TYPES as readonly string[]).includes(selectedFile.type)
      ) {
        toast({
          title: 'Unsupported File Type',
          description: `File type "${selectedFile.type || 'unknown'}" is not supported. Please use JPG, PNG, GIF, WebP, or HEIC format.`,
          variant: 'destructive',
        });
        // Reset the input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
    }
    // If validation passes, proceed with the original handler
    handleImageChange(e);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select an image file first.',
        variant: 'destructive',
      });
      return;
    }

    // Note: The processed file size validation will be handled by the useImageUpload hook
    // which should resize the image and validate against AVATAR_CONSTANTS.MAX_FILE_SIZE

    try {
      const userId = user?.id;
      if (!userId) {
        toast({
          title: 'Error',
          description: 'User ID not found. Unable to upload avatar.',
          variant: 'destructive',
        });
        return;
      }
      const url = await upload(userId);
      if (url) {
        onAvatarUploaded(url);
        onOpenChange(false);
        toast({
          title: 'Avatar uploaded successfully',
          description: 'Your new avatar has been saved.',
        });
      }
    } catch (error) {
      logger.error('Error uploading avatar:', error);
      // Error handling is already done in the useImageUpload hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Avatar</DialogTitle>
          <DialogDescription>
            Upload a custom image for your avatar. Choose an image file and it will be processed and
            optimized automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="avatar-file">Choose an image file</Label>
            <p className="text-sm text-muted-foreground">
              Upload an image under{' '}
              {Math.round(AVATAR_CONSTANTS.MAX_ORIGINAL_FILE_SIZE / (1024 * 1024))}MB. The image
              will be processed and optimized to{' '}
              {Math.round(AVATAR_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024))}MB. Supported formats:
              JPG, PNG, GIF, WebP, HEIC.
            </p>
            <Input
              id="avatar-file"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              ref={fileInputRef}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleFileSelect}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Image File
            </Button>
          </div>

          {preview && (
            <div className="flex justify-center">
              <div className="h-32 w-32 overflow-hidden rounded-full border-2 border-muted">
                <img src={preview} alt="Avatar preview" className="h-full w-full object-cover" />
              </div>
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Avatar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
