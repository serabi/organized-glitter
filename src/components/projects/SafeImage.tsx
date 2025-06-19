import React, { useState, useCallback, useEffect, useRef } from 'react';
import FallbackImage from './FallbackImage';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  maxRetries?: number;
  refreshSignedUrl?: () => Promise<string>;
}

/**
 * Enhanced SafeImage component that gracefully handles image loading failures
 * with fallback display, retry logic, and signed URL refresh for Supabase Storage
 */
const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  onLoad,
  onError,
  retryCount = 0,
  maxRetries = 3,
  refreshSignedUrl,
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRetryCount, setCurrentRetryCount] = useState(retryCount);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Update currentSrc when src prop changes
  useEffect(() => {
    setCurrentSrc(src);
    setError(null);
    setIsLoading(!!src);
    setCurrentRetryCount(0);
  }, [src]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(
    async (event: React.SyntheticEvent<HTMLImageElement>) => {
      const loadError = new Error(`Failed to load image: ${currentSrc}`);

      console.warn('SafeImage: Image load failed', {
        src: currentSrc,
        alt,
        retryCount: currentRetryCount,
        maxRetries,
        event: event.type,
      });

      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Try retry if we haven't exceeded max retries
      if (currentRetryCount < maxRetries && currentSrc) {
        console.log(`SafeImage: Retrying image load (${currentRetryCount + 1}/${maxRetries})`);

        try {
          let nextSrc = currentSrc;

          // For Supabase signed URLs, try to refresh the URL first
          if (
            refreshSignedUrl &&
            currentSrc.includes('supabase.co') &&
            currentSrc.includes('token=')
          ) {
            console.log('SafeImage: Attempting to refresh signed URL');
            try {
              nextSrc = await refreshSignedUrl();
              console.log('SafeImage: Successfully refreshed signed URL');
            } catch (refreshError) {
              console.warn(
                'SafeImage: Failed to refresh signed URL, using cache-busting instead:',
                refreshError
              );
              // Fall back to cache busting
              nextSrc = currentSrc.includes('?')
                ? `${currentSrc}&_retry=${currentRetryCount + 1}&_t=${Date.now()}`
                : `${currentSrc}?_retry=${currentRetryCount + 1}&_t=${Date.now()}`;
            }
          } else {
            // Use cache busting for regular URLs
            nextSrc = currentSrc.includes('?')
              ? `${currentSrc}&_retry=${currentRetryCount + 1}&_t=${Date.now()}`
              : `${currentSrc}?_retry=${currentRetryCount + 1}&_t=${Date.now()}`;
          }

          setCurrentRetryCount(prev => prev + 1);

          // Use exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(2, currentRetryCount), 8000);

          retryTimeoutRef.current = setTimeout(() => {
            setCurrentSrc(nextSrc);
            setError(null);
            setIsLoading(true);
          }, delay);

          return;
        } catch (retryError) {
          console.error('SafeImage: Error during retry setup:', retryError);
        }
      }

      // All retries exhausted or no src
      setError(loadError);
      setIsLoading(false);

      // Report error but catch any exceptions to prevent unhandled rejections
      try {
        onError?.(loadError);
      } catch (callbackError) {
        console.error('SafeImage: Error in onError callback:', callbackError);
      }
    },
    [currentSrc, alt, currentRetryCount, maxRetries, onError, refreshSignedUrl]
  );

  // If no src provided or error after retries, show fallback
  if (!currentSrc || error) {
    return (
      <FallbackImage
        alt={alt}
        className={fallbackClassName || className}
        originalUrl={currentSrc}
        error={error?.message}
      />
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className={`flex h-full w-full animate-pulse items-center justify-center bg-muted ${className}`}
        >
          <div className="text-sm text-muted-foreground">
            {currentRetryCount > 0
              ? `Retrying... (${currentRetryCount}/${maxRetries})`
              : 'Loading...'}
          </div>
        </div>
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />
    </>
  );
};

export default SafeImage;
