import { useState, useEffect, useCallback, useRef } from 'react';

// Global request deduplication and queue management
const activeRequests = new Map<string, Promise<string | null>>();
const requestQueue: (() => void)[] = [];
let concurrentRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent image requests

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

// Simplified image testing for PocketBase with queue management
const testImageUrl = (url: string): Promise<string | null> => {
  // Check if we already have an active request for this URL
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
        processQueue(); // Process next in queue
        resolve(url);
      };
      img.onerror = () => {
        activeRequests.delete(url);
        concurrentRequests--;
        processQueue(); // Process next in queue
        resolve(null);
      };
      img.src = url;
    };

    // Add to queue if at capacity, otherwise load immediately
    if (concurrentRequests >= MAX_CONCURRENT_REQUESTS) {
      requestQueue.push(loadImage);
    } else {
      concurrentRequests++;
      loadImage();
    }
  });

  // Store the promise for deduplication
  activeRequests.set(url, promise);
  return promise;
};

interface UseImageLoaderProps {
  src?: string;
}

interface UseImageLoaderReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

// Simplified cache for successful loads
interface CacheEntry {
  url: string;
  timestamp: number;
}

const urlCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for successful loads

export function useImageLoader({ src }: UseImageLoaderProps): UseImageLoaderReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 1; // Reduced retries for rate limiting
  const processingRef = useRef(false);
  const currentSrcRef = useRef<string | undefined>(src);

  // Simplified image loading for PocketBase - no complex URL testing needed
  const loadImage = useCallback(
    async (imagePath: string, signal: AbortSignal): Promise<string | null> => {
      if (signal.aborted) return null;

      // For PocketBase URLs, test directly - they don't expire or need alternatives
      return await testImageUrl(imagePath);
    },
    []
  );

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

      // Check cache first
      const cached = urlCache.get(currentSrcToProcess);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setImageUrl(cached.url);
        setIsLoading(false);
        setError(null);
        return;
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
          }
        } else {
          // Image failed to load
          if (currentSrcRef.current === currentSrcToProcess) {
            setImageUrl(null);
            setError(new Error('Failed to load image'));
          }
        }
      } catch (err) {
        if (signal.aborted) return;
        if (currentSrcRef.current === currentSrcToProcess) {
          setImageUrl(null);
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (currentSrcRef.current === currentSrcToProcess && !signal.aborted) {
          setIsLoading(false);
          processingRef.current = false;
        }
      }
    },
    [loadImage]
  );

  const retry = useCallback(() => {
    if (!src || retryCountRef.current >= maxRetries) return;

    retryCountRef.current += 1;
    urlCache.delete(src);

    // Immediate retry without delay for better UX
    const abortController = new AbortController();
    processImage(src, abortController.signal);
  }, [processImage, src, maxRetries]);

  useEffect(() => {
    currentSrcRef.current = src;
    const abortController = new AbortController();
    retryCountRef.current = 0;

    if (src) {
      setIsLoading(true);
      setError(null);
      processImage(src, abortController.signal);
    } else {
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
  }, [src, processImage]);

  return { imageUrl, isLoading, error, retry };
}
