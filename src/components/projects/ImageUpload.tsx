import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { CompressionProgress } from '@/components/projects/ProgressNoteForm/types';

interface ImageUploadProps {
  imageFile: File | null;
  isCompressing: boolean;
  compressionProgress: CompressionProgress | null;
  disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  imageFile,
  isCompressing,
  compressionProgress,
  disabled,
  onChange,
  error,
}) => {
  return (
    <div>
      <Label htmlFor="note-image">Photo (optional)</Label>
      <Input
        id="note-image"
        type="file"
        accept="image/*"
        onChange={onChange}
        className={cn('cursor-pointer', disabled && 'cursor-not-allowed opacity-50')}
        disabled={disabled}
      />

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

      {/* Image File Info */}
      {imageFile && !isCompressing && (
        <p className="mt-2 text-xs text-muted-foreground">
          Selected: {imageFile.name} ({Math.round((imageFile.size / (1024 * 1024)) * 100) / 100}MB)
        </p>
      )}

      {/* Error message */}
      {error && (
        <p
          id="image-error"
          className="mt-2 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};
