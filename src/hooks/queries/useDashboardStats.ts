/**
 * Dashboard Stats React Query Hook - Simplified Direct Approach
 *
 * Uses direct PocketBase queries with TanStack Query v5 for optimal performance.
 * Removes complex multi-layer caching in favor of modern Query v5 patterns.
 */

import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useDashboardStats');

interface StatusBreakdown {
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  completed: number;
  archived: number;
  destashed: number;
}

interface DashboardStats {
  completed_count: number;
  started_count: number;
  in_progress_count: number;
  total_diamonds: number;
  estimated_drills: number;
  status_breakdown: StatusBreakdown;
  available_years: number[];
}

/**
 * Calculate dashboard stats directly from PocketBase
 */
async function calculateDashboardStats(userId: string, year: number): Promise<DashboardStats> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  logger.debug(`Calculating dashboard stats for user ${userId}, year ${year}`);

  try {
    // Get all projects for the user in a single query
    const projects = await pb.collection(Collections.Projects).getFullList({
      filter: pb.filter('user = {:userId}', { userId }),
      fields: 'status,total_diamonds,date_started,date_completed',
    });

    logger.debug(`Processing ${projects.length} projects for dashboard stats`);

    // Initialize counters
    const statusBreakdown: StatusBreakdown = {
      wishlist: 0,
      purchased: 0,
      stash: 0,
      progress: 0,
      completed: 0,
      archived: 0,
      destashed: 0,
    };

    let completedThisYear = 0;
    let startedThisYear = 0;
    let totalDiamonds = 0;
    const completionYears = new Set<number>();

    // Process all projects
    for (const project of projects) {
      // Count status breakdown
      const status = project.status as keyof StatusBreakdown;
      if (status in statusBreakdown) {
        statusBreakdown[status]++;
      }

      // Check if completed this year
      if (
        project.status === 'completed' &&
        project.date_completed &&
        project.date_completed >= yearStart &&
        project.date_completed < yearEnd
      ) {
        completedThisYear++;
        totalDiamonds += project.total_diamonds || 0;
      }

      // Extract completion years for available years
      if (project.date_completed && project.date_completed.trim() !== '') {
        try {
          const completionYear = new Date(project.date_completed).getFullYear();
          if (completionYear >= 1900 && completionYear <= 2100) {
            completionYears.add(completionYear);
          }
        } catch {
          // Invalid date, skip
        }
      }

      // Check if started this year
      if (
        project.date_started &&
        project.date_started.trim() !== '' &&
        project.date_started >= yearStart &&
        project.date_started < yearEnd
      ) {
        startedThisYear++;
      }
    }

    // Sort available years (most recent first)
    const availableYears = Array.from(completionYears).sort((a, b) => b - a);

    const stats: DashboardStats = {
      completed_count: completedThisYear,
      started_count: startedThisYear,
      in_progress_count: statusBreakdown.progress,
      total_diamonds: totalDiamonds,
      estimated_drills: totalDiamonds,
      status_breakdown: statusBreakdown,
      available_years: availableYears,
    };

    logger.debug('Dashboard stats calculated:', stats);
    return stats;
  } catch (error) {
    logger.error('Failed to calculate dashboard stats:', error);
    throw error;
  }
}

/**
 * Main hook for dashboard statistics using direct PocketBase queries
 *
 * Features:
 * - Direct PocketBase queries for maximum simplicity
 * - TanStack Query v5 built-in caching and deduplication
 * - Modern query patterns with optimal performance
 */
export const useDashboardStats = (year?: number) => {
  const { user } = useAuth();
  const userId = user?.id;
  const targetYear = year || new Date().getFullYear();

  const query = useQuery({
    queryKey: [...queryKeys.stats.overview(userId || 'anonymous'), 'dashboard', targetYear],
    queryFn: () => calculateDashboardStats(userId!, targetYear),
    enabled: !!userId,
    // TanStack Query v5 defaults provide excellent performance:
    // - 5 minute staleTime prevents unnecessary refetches
    // - 5 minute gcTime for cache cleanup
    // - Automatic request deduplication
    // - Background refetching for active queries
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry failed requests twice
  });

  return {
    // Core query data
    data: query.data,
    stats: query.data,
    dashboardStats: query.data, // Alias for backward compatibility
    availableYears: query.data?.available_years || [],
    isLoading: query.isFetching && !query.data,
    isError: query.isError,
    error: query.error,

    // Actions
    refetch: query.refetch,

    // React Query status
    queryStatus: query.status,
    fetchStatus: query.fetchStatus,
  };
};

/**
 * Hook for legacy compatibility
 */
export const useDashboardStatsLegacy = (year?: number) => {
  const dashboardStats = useDashboardStats(year);

  return {
    data: dashboardStats.data ? { stats: dashboardStats.data } : undefined,
    stats: dashboardStats.data,
    availableYears: dashboardStats.availableYears,
    isLoading: dashboardStats.isLoading,
    isError: dashboardStats.isError,
    error: dashboardStats.error,
    refetch: dashboardStats.refetch,
  };
};

/**
 * Optimized hook for available years - gets data from dashboard stats to eliminate redundant queries
 * 
 * This replaces the separate useAvailableYears hook with a more efficient approach that
 * extracts available years from the same data used for dashboard statistics.
 */
export const useAvailableYearsOptimized = (userId?: string) => {
  const dashboardStats = useDashboardStats();

  return {
    years: dashboardStats.availableYears,
    yearsWithMetadata: dashboardStats.availableYears.map(year => ({
      year,
      hasCompleted: true,
      hasStarted: false,
      hasReceived: false,
      hasPurchased: false,
    })),
    isLoading: dashboardStats.isLoading,
    error: dashboardStats.error,
    refetch: dashboardStats.refetch,
  };
};