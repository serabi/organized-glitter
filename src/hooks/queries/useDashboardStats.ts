/**
 * Dashboard Stats React Query Hook
 *
 * Type-safe React Query hook for the new consolidated dashboard stats service.
 * Provides intelligent caching, error handling, and performance monitoring.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardStatsService } from '@/services/pocketbase/dashboardStatsService';
import type { LegacyOverviewStats } from '@/types/dashboard-stats';
import { toLegacyStats } from '@/types/dashboard-stats';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';

/**
 * Main hook for dashboard statistics
 *
 * Features:
 * - Intelligent caching with database + React Query layers
 * - Automatic error recovery with stale cache fallback
 * - Performance monitoring and logging
 * - Type-safe with runtime validation
 */
export const useDashboardStats = (year?: number) => {
  const { user } = useAuth();
  const userId = user?.id;
  const targetYear = year || new Date().getFullYear();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...queryKeys.stats.overview(userId || 'anonymous'), 'dashboard', targetYear],
    queryFn: async () => {
      try {
        return await DashboardStatsService.getYearlyStats(userId!, targetYear);
      } catch (error) {
        // Handle 404 errors gracefully - they're expected for new users/years
        // Instead of treating as error, return undefined so UI can handle gracefully
        if (error && typeof error === 'object' && 'status' in error && 
            (error as { status: number }).status === 404) {
          return undefined;
        }
        throw error;
      }
    },
    enabled: !!userId,
    // Optimized cache settings for dashboard use
    staleTime: 5 * 60 * 1000, // 5 minutes - data doesn't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    // Conservative refetch settings since we have database caching
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    // Simplified retry with exponential backoff
    retry: (failureCount, error) => {
      // Don't retry on validation errors
      if (error && error instanceof Error && error.name === 'StatsServiceError') {
        return false;
      }
      // Don't retry on 404 errors (cache misses are expected for new users/years)
      if (error && typeof error === 'object' && 'status' in error && 
          (error as { status: number }).status === 404) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * Math.pow(2, attemptIndex), 5000),
  });

  // Manual cache invalidation
  const invalidateCache = async () => {
    if (userId) {
      // Invalidate both database cache and React Query cache in parallel
      await Promise.all([
        DashboardStatsService.invalidateCache(userId, targetYear),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.stats.overview(userId), 'dashboard', targetYear],
        }),
      ]);
    }
  };

  // Proactive cache update after project changes
  const updateAfterProjectChange = async () => {
    if (userId) {
      // Update database cache proactively, then invalidate React Query in parallel
      await DashboardStatsService.updateCacheAfterProjectChange(userId, targetYear);
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.stats.overview(userId), 'dashboard', targetYear],
      });
    }
  };

  // Pre-warm cache for better UX
  const preWarmCache = async () => {
    if (userId) {
      await DashboardStatsService.preWarmCache(userId);
    }
  };

  // Get cache status for debugging
  const getCacheStatus = async () => {
    if (userId) {
      return await DashboardStatsService.getCacheStatus(userId, targetYear);
    }
    return null;
  };

  return {
    // Core query data
    data: query.data,
    stats: query.data?.stats,
    isLoading: query.isFetching && !query.data,
    isError: query.isError,
    error: query.error,

    // Cache source information
    cacheSource: query.data?.source,
    cachedAt: query.data?.cached_at,
    calculationTime: query.data?.calculation_time_ms,

    // Actions
    refetch: query.refetch,
    invalidateCache,
    updateAfterProjectChange,
    preWarmCache,
    getCacheStatus,

    // React Query status
    queryStatus: query.status,
    fetchStatus: query.fetchStatus,
  };
};

/**
 * Hook for legacy compatibility
 *
 * Provides the same interface as the old useOverviewStatsOptimized
 * for components that haven't been migrated yet.
 */
export const useDashboardStatsLegacy = (year?: number) => {
  const dashboardStats = useDashboardStats(year);

  // Convert to legacy format
  const legacyStats: LegacyOverviewStats | undefined = dashboardStats.stats
    ? toLegacyStats(dashboardStats.stats)
    : undefined;

  return {
    // Legacy format
    data: legacyStats ? { stats: legacyStats } : undefined,
    stats: legacyStats,

    // Pass through loading/error states
    isLoading: dashboardStats.isLoading,
    isError: dashboardStats.isError,
    error: dashboardStats.error,

    // Actions (keep same names for compatibility)
    invalidateCache: dashboardStats.invalidateCache,
    updateAfterProjectChange: dashboardStats.updateAfterProjectChange,
  };
};

/**
 * Hook for prefetching dashboard stats
 */
export const usePrefetchDashboardStats = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return async (year?: number) => {
    if (user?.id) {
      const targetYear = year || new Date().getFullYear();
      await queryClient.prefetchQuery({
        queryKey: [...queryKeys.stats.overview(user.id), 'dashboard', targetYear],
        queryFn: () => DashboardStatsService.getYearlyStats(user.id, targetYear),
        staleTime: 5 * 60 * 1000,
      });
    }
  };
};

/**
 * Hook for multiple years (dashboard historical view)
 */
export const useDashboardStatsMultiYear = (years: number[]) => {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: userId ? [...queryKeys.stats.overview(userId), 'dashboard', 'multi-year', years] : [],
    queryFn: async () => {
      if (!userId) return [];

      const results = await Promise.all(
        years.map(year => DashboardStatsService.getYearlyStats(userId, year))
      );

      return results.map((result, index) => ({
        year: years[index],
        ...result,
      }));
    },
    enabled: !!userId && years.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes for historical data
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};
