import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Maximize, Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ImageErrorBoundary } from '@/components/error/ComponentErrorBoundaries';
import { isPlaceholderImage } from '@/utils/imageUtils';
import { useImageLoader } from '@/hooks/useImageLoader';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import FallbackImage from './FallbackImage';

interface ImageGalleryProps {
  imageUrl: string;
  alt: string;
  instagramStyle?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ImageGallery = ({
  imageUrl,
  alt,
  instagramStyle = false,
  size = 'medium',
}: ImageGalleryProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Use the improved image loader
  const {
    imageUrl: processedImageUrl,
    isLoading,
    error,
    retry,
  } = useImageLoader({
    src: imageUrl,
  });

  // Check if we should use fallback immediately
  const shouldUseFallback =
    !imageUrl || imageUrl.includes('example.com') || isPlaceholderImage(imageUrl);

  if (!imageUrl) return null;

  // Calculate max size for different variants
  const maxSize = {
    small: 'max-w-[200px]',
    medium: 'max-w-[400px]',
    large: 'max-w-[500px]',
  }[size];

  const renderImageContent = (isModal = false) => {
    const imageClasses = isModal
      ? 'w-full h-auto max-h-[80vh] object-contain mx-auto'
      : 'w-full h-full object-cover transition-transform group-hover:scale-105 duration-300';

    if (shouldUseFallback) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 p-4 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <div className="mb-2 text-gray-400">
            <ImageIcon className="mx-auto h-12 w-12" />
          </div>
          <p className="text-center text-sm">No image available</p>
          <p className="mt-1 text-center text-xs text-gray-400">
            URL: {imageUrl ? imageUrl.substring(0, 50) + '...' : 'None'}
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-secondary/50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error || !processedImageUrl) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 p-4 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <div className="mb-2 text-gray-400">
            <ImageIcon className="mx-auto h-12 w-12" />
          </div>
          <p className="text-center text-sm">Image failed to load</p>
          <p className="mt-1 text-center text-xs text-gray-400">
            {error?.message || 'Unknown error'}
          </p>
          <button
            className="mt-2 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            onClick={retry}
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </button>
        </div>
      );
    }

    return (
      <img
        src={processedImageUrl}
        alt={alt}
        className={imageClasses}
        loading="lazy"
        onError={() => {
          console.error('Image render error:', processedImageUrl);
          // Instead of hiding, trigger retry logic
          if (!error) {
            console.log('Triggering retry from image onError');
            retry();
          }
        }}
      />
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <div className={`group relative cursor-pointer ${maxSize} mx-auto`}>
          <div
            className={`w-full overflow-hidden rounded-lg ${instagramStyle ? 'aspect-square' : ''}`}
          >
            <AspectRatio ratio={1} className="w-full">
              <ImageErrorBoundary alt={alt} originalUrl={imageUrl}>
                {renderImageContent(false)}
              </ImageErrorBoundary>
            </AspectRatio>
          </div>
          {!shouldUseFallback && !error && processedImageUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </DialogTrigger>

      <DialogContent className="image-gallery-dialog max-w-4xl border-0 bg-transparent p-0 shadow-none">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Image Gallery</DialogTitle>
            <DialogDescription>
              View a larger version of the image. Press Escape or click outside to close.
            </DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        <div className="w-full rounded-lg bg-black/90 p-2">
          <ImageErrorBoundary alt={alt} originalUrl={imageUrl}>
            {shouldUseFallback ? (
              <FallbackImage alt={alt} originalUrl={imageUrl} className="max-h-[80vh]" />
            ) : (
              <div className="relative">
                {renderImageContent(true)}
                {(error || !processedImageUrl) && (
                  <div className="absolute right-2 top-2 flex gap-2">
                    <button
                      onClick={retry}
                      className="rounded-full bg-background/80 p-2 transition-colors hover:bg-background/90"
                      title="Retry loading image"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                    {processedImageUrl && (
                      <a
                        href={processedImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-background/80 p-2 transition-colors hover:bg-background/90"
                        title="Open image in new tab"
                      >
                        <Maximize className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </ImageErrorBoundary>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageGallery;
