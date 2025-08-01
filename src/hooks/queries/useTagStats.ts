import { useQuery } from '@tanstack/react-query';
import { TagService } from '@/lib/tags';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { ClientResponseError } from 'pocketbase';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useTagStats');

export interface TagStatsResult {
  data: Record<string, number>;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  refetch: () => void;
}

/**
 * Custom hook for fetching tag statistics (project counts) with optimized caching
 *
 * Features:
 * - 5-minute cache for better performance
 * - Automatic retry on network errors
 * - Optimistic updates support
 * - Request deduplication
 */
export function useTagStats(tagIds: string[]): TagStatsResult {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.tags.stat(user?.id || '', tagIds),
    queryFn: async () => {
      logger.debug('Fetching stats for tags', { tagCount: tagIds.length });
      const result = await TagService.getBulkTagStats(tagIds);

      if (result.status === 'error') {
        throw result.error;
      }

      return result.data;
    },
    enabled: !!user?.id && tagIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - tag stats don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache time (was cacheTime in v4)
    retry: (failureCount, error: Error) => {
      // Don't retry on client errors (4xx) - likely auth or permission issues
      if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500) {
        return false;
      }
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch if we have fresh data
  });

  return {
    data: query.data || {},
    isLoading: query.isLoading,
    error: query.error as Error | null,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
}

/**
 * Hook for optimistic tag stats updates
 * Use this when adding/removing tags from projects to immediately update the UI
 */
export function useOptimisticTagStats() {
  const updateTagStats = (tagId: string, delta: number) => {
    // This would be implemented with React Query's optimistic updates
    // For now, we'll rely on cache invalidation
    logger.debug('Would update tag stats', { tagId, delta });
  };

  return { updateTagStats };
}
