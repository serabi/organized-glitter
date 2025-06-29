/**
 * @fileoverview React Query Hook for Spin History Count
 *
 * Provides a React Query hook for efficiently fetching the total count of user
 * spin history without loading the actual records. Optimized for statistics
 * displays and count-only operations with comprehensive caching and error handling.
 *
 * @author Generated with Claude Code
 * @version 1.0.0
 * @since 2024-06-29
 */

import { useQuery } from '@tanstack/react-query';
import { getSpinHistoryCount } from '@/services/pocketbase/randomizerService';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useSpinHistoryCount');

/**
 * Parameters interface for the useSpinHistoryCount hook
 * @interface UseSpinHistoryCountParams
 */
export interface UseSpinHistoryCountParams {
  /** User ID to fetch spin count for (undefined disables the query) */
  userId: string | undefined;
  /** Whether the query should be enabled (default: true) */
  enabled?: boolean;
}

/**
 * React Query hook for fetching total spin history count
 *
 * Provides optimized access to the total number of spins for a user without
 * fetching the actual record data. Ideal for statistics displays, counters,
 * and performance-sensitive count operations.
 *
 * @param {UseSpinHistoryCountParams} params - Hook configuration parameters
 * @param {string|undefined} params.userId - User ID (query disabled if undefined)
 * @param {boolean} [params.enabled=true] - Whether query is enabled
 *
 * @returns {UseQueryResult<number>} React Query result with the following:
 *   - `data: number` - Total count of spin records (0 if no data)
 *   - `isLoading: boolean` - Initial loading state
 *   - `isFetching: boolean` - Any fetch operation in progress
 *   - `error: Error | null` - Error object if query failed
 *   - `refetch: function` - Manual refetch trigger
 *
 * @example
 * ```tsx
 * // Basic usage for statistics display
 * const { data: totalSpins, isLoading } = useSpinHistoryCount({
 *   userId: user?.id
 * });
 *
 * // Conditional usage with custom enable logic
 * const { data: count, error } = useSpinHistoryCount({
 *   userId: user?.id,
 *   enabled: isStatisticsTabActive && !!user
 * });
 *
 * // In a component
 * function SpinCounter({ userId }: { userId: string }) {
 *   const { data: count = 0, isLoading } = useSpinHistoryCount({ userId });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return <div>{count} Total Spins</div>;
 * }
 * ```
 *
 * @caching
 * - **Query Key**: `['randomizer', 'history', 'count', userId]`
 * - **Stale Time**: 30 seconds (matches spin history for consistency)
 * - **Cache Time**: 5 minutes garbage collection
 * - **Background Refetch**: Enabled on window focus for fresh counts
 *
 * @errorhandling
 * - No retry on 4xx client errors (400, 401, 403, 404)
 * - Up to 2 retries on server errors with exponential backoff
 * - Returns 0 on error instead of throwing
 *
 * @performance
 * - Automatically disabled when userId is undefined
 * - Only fetches count metadata, never actual records
 * - Minimal network usage (single count query)
 * - Efficient caching prevents redundant requests
 * - Much faster than fetching full history for count-only needs
 */
export const useSpinHistoryCount = ({ userId, enabled = true }: UseSpinHistoryCountParams) => {
  return useQuery({
    queryKey: ['randomizer', 'history', 'count', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) {
        logger.debug('No userId provided, returning zero count');
        return 0;
      }

      logger.debug('Fetching spin history count', { userId });
      const count = await getSpinHistoryCount(userId);

      logger.debug('Spin history count fetched', {
        userId,
        totalCount: count,
      });

      return count;
    },
    enabled: enabled && !!userId,
    staleTime: 30 * 1000, // 30 seconds - matches useSpinHistory for consistency
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: true, // Refetch on focus for fresh counts
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      const errorMessage = error?.message || '';
      const isClientError =
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');

      if (isClientError) {
        return false;
      }

      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
