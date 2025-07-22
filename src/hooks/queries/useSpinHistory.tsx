/**
 * @fileoverview Enhanced React Query Hook for Spin History Data
 *
 * Provides a type-safe React Query hook for fetching user spin history with comprehensive
 * caching, error handling, pagination support, and project relation expansion. Optimized
 * for the randomizer feature's history display needs with configurable limits, retry logic,
 * and performance enhancements including prefetching and optimized query keys.
 *
 * @author @serabi
 * @version 2.0.0
 * @since 2025-07-17
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getSpinHistoryEnhanced,
  getSpinHistoryCountEnhanced,
  isRandomizerError,
  type RandomizerSpinExpand,
} from '@/services/pocketbase/randomizerService';
import type { RandomizerSpinsResponse } from '@/types/pocketbase.types';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useSpinHistory');

/**
 * Optimized query keys for randomizer operations with type safety
 */
export const randomizerQueryKeys = {
  all: ['randomizer'] as const,
  history: (userId: string, options?: { limit?: number; expand?: boolean }) =>
    [...randomizerQueryKeys.all, 'history', userId, options] as const,
  count: (userId: string) => [...randomizerQueryKeys.all, 'count', userId] as const,
} as const;

/**
 * Enhanced parameters interface for the useSpinHistory hook with project expansion support
 * @interface UseSpinHistoryParams
 */
export interface UseSpinHistoryParams {
  /** User ID to fetch spin history for (undefined disables the query) */
  userId: string | undefined;
  /** Maximum number of records to fetch (default: 8) */
  limit?: number;
  /** Whether to expand project relations for additional data (default: false) */
  expandProject?: boolean;
  /** Whether the query should be enabled (default: true) */
  enabled?: boolean;
  /** Whether to enable prefetching of related data (default: true) */
  enablePrefetch?: boolean;
}

/**
 * Type-safe spin record with optional project expansion
 */
export type EnhancedSpinRecord = RandomizerSpinsResponse<string[], RandomizerSpinExpand>;

/**
 * Enhanced React Query hook for fetching user spin history with type safety and performance optimizations
 *
 * Provides type-safe access to randomizer spin history with intelligent caching, error handling,
 * project relation expansion, and prefetching capabilities. Designed for optimal performance
 * with configurable limits, retry logic, and background data loading.
 *
 * @param {UseSpinHistoryParams} params - Hook configuration parameters
 * @param {string|undefined} params.userId - User ID (query disabled if undefined)
 * @param {number} [params.limit=8] - Maximum records to fetch
 * @param {boolean} [params.expandProject=false] - Whether to expand project relations
 * @param {boolean} [params.enabled=true] - Whether query is enabled
 * @param {boolean} [params.enablePrefetch=true] - Whether to enable prefetching
 *
 * @returns {UseQueryResult<EnhancedSpinRecord[]>} React Query result with type-safe spin records
 *
 * @example
 * ```tsx
 * // Basic usage with project expansion
 * const { data: recentSpins, isLoading } = useSpinHistory({
 *   userId: user?.id,
 *   expandProject: true
 * });
 *
 * // Access expanded project data
 * recentSpins?.forEach(spin => {
 *   console.log(`Selected: ${spin.project_title}`);
 *   if (spin.expand?.project) {
 *     console.log(`Status: ${spin.expand.project.status}`);
 *   }
 * });
 *
 * // Paginated usage with prefetching disabled
 * const { data: history } = useSpinHistory({
 *   userId: user?.id,
 *   limit: showAll ? 50 : 8,
 *   expandProject: true,
 *   enablePrefetch: false
 * });
 * ```
 *
 * @caching
 * - **Query Key**: `['randomizer', 'history', userId, { limit, expand }]`
 * - **Stale Time**: 30 seconds for user activity data
 * - **Cache Time**: 5 minutes garbage collection
 * - **Background Refetch**: Disabled on window focus for performance
 *
 * @errorhandling
 * - Enhanced error handling with RandomizerError types
 * - No retry on 4xx client errors (400, 401, 403, 404)
 * - Up to 2 retries on server errors with exponential backoff
 * - Graceful fallback to empty array on errors
 *
 * @performance
 * - Optimized query keys with structured options
 * - Automatic prefetching of count data
 * - Project relation expansion support
 * - Intelligent retry strategy with exponential backoff
 */
export const useSpinHistory = ({
  userId,
  limit = 8,
  expandProject = false,
  enabled = true,
  enablePrefetch = true,
}: UseSpinHistoryParams) => {
  const queryClient = useQueryClient();

  // Prefetch spin count for better UX when enabled
  useEffect(() => {
    if (enablePrefetch && userId && enabled) {
      queryClient.prefetchQuery({
        queryKey: randomizerQueryKeys.count(userId),
        queryFn: () => getSpinHistoryCountEnhanced(userId),
        staleTime: 2 * 60 * 1000, // 2 minutes for count data
      });
    }
  }, [queryClient, userId, enabled, enablePrefetch]);

  return useQuery({
    queryKey: randomizerQueryKeys.history(userId || '', { limit, expand: expandProject }),
    queryFn: async (): Promise<EnhancedSpinRecord[]> => {
      if (!userId) {
        logger.debug('No userId provided, returning empty history');
        return [];
      }

      logger.debug('Fetching enhanced spin history', {
        userId,
        limit,
        expandProject,
      });

      const history = await getSpinHistoryEnhanced(userId, limit, expandProject);

      logger.debug('Enhanced spin history fetched', {
        userId,
        recordCount: history.length,
        expandProject,
      });

      return history;
    },
    enabled: enabled && !!userId,
    staleTime: 30 * 1000, // 30 seconds - relatively fresh for user activity
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: (failureCount, error) => {
      // Enhanced error handling with RandomizerError support
      if (isRandomizerError(error)) {
        logger.debug('RandomizerError detected', {
          type: error.type,
          canRetry: error.canRetry,
          suggestedAction: error.suggestedAction,
        });
        return error.canRetry && failureCount < 2;
      }

      // Legacy error handling for backward compatibility
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

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useSpinHistory with enhanced parameters instead
 */
export const useSpinHistoryLegacy = ({
  userId,
  limit = 8,
  enabled = true,
}: {
  userId: string | undefined;
  limit?: number;
  enabled?: boolean;
}) => {
  return useSpinHistory({ userId, limit, enabled, expandProject: false, enablePrefetch: false });
};
