import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';

interface UseImageReturn {
  url: string | undefined;
  loading: boolean;
  error: Error | null;
  refreshUrl: (force?: boolean) => Promise<void>;
}

/**
 * Simple hook for managing image loading state
 * @deprecated Use useImageLoader for better Supabase Storage support
 */
export function useImage(src?: string): UseImageReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshUrl = useCallback(
    async (force?: boolean) => {
      if (!src) return;

      setLoading(true);
      setError(null);

      // Create a cache-busting URL if force is true
      const urlToLoad =
        force && src.includes('?')
          ? `${src}&_t=${Date.now()}`
          : force
            ? `${src}?_t=${Date.now()}`
            : src;

      return new Promise<void>(resolve => {
        const img = new Image();

        img.onload = () => {
          setLoading(false);
          resolve();
        };

        img.onerror = event => {
          const loadError = new Error(`Failed to load image: ${src}`);
          logger.warn('Image load failed:', { src, event });
          setError(loadError);
          setLoading(false);
          resolve();
        };

        img.src = urlToLoad;
      });
    },
    [src]
  );

  useEffect(() => {
    if (src) {
      refreshUrl();
    } else {
      setLoading(false);
      setError(null);
    }
  }, [src, refreshUrl]);

  return {
    url: src,
    loading,
    error,
    refreshUrl,
  };
}

export default useImage;
