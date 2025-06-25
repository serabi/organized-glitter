import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageService, type ImageSizeKey } from '@/services/ImageService';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useOptimizedImage');

interface UseOptimizedImageParams {
  record: Record<string, unknown> & { id: string };
  filename: string;
  size?: ImageSizeKey | string;
  context?: 'gallery' | 'card' | 'modal' | 'detail' | 'avatar';
  enabled?: boolean;
}

interface UseOptimizedImageResult {
  imageUrl: string | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * React Query hook for optimized image loading with caching
 * Extends cache time for images to 30 minutes and adds smart prefetching
 */
export const useOptimizedImage = ({
  record,
  filename,
  size,
  context = 'card',
  enabled = true,
}: UseOptimizedImageParams): UseOptimizedImageResult => {
  const queryClient = useQueryClient();

  // Generate query key for image caching
  const queryKey = ['optimized-image', record?.id, filename, size || context];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!record || !filename) {
        throw new Error('Record and filename are required for image loading');
      }

      // Use contextual URL if no specific size provided
      const imageUrl = size 
        ? ImageService.getOptimizedUrl(record, filename, size)
        : ImageService.getContextualUrl(record, filename, context);

      if (!imageUrl) {
        throw new Error('Failed to generate image URL');
      }

      logger.debug('Generated optimized image URL', {
        recordId: record.id,
        filename,
        size: size || context,
        url: imageUrl,
      });

      return imageUrl;
    },
    enabled: enabled && !!record && !!filename,
    staleTime: 30 * 60 * 1000, // 30 minutes (increased from 5 minutes)
    gcTime: 60 * 60 * 1000,    // 1 hour retention
    refetchOnWindowFocus: false, // Images don't change frequently
    refetchOnReconnect: false,   // Avoid unnecessary refetches
    retry: (failureCount, error) => {
      // Don't retry on invalid parameters
      if (error?.message?.includes('required') || error?.message?.includes('generate')) {
        return false;
      }
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  return {
    imageUrl: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Hook for progressive image loading (thumbnail -> high quality)
 */
export const useProgressiveImage = ({
  record,
  filename,
  enabled = true,
}: {
  record: Record<string, unknown> & { id: string };
  filename: string;
  enabled?: boolean;
}) => {
  const queryClient = useQueryClient();

  // Get progressive URLs
  const progressiveUrls = record && filename 
    ? ImageService.getProgressiveUrls(record, filename)
    : { placeholder: '', fullQuality: '', original: '' };

  // Load placeholder (thumbnail) first
  const placeholderQuery = useQuery({
    queryKey: ['progressive-image', 'placeholder', record?.id, filename],
    queryFn: () => progressiveUrls.placeholder,
    enabled: enabled && !!progressiveUrls.placeholder,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Prefetch high quality version
  const prefetchHighQuality = () => {
    if (progressiveUrls.fullQuality) {
      queryClient.prefetchQuery({
        queryKey: ['progressive-image', 'full', record?.id, filename],
        queryFn: () => progressiveUrls.fullQuality,
        staleTime: 30 * 60 * 1000,
      });
    }
  };

  // Load high quality on demand
  const fullQualityQuery = useQuery({
    queryKey: ['progressive-image', 'full', record?.id, filename],
    queryFn: () => progressiveUrls.fullQuality,
    enabled: false, // Only load when explicitly requested
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  return {
    placeholderUrl: placeholderQuery.data,
    fullQualityUrl: fullQualityQuery.data,
    isPlaceholderLoading: placeholderQuery.isLoading,
    isFullQualityLoading: fullQualityQuery.isLoading,
    loadFullQuality: () => fullQualityQuery.refetch(),
    prefetchHighQuality,
    originalUrl: progressiveUrls.original,
  };
};

/**
 * Hook for batch prefetching images in galleries
 */
export const useImagePrefetcher = () => {
  const queryClient = useQueryClient();

  const prefetchImages = (
    images: Array<{ record: Record<string, unknown> & { id: string }; filename: string; context?: 'gallery' | 'card' | 'modal' }>,
    priority: 'high' | 'low' = 'low'
  ) => {
    images.forEach(({ record, filename, context = 'gallery' }) => {
      if (!record || !filename) return;

      const imageUrl = ImageService.getContextualUrl(record, filename, context);
      const queryKey = ['optimized-image', record.id, filename, context];

      // Use prefetchQuery for low priority, setQueryData for high priority
      if (priority === 'high') {
        queryClient.setQueryData(queryKey, imageUrl);
      } else {
        queryClient.prefetchQuery({
          queryKey,
          queryFn: () => imageUrl,
          staleTime: 30 * 60 * 1000,
        });
      }

      logger.debug('Prefetched image', {
        recordId: record.id,
        filename,
        context,
        priority,
      });
    });
  };

  return { prefetchImages };
};

/**
 * Hook for gallery navigation with preloading
 */
export const useGalleryPreloader = (
  currentIndex: number,
  images: Array<{ record: Record<string, unknown> & { id: string }; filename: string }>,
  enabled: boolean = true
) => {
  const { prefetchImages } = useImagePrefetcher();

  // Preload next and previous images
  React.useEffect(() => {
    if (!enabled || !images.length) return;

    const preloadIndices = [
      currentIndex - 1, // Previous
      currentIndex + 1, // Next
    ].filter(index => index >= 0 && index < images.length);

    const imagesToPreload = preloadIndices.map(index => ({
      record: images[index].record,
      filename: images[index].filename,
      context: 'modal' as const,
    }));

    if (imagesToPreload.length > 0) {
      prefetchImages(imagesToPreload, 'high');
      
      logger.debug('Preloaded gallery images', {
        currentIndex,
        preloadIndices,
        totalImages: images.length,
      });
    }
  }, [currentIndex, images, enabled, prefetchImages]);
};

// Re-export for convenience
export { ImageService };