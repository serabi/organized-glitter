import { useState, useEffect, useCallback, useRef } from 'react';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useImageLoading');

// Global request deduplication and queue management
const activeRequests = new Map<string, Promise<string | null>>();
const requestQueue: (() => void)[] = [];
let concurrentRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;

// Process the request queue
const processQueue = () => {
  if (concurrentRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  const nextRequest = requestQueue.shift();
  if (nextRequest) {
    concurrentRequests++;
    nextRequest();
  }
};

// Image loading with queue management and cache busting
const testImageUrl = (url: string): Promise<string | null> => {
  if (activeRequests.has(url)) {
    return activeRequests.get(url)!;
  }

  const promise = new Promise<string | null>(resolve => {
    const loadImage = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        activeRequests.delete(url);
        concurrentRequests--;
        processQueue();
        resolve(url);
      };
      img.onerror = () => {
        activeRequests.delete(url);
        concurrentRequests--;
        processQueue();
        resolve(null);
      };
      img.src = url;
    };

    if (concurrentRequests >= MAX_CONCURRENT_REQUESTS) {
      requestQueue.push(loadImage);
    } else {
      concurrentRequests++;
      loadImage();
    }
  });

  activeRequests.set(url, promise);
  return promise;
};

// Cache for successful loads
interface CacheEntry {
  url: string;
  timestamp: number;
}

const urlCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Hook interfaces
interface UseImageLoadingProps {
  src?: string;
  enableLazyLoad?: boolean;
  lazyLoadOptions?: {
    threshold?: number;
    rootMargin?: string;
  };
  skipImageLoading?: boolean;
  forceRefresh?: boolean;
}

interface UseImageLoadingReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
  refreshUrl: (force?: boolean) => Promise<void>;
  ref?: React.RefObject<HTMLElement>;
  isVisible?: boolean;
  hasIntersected?: boolean;
}

/**
 * Consolidated image loading hook that combines functionality from:
 * - useImage: Basic image loading with cache busting
 * - useImageLoader: Queue-based loading with caching
 * - useConditionalImageLoader: Lazy loading integration
 */
export function useImageLoading({
  src,
  enableLazyLoad = false,
  lazyLoadOptions = { threshold: 0.1, rootMargin: '200px' },
  skipImageLoading = false,
  forceRefresh = false,
}: UseImageLoadingProps): UseImageLoadingReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 1;
  const processingRef = useRef(false);
  const currentSrcRef = useRef<string | undefined>(src);

  // Lazy loading integration
  const lazyLoadResult = useLazyLoad({
    threshold: lazyLoadOptions.threshold,
    rootMargin: lazyLoadOptions.rootMargin,
    skip: !enableLazyLoad || skipImageLoading,
  });

  // Determine if we should load the image
  const shouldLoadImage = !skipImageLoading && (!enableLazyLoad || lazyLoadResult.isVisible);

  // Enhanced image loading function
  const loadImage = useCallback(
    async (imagePath: string, signal: AbortSignal): Promise<string | null> => {
      if (signal.aborted) return null;

      // Create cache-busting URL if force refresh is enabled
      const urlToLoad = forceRefresh
        ? imagePath.includes('?')
          ? `${imagePath}&_t=${Date.now()}`
          : `${imagePath}?_t=${Date.now()}`
        : imagePath;

      logger.debug('Loading image', { 
        originalUrl: imagePath, 
        urlToLoad, 
        forceRefresh,
        cacheSize: urlCache.size 
      });

      return await testImageUrl(urlToLoad);
    },
    [forceRefresh]
  );

  // Main image processing function
  const processImage = useCallback(
    async (currentSrcToProcess: string, signal: AbortSignal) => {
      if (!currentSrcToProcess) {
        setImageUrl(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Prevent duplicate processing
      if (processingRef.current && currentSrcRef.current === currentSrcToProcess) return;
      currentSrcRef.current = currentSrcToProcess;

      // Check cache first (skip if force refresh)
      if (!forceRefresh) {
        const cached = urlCache.get(currentSrcToProcess);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          setImageUrl(cached.url);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      if (signal.aborted) return;
      processingRef.current = true;

      try {
        const url = await loadImage(currentSrcToProcess, signal);
        if (signal.aborted) return;

        if (url) {
          // Cache successful load
          urlCache.set(currentSrcToProcess, { url, timestamp: Date.now() });
          if (currentSrcRef.current === currentSrcToProcess) {
            setImageUrl(url);
            setError(null);
            retryCountRef.current = 0;
            logger.debug('Image loaded successfully', { url, cached: !forceRefresh });
          }
        } else {
          // Image failed to load
          if (currentSrcRef.current === currentSrcToProcess) {
            setImageUrl(null);
            setError(new Error('Failed to load image'));
            logger.warn('Image failed to load', { src: currentSrcToProcess });
          }
        }
      } catch (err) {
        if (signal.aborted) return;
        if (currentSrcRef.current === currentSrcToProcess) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setImageUrl(null);
          setError(new Error(errorMessage));
          logger.error('Error loading image', { src: currentSrcToProcess, error: errorMessage });
        }
      } finally {
        if (currentSrcRef.current === currentSrcToProcess && !signal.aborted) {
          setIsLoading(false);
          processingRef.current = false;
        }
      }
    },
    [loadImage, forceRefresh]
  );

  // Manual refresh function for cache busting
  const refreshUrl = useCallback(
    async (force?: boolean) => {
      if (!src) return;

      setIsLoading(true);
      setError(null);

      // Create cache-busting URL if force is true
      const urlToLoad =
        force && src.includes('?')
          ? `${src}&_t=${Date.now()}`
          : force
            ? `${src}?_t=${Date.now()}`
            : src;

      return new Promise<void>(resolve => {
        const img = new Image();

        img.onload = () => {
          setImageUrl(urlToLoad);
          setIsLoading(false);
          setError(null);
          logger.debug('Manual refresh successful', { url: urlToLoad, force });
          resolve();
        };

        img.onerror = () => {
          const loadError = new Error(`Failed to load image: ${src}`);
          logger.warn('Manual refresh failed', { src, force });
          setError(loadError);
          setIsLoading(false);
          resolve();
        };

        img.src = urlToLoad;
      });
    },
    [src]
  );

  // Retry function
  const retry = useCallback(() => {
    if (!src || retryCountRef.current >= maxRetries) return;

    retryCountRef.current += 1;
    urlCache.delete(src);

    const abortController = new AbortController();
    processImage(src, abortController.signal);
  }, [processImage, src, maxRetries]);

  // Main effect for loading images
  useEffect(() => {
    currentSrcRef.current = src;
    const abortController = new AbortController();
    retryCountRef.current = 0;

    if (src && shouldLoadImage) {
      setIsLoading(true);
      setError(null);
      processImage(src, abortController.signal);
    } else if (!src) {
      setImageUrl(null);
      setIsLoading(false);
      setError(null);
      processingRef.current = false;
    }

    return () => {
      abortController.abort();
      setIsLoading(false);
      processingRef.current = false;
    };
  }, [src, shouldLoadImage, processImage]);

  return {
    imageUrl,
    isLoading,
    error,
    retry,
    refreshUrl,
    // Conditionally include lazy loading properties
    ...(enableLazyLoad && {
      ref: lazyLoadResult.ref,
      isVisible: lazyLoadResult.isVisible,
      hasIntersected: lazyLoadResult.hasIntersected,
    }),
  };
}

/**
 * Legacy compatibility wrapper for useImage
 * @deprecated Use useImageLoading instead
 */
export function useImage(src?: string) {
  const result = useImageLoading({ src });
  return {
    url: result.imageUrl || src,
    loading: result.isLoading,
    error: result.error,
    refreshUrl: result.refreshUrl,
  };
}

/**
 * Legacy compatibility wrapper for useImageLoader
 * @deprecated Use useImageLoading instead
 */
export function useImageLoader({ src }: { src?: string }) {
  const result = useImageLoading({ src });
  return {
    imageUrl: result.imageUrl,
    isLoading: result.isLoading,
    error: result.error,
    retry: result.retry,
  };
}

/**
 * Legacy compatibility wrapper for useConditionalImageLoader
 * @deprecated Use useImageLoading instead
 */
export function useConditionalImageLoader({
  src,
  skipImageLoading,
}: {
  src?: string;
  skipImageLoading: boolean;
}) {
  const result = useImageLoading({
    src,
    enableLazyLoad: true,
    skipImageLoading,
  });

  return {
    ref: result.ref!,
    imageUrl: result.imageUrl,
    isLoading: result.isLoading,
    error: result.error,
    retry: result.retry,
  };
}

export default useImageLoading;