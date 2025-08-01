import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageService, type ImageSizeKey } from '@/services/ImageService';
import { createLogger } from '@/utils/logger';

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
    gcTime: 60 * 60 * 1000, // 1 hour retention
    refetchOnWindowFocus: false, // Images don't change frequently
    refetchOnReconnect: false, // Avoid unnecessary refetches
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
 * Enhanced hook for multi-step progressive image loading
 */
export const useProgressiveImage = ({
  record,
  filename,
  enabled = true,
  context = 'card',
  strategy = 'standard',
}: {
  record: Record<string, unknown> & { id: string };
  filename: string;
  enabled?: boolean;
  context?: 'gallery' | 'card' | 'modal' | 'detail' | 'avatar';
  strategy?: 'standard' | 'enhanced' | 'contextual';
}) => {
  const queryClient = useQueryClient();

  // Get progressive URLs based on strategy
  const progressiveUrls = React.useMemo(() => {
    if (!record || !filename) return { placeholder: '', fullQuality: '', original: '' };

    if (strategy === 'contextual') {
      return ImageService.getContextualProgressiveUrls(record, filename, context);
    }

    return ImageService.getProgressiveUrls(record, filename, strategy);
  }, [record, filename, strategy, context]);

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

  // Load medium quality (if available)
  const mediumQualityQuery = useQuery({
    queryKey: ['progressive-image', 'medium', record?.id, filename],
    queryFn: () => (progressiveUrls as Record<string, string>).medium,
    enabled: false, // Only load when explicitly requested
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Load high quality on demand
  const fullQualityQuery = useQuery({
    queryKey: ['progressive-image', 'full', record?.id, filename],
    queryFn: () => progressiveUrls.fullQuality,
    enabled: false, // Only load when explicitly requested
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Enhanced prefetch function that handles medium quality
  const prefetchMediumQuality = () => {
    const urls = progressiveUrls as Record<string, string>;
    if (urls.medium) {
      queryClient.prefetchQuery({
        queryKey: ['progressive-image', 'medium', record?.id, filename],
        queryFn: () => urls.medium,
        staleTime: 30 * 60 * 1000,
      });
    }
  };

  // Smart loading function that loads appropriate next quality level
  const loadNextQuality = () => {
    const urls = progressiveUrls as Record<string, string>;
    if (urls.medium && !mediumQualityQuery.data) {
      mediumQualityQuery.refetch();
    } else {
      fullQualityQuery.refetch();
    }
  };

  return {
    placeholderUrl: placeholderQuery.data,
    mediumQualityUrl: mediumQualityQuery.data,
    fullQualityUrl: fullQualityQuery.data,
    isPlaceholderLoading: placeholderQuery.isLoading,
    isMediumQualityLoading: mediumQualityQuery.isLoading,
    isFullQualityLoading: fullQualityQuery.isLoading,
    loadFullQuality: () => fullQualityQuery.refetch(),
    loadMediumQuality: () => mediumQualityQuery.refetch(),
    loadNextQuality,
    prefetchHighQuality,
    prefetchMediumQuality,
    originalUrl: (progressiveUrls as Record<string, string>)?.original || '',
    hasMediumQuality: !!(progressiveUrls as Record<string, string>).medium,
    hasOriginal: !!(progressiveUrls as Record<string, string>)?.original,
  };
};

/**
 * Hook for batch prefetching images in galleries
 */
export const useImagePrefetcher = () => {
  const queryClient = useQueryClient();

  const prefetchImages = (
    images: Array<{
      record: Record<string, unknown> & { id: string };
      filename: string;
      context?: 'gallery' | 'card' | 'modal';
    }>,
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

// Re-export for convenience
export { ImageService };
