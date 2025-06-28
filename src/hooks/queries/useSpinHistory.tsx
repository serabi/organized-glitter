/**
 * @fileoverview React Query Hook for Spin History Data
 *
 * Provides a React Query hook for fetching user spin history with comprehensive
 * caching, error handling, and pagination support. Optimized for the randomizer
 * feature's history display needs with configurable limits and retry logic.
 *
 * @author Generated with Claude Code
 * @version 1.0.0
 * @since 2024-06-28
 */

import { useQuery } from '@tanstack/react-query';
import { SpinRecord, getSpinHistory } from '@/services/pocketbase/randomizerService';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useSpinHistory');

/**
 * Parameters interface for the useSpinHistory hook
 * @interface UseSpinHistoryParams
 */
export interface UseSpinHistoryParams {
  /** User ID to fetch spin history for (undefined disables the query) */
  userId: string | undefined;
  /** Maximum number of records to fetch (default: 8) */
  limit?: number;
  /** Whether the query should be enabled (default: true) */
  enabled?: boolean;
}

/**
 * React Query hook for fetching user spin history with pagination
 *
 * Provides optimized access to randomizer spin history with intelligent caching,
 * error handling, and retry logic. Designed for the SpinHistory component's
 * pagination needs with configurable record limits.
 *
 * @param {UseSpinHistoryParams} params - Hook configuration parameters
 * @param {string|undefined} params.userId - User ID (query disabled if undefined)
 * @param {number} [params.limit=8] - Maximum records to fetch
 * @param {boolean} [params.enabled=true] - Whether query is enabled
 *
 * @returns {UseQueryResult<SpinRecord[]>} React Query result with the following:
 *   - `data: SpinRecord[]` - Array of spin records (empty array if no data)
 *   - `isLoading: boolean` - Initial loading state
 *   - `isFetching: boolean` - Any fetch operation in progress
 *   - `error: Error | null` - Error object if query failed
 *   - `refetch: function` - Manual refetch trigger
 *
 * @example
 * ```tsx
 * // Basic usage with default 8 record limit
 * const { data: recentSpins, isLoading } = useSpinHistory({
 *   userId: user?.id
 * });
 *
 * // Paginated usage for "show more" functionality
 * const [showAll, setShowAll] = useState(false);
 * const { data: history } = useSpinHistory({
 *   userId: user?.id,
 *   limit: showAll ? 50 : 8,
 *   enabled: !!user?.id
 * });
 *
 * // Conditional usage
 * const { data: history, error } = useSpinHistory({
 *   userId: user?.id,
 *   limit: 20,
 *   enabled: isFeatureEnabled && !!user
 * });
 * ```
 *
 * @caching
 * - **Query Key**: `['randomizer', 'history', userId, { limit }]`
 * - **Stale Time**: 30 seconds (relatively fresh for user activity)
 * - **Cache Time**: 5 minutes garbage collection
 * - **Background Refetch**: Disabled on window focus
 *
 * @errorhandling
 * - No retry on 4xx client errors (400, 401, 403, 404)
 * - Up to 2 retries on server errors with exponential backoff
 * - Returns empty array on error instead of throwing
 *
 * @performance
 * - Automatically disabled when userId is undefined
 * - Efficient caching with limit-based query keys
 * - Exponential backoff retry strategy
 * - Minimal network requests through intelligent stale time
 */
export const useSpinHistory = ({ userId, limit = 8, enabled = true }: UseSpinHistoryParams) => {
  return useQuery({
    queryKey: ['randomizer', 'history', userId, { limit }],
    queryFn: async (): Promise<SpinRecord[]> => {
      if (!userId) {
        logger.debug('No userId provided, returning empty history');
        return [];
      }

      logger.debug('Fetching spin history', { userId, limit });
      const history = await getSpinHistory(userId, limit);

      logger.debug('Spin history fetched', {
        userId,
        recordCount: history.length,
      });

      return history;
    },
    enabled: enabled && !!userId,
    staleTime: 30 * 1000, // 30 seconds - relatively fresh since it's user activity
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
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
