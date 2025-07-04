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
 * Calculate dashboard stats using count-based queries for optimal performance
 * Uses countRecords() and targeted queries to minimize data transfer
 */
async function calculateDashboardStats(userId: string, year: number): Promise<DashboardStats> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  logger.debug(
    `🔍 Starting dashboard stats calculation for user ${userId}, year ${year} using count-based queries`
  );

  try {
    // Status breakdown using parallel count queries - ultra fast!
    const statusCountPromises = [
      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "wishlist"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'wishlist', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "purchased"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'purchased', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "stash"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'stash', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "progress"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'progress', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "completed"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'completed', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "archived"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'archived', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "destashed"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'destashed', count: result.totalItems })),
    ];

    // Year-specific data queries - only fetch what we need
    const yearSpecificPromises = [
      // Completed this year count
      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter(
            'user = {:userId} && status = "completed" && date_completed >= {:yearStart} && date_completed < {:yearEnd}',
            { userId, yearStart, yearEnd }
          ),
          skipTotal: false,
        })
        .then(result => result.totalItems),

      // Started this year count
      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter(
            'user = {:userId} && date_started >= {:yearStart} && date_started < {:yearEnd}',
            { userId, yearStart, yearEnd }
          ),
          skipTotal: false,
        })
        .then(result => result.totalItems),

      // Total diamonds for completed projects this year
      pb.collection(Collections.Projects).getFullList({
        filter: pb.filter(
          'user = {:userId} && status = "completed" && date_completed >= {:yearStart} && date_completed < {:yearEnd}',
          { userId, yearStart, yearEnd }
        ),
        fields: 'total_diamonds',
        requestKey: `dashboard-diamonds-${userId}-${year}`,
      }),

      // Available years - only fetch date_completed field
      pb.collection(Collections.Projects).getFullList({
        filter: pb.filter('user = {:userId} && date_completed != ""', { userId }),
        fields: 'date_completed',
        requestKey: `dashboard-years-${userId}`,
      }),
    ];

    // Execute all queries in parallel for maximum performance
    const [statusCounts, yearSpecificResults] = await Promise.all([
      Promise.all(statusCountPromises),
      Promise.all(yearSpecificPromises),
    ]);

    // Extract year-specific results with proper typing
    const completedThisYear = yearSpecificResults[0] as number;
    const startedThisYear = yearSpecificResults[1] as number;
    const completedProjectsThisYear = yearSpecificResults[2] as Array<{ total_diamonds?: number }>;
    const projectsWithDates = yearSpecificResults[3] as Array<{ date_completed?: string }>;

    logger.debug(
      `Count queries completed: ${statusCounts.length} status counts, ${completedProjectsThisYear.length} completed projects this year`
    );

    // Build status breakdown from count results
    const statusBreakdown: StatusBreakdown = {
      wishlist: 0,
      purchased: 0,
      stash: 0,
      progress: 0,
      completed: 0,
      archived: 0,
      destashed: 0,
    };

    for (const { status, count } of statusCounts) {
      statusBreakdown[status as keyof StatusBreakdown] = count;
      logger.debug(`📊 Status count for ${status}: ${count}`);
    }

    // Calculate total diamonds from completed projects this year
    const totalDiamonds = completedProjectsThisYear.reduce(
      (sum, project) => sum + (project.total_diamonds || 0),
      0
    );

    // Extract available years from minimal dataset
    const completionYears = new Set<number>();
    for (const project of projectsWithDates) {
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
    }

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

    logger.debug('📈 Dashboard stats calculated using count-based queries:', {
      ...stats,
      performance: 'ultra-fast count queries + targeted data fetching',
      statusQueryCount: statusCounts.length,
      totalDataTransfer: `${completedProjectsThisYear.length} + ${projectsWithDates.length} records`,
      statusBreakdownDetails: statusBreakdown,
    });

    return stats;
  } catch (error) {
    logger.error('Failed to calculate dashboard stats with count-based queries:', error);
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
