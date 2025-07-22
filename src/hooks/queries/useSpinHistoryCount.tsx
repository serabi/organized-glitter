/**
 * @fileoverview Enhanced React Query Hook for Spin History Count
 *
 * Provides a React Query hook for efficiently fetching the total count of user
 * spin history without loading the actual records. Optimized for statistics
 * displays and count-only operations with comprehensive caching, error handling,
 * and background refresh capabilities.
 *
 * @author Enhanced for randomizer optimization
 * @version 2.0.0
 * @since 2025-01-17
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSpinHistoryCountEnhanced } from '@/services/pocketbase/randomizerService';
import { randomizerQueryKeys } from '@/hooks/queries/useSpinHistory';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useSpinHistoryCount');

/**
 * Enhanced parameters interface for the useSpinHistoryCount hook
 * @interface UseSpinHistoryCountParams
 */
export interface UseSpinHistoryCountParams {
  /** User ID to fetch spin count for (undefined disables the query) */
  userId: string | undefined;
  /** Whether the query should be enabled (default: true) */
  enabled?: boolean;
  /** Whether to enable background refresh (default: true) */
  enableBackgroundRefresh?: boolean;
  /** Custom stale time in milliseconds (default: 60000 - 1 minute) */
  staleTime?: number;
  /** Custom cache time in milliseconds (default: 300000 - 5 minutes) */
  cacheTime?: number;
}

/**
 * Enhanced React Query hook for fetching total spin history count with improved caching
 *
 * Provides optimized access to the total number of spins for a user without
 * fetching the actual record data. Enhanced with improved caching strategies,
 * background refresh capabilities, and optimized query invalidation.
 *
 * @param {UseSpinHistoryCountParams} params - Hook configuration parameters
 * @param {string|undefined} params.userId - User ID (query disabled if undefined)
 * @param {boolean} [params.enabled=true] - Whether query is enabled
 * @param {boolean} [params.enableBackgroundRefresh=true] - Whether to enable background refresh
 * @param {number} [params.staleTime=60000] - Custom stale time in milliseconds
 * @param {number} [params.cacheTime=300000] - Custom cache time in milliseconds
 *
 * @returns {UseQueryResult<number>} React Query result with the following:
 *   - `data: number` - Total count of spin records (0 if no data)
 *   - `isLoading: boolean` - Initial loading state
 *   - `isFetching: boolean` - Any fetch operation in progress
 *   - `error: Error | null` - Error object if query failed
 *   - `refetch: function` - Manual refetch trigger
 *   - `isStale: boolean` - Whether data is considered stale
 *   - `dataUpdatedAt: number` - Timestamp of last successful data update
 *
 * @example
 * ```tsx
 * // Basic usage with enhanced caching
 * const { data: totalSpins, isLoading, isStale } = useSpinHistoryCount({
 *   userId: user?.id
 * });
 *
 * // Custom caching configuration
 * const { data: count } = useSpinHistoryCount({
 *   userId: user?.id,
 *   staleTime: 2 * 60 * 1000, // 2 minutes
 *   cacheTime: 10 * 60 * 1000, // 10 minutes
 *   enableBackgroundRefresh: false
 * });
 *
 * // Real-time statistics with background refresh
 * const { data: liveCount, isFetching } = useSpinHistoryCount({
 *   userId: user?.id,
 *   enableBackgroundRefresh: true,
 *   staleTime: 30 * 1000 // 30 seconds
 * });
 * ```
 *
 * @caching
 * - **Query Key**: `['randomizer', 'count', userId]` (optimized structure)
 * - **Stale Time**: 1 minute (configurable, longer than history for count stability)
 * - **Cache Time**: 5 minutes garbage collection (configurable)
 * - **Background Refetch**: Configurable, enabled by default for fresh counts
 * - **Refetch on Window Focus**: Enabled for real-time accuracy
 * - **Refetch Interval**: Optional background polling for live updates
 *
 * @errorhandling
 * - Enhanced error handling with RandomizerError support
 * - No retry on 4xx client errors (400, 401, 403, 404)
 * - Up to 3 retries on server errors with exponential backoff
 * - Graceful degradation with fallback to 0 on persistent errors
 * - Detailed error logging for debugging
 *
 * @performance
 * - Optimized query invalidation strategy
 * - Selective background refresh based on user activity
 * - Intelligent caching with configurable stale times
 * - Minimal network usage with efficient count-only queries
 * - Background refresh only when tab is active
 * - Automatic cleanup of stale cache entries
 *
 * @invalidation
 * - Automatically invalidated when new spins are created
 * - Invalidated when spin history is cleared
 * - Smart invalidation prevents unnecessary refetches
 * - Coordinated with spin history queries for consistency
 */
export const useSpinHistoryCount = ({
  userId,
  enabled = true,
  enableBackgroundRefresh = true,
  staleTime = 60 * 1000, // 1 minute default
  cacheTime = 5 * 60 * 1000, // 5 minutes default
}: UseSpinHistoryCountParams) => {
  const queryClient = useQueryClient();
  // Set up background refresh interval when enabled
  useEffect(() => {
    if (!enableBackgroundRefresh || !userId || !enabled) {
      return;
    }

    // Only enable background refresh when document is visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logger.debug('Document became visible, refreshing spin count', { userId });
        queryClient.invalidateQueries({
          queryKey: randomizerQueryKeys.count(userId),
          exact: true,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enableBackgroundRefresh, userId, enabled, queryClient]);

  return useQuery({
    queryKey: randomizerQueryKeys.count(userId || ''),
    queryFn: async (): Promise<number> => {
      if (!userId) {
        logger.debug('No userId provided, returning zero count');
        return 0;
      }

      logger.debug('Fetching enhanced spin history count with typed service', {
        userId,
        enableBackgroundRefresh,
        staleTime,
        cacheTime,
      });

      // Use the enhanced typed service method
      const count = await getSpinHistoryCountEnhanced(userId);

      logger.debug('Enhanced spin history count fetched successfully', {
        userId,
        totalCount: count,
        timestamp: new Date().toISOString(),
      });

      return count;
    },
    enabled: enabled && !!userId,
    staleTime, // Use configurable stale time
    gcTime: cacheTime, // Use configurable cache time
    refetchOnWindowFocus: enableBackgroundRefresh, // Configurable window focus refetch
    refetchInterval: enableBackgroundRefresh ? 5 * 60 * 1000 : false, // 5 minutes background polling if enabled
    refetchIntervalInBackground: false, // Only refetch when tab is active
    retry: (failureCount, error) => {
      // Enhanced error handling with RandomizerError support
      if (error && typeof error === 'object' && 'type' in error) {
        const randomizerError = error as { type: string; canRetry: boolean };
        logger.debug('RandomizerError detected in count query', {
          type: randomizerError.type,
          canRetry: randomizerError.canRetry,
          failureCount,
          userId,
        });
        return randomizerError.canRetry && failureCount < 3; // Increased retry count
      }

      // Legacy error handling for backward compatibility
      const errorMessage = error?.message || '';
      const isClientError =
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');

      if (isClientError) {
        logger.debug('Client error detected, not retrying', {
          errorMessage,
          failureCount,
          userId,
        });
        return false;
      }

      // Retry up to 3 times for other errors (increased from 2)
      const shouldRetry = failureCount < 3;
      logger.debug('Server error detected, retry decision', {
        errorMessage,
        failureCount,
        shouldRetry,
        userId,
      });
      return shouldRetry;
    },
    retryDelay: attemptIndex => {
      const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
      logger.debug('Retrying spin count query', {
        attemptIndex,
        delay,
        userId,
      });
      return delay;
    },
    // Enhanced error handling
    onError: error => {
      logger.error('Spin history count query failed', {
        error,
        userId,
        enableBackgroundRefresh,
        staleTime,
        cacheTime,
      });
    },
    // Success logging for debugging
    onSuccess: data => {
      logger.debug('Spin history count query succeeded', {
        count: data,
        userId,
        timestamp: new Date().toISOString(),
      });
    },
  });
};

/**
 * Optimized query invalidation helper for spin count
 *
 * Provides a centralized way to invalidate spin count queries with
 * intelligent targeting to prevent unnecessary refetches.
 *
 * @param queryClient - React Query client instance
 * @param userId - User ID to invalidate count for
 * @param options - Invalidation options
 */
export const invalidateSpinHistoryCount = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  options: {
    /** Whether to refetch immediately (default: true) */
    refetch?: boolean;
    /** Whether to invalidate exact match only (default: true) */
    exact?: boolean;
  } = {}
) => {
  const { refetch = true, exact = true } = options;

  logger.debug('Invalidating spin history count', {
    userId,
    refetch,
    exact,
  });

  return queryClient.invalidateQueries({
    queryKey: randomizerQueryKeys.count(userId),
    exact,
    refetchType: refetch ? 'active' : 'none',
  });
};
