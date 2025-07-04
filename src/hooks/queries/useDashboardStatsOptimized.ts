/**
 * Optimized Dashboard Stats Hook - Single Query Performance
 * @author @serabi
 * @created 2025-07-04
 */

import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, UserDashboardStatsRecord } from '@/types/pocketbase.types';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useDashboardStatsOptimized');

/**
 * Status breakdown interface - matches existing dashboard stats format
 */
interface StatusBreakdown {
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  completed: number;
  archived: number;
  destashed: number;
}

/**
 * Dashboard stats interface - simplified for optimized performance
 */
interface DashboardStats {
  completed_count: number;
  in_progress_count: number;
  total_diamonds: number;
  status_breakdown: StatusBreakdown;
}

/**
 * Optimized dashboard stats fetcher - single fast query
 */
async function fetchOptimizedDashboardStats(userId: string): Promise<DashboardStats> {
  logger.debug(`🚀 Fetching optimized dashboard stats for user ${userId}`);
  const startTime = performance.now();

  try {
    // Single fast query to get pre-computed counts
    const statsRecord = await pb
      .collection(Collections.UserDashboardStats)
      .getFirstListItem<UserDashboardStatsRecord>(`user="${userId}"`);

    const endTime = performance.now();
    logger.debug(`⚡ Stats fetched in ${Math.round(endTime - startTime)}ms`);

    // Transform to existing dashboard stats format for compatibility
    const statusBreakdown: StatusBreakdown = {
      wishlist: statsRecord.wishlist,
      purchased: statsRecord.purchased,
      stash: statsRecord.stash,
      progress: statsRecord.progress,
      completed: statsRecord.completed,
      archived: statsRecord.archived,
      destashed: statsRecord.destashed,
    };

    const dashboardStats: DashboardStats = {
      completed_count: statsRecord.completed,
      in_progress_count: statsRecord.progress,
      total_diamonds: 0, // TODO: Add total_diamonds calculation if needed for specific year
      status_breakdown: statusBreakdown,
    };

    logger.debug('✅ Optimized dashboard stats:', {
      totalProjects: statsRecord.all,
      breakdown: statusBreakdown,
      performance: `${Math.round(endTime - startTime)}ms`,
    });

    return dashboardStats;
  } catch (error) {
    // Fallback to legacy stats if optimized collection doesn't exist yet
    if (error?.status === 404) {
      logger.warn('📊 Stats collection not found, falling back to legacy calculation');
      throw new Error('FALLBACK_TO_LEGACY');
    }

    logger.error('❌ Failed to fetch optimized dashboard stats:', error);
    throw error;
  }
}

/**
 * Optimized dashboard stats hook with fallback to legacy
 */
export const useDashboardStatsOptimized = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: [...queryKeys.stats.overview(userId || 'anonymous'), 'optimized'],
    queryFn: () => fetchOptimizedDashboardStats(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds - faster updates since data is pre-computed
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if we need to fallback to legacy
      if (error?.message === 'FALLBACK_TO_LEGACY') {
        return false;
      }
      return failureCount < 2;
    },
  });

  return {
    // Core query data
    data: query.data,
    stats: query.data,
    dashboardStats: query.data,
    isLoading: query.isFetching && !query.data,
    isError: query.isError,
    error: query.error,
    needsFallback: query.error?.message === 'FALLBACK_TO_LEGACY',

    // Actions
    refetch: query.refetch,

    // React Query status
    queryStatus: query.status,
    fetchStatus: query.fetchStatus,
  };
};

/**
 * Utility function to initialize dashboard stats for a user
 * Call this when a user signs up or when migrating existing users
 */
export async function initializeDashboardStats(userId: string): Promise<void> {
  logger.info(`🔧 Initializing dashboard stats for user ${userId}`);

  try {
    // Check if stats already exist
    try {
      await pb.collection(Collections.UserDashboardStats).getFirstListItem(`user="${userId}"`);
      logger.debug('✅ Dashboard stats already exist');
      return;
    } catch (error) {
      if (error?.status !== 404) {
        throw error;
      }
    }

    // Calculate initial stats from existing projects
    const statusCounts = await calculateInitialStats(userId);

    // Create stats record
    await pb.collection(Collections.UserDashboardStats).create({
      user: userId,
      ...statusCounts,
      last_updated: new Date().toISOString(),
    });

    logger.info('✅ Dashboard stats initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize dashboard stats:', error);
    throw error;
  }
}

/**
 * Calculate initial stats from existing projects
 */
async function calculateInitialStats(userId: string) {
  logger.debug(`📊 Calculating initial stats for user ${userId}`);

  // Get all project statuses for this user
  const projects = await pb.collection(Collections.Projects).getFullList({
    filter: `user="${userId}"`,
    fields: 'status',
  });

  // Count by status
  const counts = {
    all: projects.length,
    wishlist: 0,
    purchased: 0,
    stash: 0,
    progress: 0,
    completed: 0,
    destashed: 0,
    archived: 0,
    total_projects: projects.length,
  };

  for (const project of projects) {
    const status = project.status;
    if (status in counts) {
      counts[status]++;
    }
  }

  logger.debug('📈 Initial stats calculated:', counts);
  return counts;
}
