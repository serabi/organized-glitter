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
  // Progressive loading enhancement options
  transitionType?: 'fade' | 'crossfade' | 'blur-to-sharp';
  transitionDuration?: number;
  showQualityIndicator?: boolean;
  showProgressBar?: boolean;
  autoUpgrade?: boolean;
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
  // Progressive enhancement options with defaults
  transitionType = 'fade',
  transitionDuration = 300,
  showQualityIndicator = false,
  showProgressBar = false,
  autoUpgrade = true,
}) => {
  const [hasIntersected, setHasIntersected] = useState(!lazy);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [placeholderLoaded, setPlaceholderLoaded] = useState(false);
  const [fullQualityLoaded, setFullQualityLoaded] = useState(false);
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
    context,
    strategy: 'contextual', // Use context-aware progressive loading
  });

  // Enhanced Intersection Observer for smart loading triggers
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
        rootMargin: progressive ? '100px' : '50px', // Larger margin for progressive images
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, hasIntersected, progressive]);

  // Smart quality upgrade trigger based on visibility
  useEffect(() => {
    if (!progressive || !hasIntersected || !placeholderLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Trigger quality upgrade when image is 80% visible
        if (entry.intersectionRatio >= 0.8 && !isTransitioning) {
          handleProgressiveUpgrade();
        }
      },
      {
        threshold: [0.5, 0.8, 1.0], // Multiple thresholds for precise triggering
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [progressive, hasIntersected, placeholderLoaded, isTransitioning, handleProgressiveUpgrade]);

  // Hover-based quality upgrade for desktop users
  useEffect(() => {
    if (!progressive || !hasIntersected || !placeholderLoaded) return;

    const handleMouseEnter = () => {
      if (!isTransitioning && !fullQualityLoaded) {
        // Prefetch next quality level on hover
        if (progressiveImageQuery.hasMediumQuality && !progressiveImageQuery.mediumQualityUrl) {
          progressiveImageQuery.prefetchMediumQuality();
        } else {
          progressiveImageQuery.prefetchHighQuality();
        }
      }
    };

    const element = imgRef.current;
    if (element && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      element.addEventListener('mouseenter', handleMouseEnter);
      return () => element.removeEventListener('mouseenter', handleMouseEnter);
    }
  }, [
    progressive,
    hasIntersected,
    placeholderLoaded,
    isTransitioning,
    fullQualityLoaded,
    progressiveImageQuery,
  ]);

  // Determine which image URL to use based on loading state
  const getImageUrl = (): string | undefined => {
    if (progressive) {
      // For progressive loading, use the highest quality available
      return (
        progressiveImageQuery.fullQualityUrl ||
        progressiveImageQuery.mediumQualityUrl ||
        progressiveImageQuery.placeholderUrl
      );
    }
    return singleImageQuery.imageUrl;
  };

  // Handle progressive loading upgrade with smart quality selection
  const handleProgressiveUpgrade = React.useCallback(() => {
    if (progressive && progressiveImageQuery.placeholderUrl) {
      // Use the smart loading function that chooses appropriate next quality level
      progressiveImageQuery.loadNextQuality();
    }
  }, [progressive, progressiveImageQuery]);

  // Enhanced auto-upgrade logic with transition management
  useEffect(() => {
    if (
      progressive &&
      autoUpgrade &&
      progressiveImageQuery.placeholderUrl &&
      !progressiveImageQuery.isPlaceholderLoading
    ) {
      setPlaceholderLoaded(true);
      // Delay full quality load to ensure placeholder is visible and provide smooth transition
      const timer = setTimeout(
        () => {
          setIsTransitioning(true);
          handleProgressiveUpgrade();
        },
        Math.max(100, transitionDuration / 3)
      );
      return () => clearTimeout(timer);
    }
  }, [
    progressive,
    autoUpgrade,
    progressiveImageQuery.placeholderUrl,
    progressiveImageQuery.isPlaceholderLoading,
    handleProgressiveUpgrade,
    transitionDuration,
  ]);

  // Handle full quality load completion
  useEffect(() => {
    if (
      progressive &&
      progressiveImageQuery.fullQualityUrl &&
      !progressiveImageQuery.isFullQualityLoading
    ) {
      setFullQualityLoaded(true);
      // End transition after a brief delay
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, transitionDuration / 2);
      return () => clearTimeout(timer);
    }
  }, [
    progressive,
    progressiveImageQuery.fullQualityUrl,
    progressiveImageQuery.isFullQualityLoading,
    transitionDuration,
  ]);

  const imageUrl = getImageUrl();

  // Generate fallback URLs for SafeImage
  const generateFallbackUrl = (): string => {
    if (!record || !filename) return '';
    return ImageService.getFullResolutionUrl(record, filename);
  };

  // Helper function to get transition CSS classes
  const getTransitionClasses = (): string => {
    if (!progressive) return '';

    switch (transitionType) {
      case 'crossfade':
        return 'progressive-crossfade';
      case 'blur-to-sharp':
        return `progressive-blur-to-sharp ${fullQualityLoaded ? 'loaded' : ''}`;
      case 'fade':
      default:
        return `progressive-fade-in ${placeholderLoaded ? 'loaded' : ''}`;
    }
  };

  // Get current quality level for indicator
  const getCurrentQuality = (): string => {
    if (!progressive) return 'optimized';
    if (progressiveImageQuery.fullQualityUrl && fullQualityLoaded) return 'high';
    if (
      progressiveImageQuery.mediumQualityUrl &&
      progressiveImageQuery.mediumQualityUrl === getImageUrl()
    )
      return 'medium';
    if (placeholderLoaded) return 'low';
    return 'loading';
  };

  // Get progress bar state
  const getProgressBarState = (): string => {
    if (!progressive) return '';
    if (fullQualityLoaded) return 'complete';
    if (
      progressiveImageQuery.mediumQualityUrl &&
      progressiveImageQuery.mediumQualityUrl === getImageUrl()
    )
      return 'medium';
    if (placeholderLoaded) return 'loading';
    return '';
  };

  // Don't render if no record or filename
  if (!record || !filename) {
    return null;
  }

  return (
    <div
      ref={imgRef}
      className={`optimized-image-container ${getTransitionClasses()} ${className}`}
      onClick={onClick}
      style={
        transitionDuration !== 300
          ? ({
              '--transition-duration': `${transitionDuration}ms`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {!hasIntersected ? (
        // Enhanced lazy loading placeholder
        <div className={`progressive-placeholder ${className}`}>
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </div>
      ) : transitionType === 'crossfade' && progressive ? (
        // Crossfade transition: render both images with overlay management
        <>
          {/* Placeholder layer */}
          {progressiveImageQuery.placeholderUrl && (
            <div className={`image-layer placeholder ${placeholderLoaded ? 'loaded' : ''}`}>
              <SafeImage
                src={progressiveImageQuery.placeholderUrl}
                alt={alt}
                className={className}
                fallbackClassName={fallbackClassName}
                onLoad={() => {
                  setPlaceholderLoaded(true);
                  logger.debug('Progressive placeholder loaded', {
                    recordId: record.id,
                    filename,
                    quality: 'thumbnail',
                  });
                }}
                onError={err => {
                  logger.warn('Progressive placeholder failed', {
                    recordId: record.id,
                    filename,
                    error: err.message,
                  });
                  onError?.(err);
                }}
              />
            </div>
          )}

          {/* Full quality layer */}
          {progressiveImageQuery.fullQualityUrl && (
            <div className={`image-layer full-quality ${fullQualityLoaded ? 'loaded' : ''}`}>
              <SafeImage
                src={progressiveImageQuery.fullQualityUrl}
                alt={alt}
                className={className}
                fallbackClassName={fallbackClassName}
                onLoad={() => {
                  setFullQualityLoaded(true);
                  logger.debug('Progressive full quality loaded', {
                    recordId: record.id,
                    filename,
                    quality: 'high',
                  });
                  onLoad?.();
                }}
                onError={err => {
                  logger.warn('Progressive full quality failed', {
                    recordId: record.id,
                    filename,
                    error: err.message,
                  });
                  onError?.(err);
                }}
                refreshSignedUrl={async () => {
                  progressiveImageQuery.loadFullQuality();
                  return progressiveImageQuery.fullQualityUrl || generateFallbackUrl();
                }}
              />
            </div>
          )}
        </>
      ) : (
        // Single image with fade or blur-to-sharp transitions
        <SafeImage
          src={imageUrl}
          alt={alt}
          className={className}
          fallbackClassName={fallbackClassName}
          onLoad={() => {
            if (progressive) {
              if (imageUrl === progressiveImageQuery.placeholderUrl) {
                setPlaceholderLoaded(true);
              } else if (imageUrl === progressiveImageQuery.mediumQualityUrl) {
                // Medium quality loaded, trigger next upgrade after brief delay
                setTimeout(() => progressiveImageQuery.loadFullQuality(), 1000);
              } else if (imageUrl === progressiveImageQuery.fullQualityUrl) {
                setFullQualityLoaded(true);
              }
            }
            logger.debug('Optimized image loaded', {
              recordId: record.id,
              filename,
              size: size || context,
              progressive,
              quality: getCurrentQuality(),
              url: imageUrl,
            });
            onLoad?.();
          }}
          onError={err => {
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

      {/* Enhanced loading overlay with quality indicator and accessibility */}
      {progressive && isTransitioning && (
        <div
          className={`progressive-loading-overlay ${!isTransitioning ? 'hidden' : ''}`}
          role="status"
          aria-live="polite"
          aria-label={`Image quality upgrading to ${getCurrentQuality()}`}
        >
          <div className={`progressive-quality-badge ${isTransitioning ? 'upgrading' : ''}`}>
            {showQualityIndicator ? (
              <>
                <span className="sr-only">Image quality: </span>
                {getCurrentQuality()}
                {isTransitioning && <span className="sr-only"> (upgrading)</span>}
              </>
            ) : (
              <>
                Enhancing...
                <span className="sr-only">Image quality is being enhanced</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Progressive loading progress bar */}
      {progressive && showProgressBar && hasIntersected && (
        <div
          className={`progressive-progress-bar ${getProgressBarState()}`}
          role="progressbar"
          aria-label="Image loading progress"
          aria-valuenow={
            fullQualityLoaded
              ? 100
              : progressiveImageQuery.mediumQualityUrl &&
                  progressiveImageQuery.mediumQualityUrl === getImageUrl()
                ? 66
                : placeholderLoaded
                  ? 33
                  : 0
          }
          aria-valuemin={0}
          aria-valuemax={100}
        />
      )}

      {/* Screen reader accessibility for progressive loading state */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {progressive &&
          placeholderLoaded &&
          !fullQualityLoaded &&
          `Progressive image: ${getCurrentQuality()} quality loaded for ${alt}`}
        {progressive &&
          fullQualityLoaded &&
          `Progressive image: High quality version loaded for ${alt}`}
      </div>
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
      transitionType="blur-to-sharp" // Best visual effect for detailed viewing
      transitionDuration={500}
      showQualityIndicator={true}
      showProgressBar={true}
      autoUpgrade={true}
      {...props}
    />
  );
};

export default OptimizedImage;
