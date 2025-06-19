import React from 'react';
import FormField from './FormField';
import ImageUpload from './ImageUpload';
import { Button } from '@/components/ui/button';

interface ProjectFormImageProps {
  imageUrl?: string;
  imagePreview?: string | '';
  isUploading: boolean;
  uploadError?: string | undefined;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
}

const ProjectFormImage: React.FC<ProjectFormImageProps> = ({
  imageUrl,
  imagePreview,
  isUploading,
  uploadError,
  onImageChange,
  onImageRemove,
}) => {
  const hasImage = !!imageUrl || (!!imagePreview && imagePreview !== '');

  return (
    <FormField id="project-image" label="Project Image">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {hasImage && (
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-start space-x-4">
              <div className="relative h-36 w-36 overflow-hidden rounded-md border border-border">
                <img
                  src={imagePreview && imagePreview !== '' ? imagePreview : imageUrl || ''}
                  alt="Project preview"
                  className="h-full w-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 rounded-full"
                  onClick={onImageRemove}
                  disabled={isUploading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>
              <div>
                <p className="text-sm font-medium">
                  {imagePreview ? 'New Image Selected' : 'Current Project Image'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {imagePreview
                    ? 'This image will replace any existing project image when you save'
                    : 'Replace this image by uploading a new one'}
                </p>
                {isUploading && <p className="mt-1 text-xs text-blue-500">Uploading image...</p>}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border border-border bg-card p-4">
          <ImageUpload
            onImageChange={onImageChange}
            uploadError={uploadError || undefined}
            uploadContext="project-image"
          />
        </div>
      </div>
    </FormField>
  );
};

export default ProjectFormImage;
