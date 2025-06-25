import React, { useState, useRef, useEffect } from 'react';
import { useOptimizedImage, useProgressiveImage } from '@/hooks/useOptimizedImage';
import { ImageService, type ImageSizeKey } from '@/services/ImageService';
import SafeImage from '@/components/projects/SafeImage';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('OptimizedImage');

interface OptimizedImageProps {
  record: Record<string, unknown> & { id: string };
  filename: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  size?: ImageSizeKey | string;
  context?: 'gallery' | 'card' | 'modal' | 'detail' | 'avatar';
  progressive?: boolean;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onClick?: () => void;
}

/**
 * OptimizedImage component that uses PocketBase thumbnails for better performance
 * Builds on SafeImage's retry logic while adding optimization and progressive loading
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  record,
  filename,
  alt,
  className = '',
  fallbackClassName = '',
  size,
  context = 'card',
  progressive = false,
  lazy = true,
  onLoad,
  onError,
  onClick,
}) => {
  const [hasIntersected, setHasIntersected] = useState(!lazy);
  const imgRef = useRef<HTMLDivElement>(null);

  // Use optimized image hook for single size
  const singleImageQuery = useOptimizedImage({
    record,
    filename,
    size,
    context,
    enabled: !progressive && hasIntersected,
  });

  // Use progressive image hook for multi-stage loading
  const progressiveImageQuery = useProgressiveImage({
    record,
    filename,
    enabled: progressive && hasIntersected,
  });

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || hasIntersected) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasIntersected(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before visible
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, hasIntersected]);

  // Determine which image URL to use
  const getImageUrl = (): string | undefined => {
    if (progressive) {
      // For progressive loading, use placeholder first, then full quality
      return progressiveImageQuery.fullQualityUrl || progressiveImageQuery.placeholderUrl;
    }
    return singleImageQuery.imageUrl;
  };

  // Determine loading state
  const isLoading = progressive 
    ? progressiveImageQuery.isPlaceholderLoading
    : singleImageQuery.isLoading;

  // Determine error state
  const error = progressive 
    ? null // Progressive loading handles errors gracefully
    : singleImageQuery.error;

  // Handle progressive loading upgrade
  const handleProgressiveUpgrade = React.useCallback(() => {
    if (progressive && progressiveImageQuery.placeholderUrl && !progressiveImageQuery.fullQualityUrl) {
      progressiveImageQuery.loadFullQuality();
    }
  }, [progressive, progressiveImageQuery]);

  // Auto-upgrade progressive images after placeholder loads
  useEffect(() => {
    if (progressive && progressiveImageQuery.placeholderUrl && !progressiveImageQuery.isPlaceholderLoading) {
      // Delay full quality load slightly to ensure placeholder is visible
      const timer = setTimeout(handleProgressiveUpgrade, 100);
      return () => clearTimeout(timer);
    }
  }, [progressive, progressiveImageQuery.placeholderUrl, progressiveImageQuery.isPlaceholderLoading, handleProgressiveUpgrade]);

  const imageUrl = getImageUrl();

  // Generate fallback URLs for SafeImage
  const generateFallbackUrl = (): string => {
    if (!record || !filename) return '';
    return ImageService.getFullResolutionUrl(record, filename);
  };

  // Don't render if no record or filename
  if (!record || !filename) {
    return null;
  }

  return (
    <div
      ref={imgRef}
      className={`optimized-image-container ${className}`}
      onClick={onClick}
    >
      {!hasIntersected ? (
        // Lazy loading placeholder
        <div className={`animate-pulse bg-muted ${className}`}>
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </div>
      ) : (
        <SafeImage
          src={imageUrl}
          alt={alt}
          className={className}
          fallbackClassName={fallbackClassName}
          onLoad={() => {
            logger.debug('Optimized image loaded', {
              recordId: record.id,
              filename,
              size: size || context,
              progressive,
              url: imageUrl,
            });
            onLoad?.();
          }}
          onError={(err) => {
            logger.warn('Optimized image failed, falling back', {
              recordId: record.id,
              filename,
              error: err.message,
            });
            onError?.(err);
          }}
          refreshSignedUrl={async () => {
            // For PocketBase, we can try to regenerate the URL
            if (progressive) {
              progressiveImageQuery.loadFullQuality();
              return progressiveImageQuery.fullQualityUrl || generateFallbackUrl();
            } else {
              singleImageQuery.refetch();
              return singleImageQuery.imageUrl || generateFallbackUrl();
            }
          }}
        />
      )}
      
      {/* Progressive loading enhancement overlay */}
      {progressive && progressiveImageQuery.placeholderUrl && progressiveImageQuery.isFullQualityLoading && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
          <div className="text-xs text-white bg-black/50 px-2 py-1 rounded">
            Enhancing...
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Gallery-optimized image component with automatic preloading
 */
interface GalleryImageProps extends Omit<OptimizedImageProps, 'context' | 'size'> {
  index?: number;
  totalImages?: number;
}

export const GalleryImage: React.FC<GalleryImageProps> = ({
  record,
  filename,
  alt,
  className = 'w-full h-32 object-cover rounded',
  index,
  totalImages,
  ...props
}) => {
  return (
    <OptimizedImage
      record={record}
      filename={filename}
      alt={alt}
      className={className}
      context="gallery"
      size="thumbnail"
      lazy={true}
      {...props}
    />
  );
};

/**
 * Card-optimized image component for project cards
 */
type CardImageProps = Omit<OptimizedImageProps, 'context' | 'size'>;

export const CardImage: React.FC<CardImageProps> = ({
  record,
  filename,
  alt,
  className = 'w-full h-48 object-cover',
  ...props
}) => {
  return (
    <OptimizedImage
      record={record}
      filename={filename}
      alt={alt}
      className={className}
      context="card"
      size="card"
      lazy={true}
      {...props}
    />
  );
};

/**
 * Modal-optimized image component for detailed viewing
 */
type ModalImageProps = Omit<OptimizedImageProps, 'context' | 'progressive'>;

export const ModalImage: React.FC<ModalImageProps> = ({
  record,
  filename,
  alt,
  className = 'w-full h-auto max-h-[80vh] object-contain',
  ...props
}) => {
  return (
    <OptimizedImage
      record={record}
      filename={filename}
      alt={alt}
      className={className}
      context="modal"
      size="large"
      progressive={true}
      lazy={false} // Don't lazy load in modals
      {...props}
    />
  );
};

export default OptimizedImage;