import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ProjectImageSectionProps {
  imageUrl?: string;
  isUploading: boolean;
  uploadError?: string | null;
  selectedFileName?: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
}

export const ProjectImageSection: React.FC<ProjectImageSectionProps> = ({
  imageUrl,
  isUploading,
  uploadError,
  selectedFileName,
  onImageChange,
  onImageRemove,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Create thumbnail from selected file
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        setThumbnailUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      onImageChange(e);
    }
  };

  // Clear thumbnail when removing image
  const handleRemoveImage = () => {
    setThumbnailUrl(null);
    onImageRemove();
  };

  // Initialize thumbnail with existing image URL if present
  useEffect(() => {
    if (imageUrl && !selectedFileName) {
      setThumbnailUrl(imageUrl);
    } else if (!imageUrl) {
      setThumbnailUrl(null);
    }
  }, [imageUrl, selectedFileName]);

  const displayImageUrl = thumbnailUrl || imageUrl;

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <Label className="text-base font-medium">Project Image</Label>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Current Project Image Section */}
        <div className="flex h-48 flex-col rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-3 text-center">
            <h3 className="mb-2 text-sm font-medium text-foreground">Current Project Image</h3>
            <p className="text-xs text-muted-foreground">
              Replace this image by uploading a new one
            </p>
          </div>

          <div className="flex flex-1 items-center justify-center">
            {displayImageUrl ? (
              <div className="flex items-center gap-3">
                <div className="h-24 w-24 overflow-hidden rounded-md border border-border bg-background">
                  <img
                    src={displayImageUrl}
                    alt="Project preview"
                    className="h-full w-full object-cover"
                    onError={e => {
                      e.currentTarget.src = 'https://placehold.co/96x96/f1f5f9/64748b?text=Error';
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={isUploading}
                  className="flex-shrink-0 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/10">
                <div className="text-center">
                  <Upload className="mx-auto mb-1 h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No image</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload New Image Section */}
        <div className="flex h-48 flex-col rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-4 text-center">
            <h3 className="mb-2 text-sm font-medium text-foreground">Upload New Image</h3>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Maximum file size: 10MB</p>
              <p>Supported formats: JPG, PNG, GIF, WebP</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center space-y-3">
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="relative w-32 border-primary bg-primary text-primary-foreground hover:border-primary/90 hover:bg-primary/90"
                disabled={isUploading}
              >
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Choose File
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={handleFileSelection}
                  disabled={isUploading}
                />
              </Button>
            </div>

            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                {isUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Uploading...
                  </span>
                ) : selectedFileName ? (
                  <span className="block max-w-full truncate" title={selectedFileName}>
                    {selectedFileName}
                  </span>
                ) : (
                  'No file chosen'
                )}
              </span>
            </div>

            {uploadError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2">
                <p className="text-center text-xs text-destructive">{uploadError}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center rounded-lg border border-border bg-background p-6 shadow-lg">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            <span className="text-sm font-medium">Uploading image...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectImageSection;
