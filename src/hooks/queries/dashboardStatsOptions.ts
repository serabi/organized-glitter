import { queryOptions } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, UserDashboardStatsRecord } from '@/types/pocketbase.types';
import { createLogger } from '@/utils/logger';
import { calculateDashboardStats } from '@/services/statsService';
import { DashboardStats } from '@/types/dashboard';
import { queryKeys } from './queryKeys';

const logger = createLogger('dashboardStatsOptions');

async function fetchOptimizedStats(userId: string): Promise<DashboardStats> {
  const statsRecord = await pb
    .collection(Collections.UserDashboardStats)
    .getFirstListItem<UserDashboardStatsRecord>(`user="${userId}"`);

  return {
    completed_count: statsRecord.completed || 0,
    started_count: 0, // Not available in optimized stats
    in_progress_count: statsRecord.progress || 0,
    total_diamonds: 0, // Not available in optimized stats
    estimated_drills: 0, // Not available in optimized stats
    status_breakdown: {
      wishlist: statsRecord.wishlist || 0,
      purchased: statsRecord.purchased || 0,
      stash: statsRecord.stash || 0,
      progress: statsRecord.progress || 0,
      completed: statsRecord.completed || 0,
      archived: statsRecord.archived || 0,
      destashed: statsRecord.destashed || 0,
    },
    available_years: [], // Not available in optimized stats
  };
}

export const dashboardStatsOptions = (userId: string) => {
  return queryOptions({
    queryKey: queryKeys.stats.overview(userId),
    queryFn: async () => {
      logger.debug(`Fetching dashboard stats for user ${userId}`);
      try {
        const optimizedStats = await fetchOptimizedStats(userId);
        logger.info('Using optimized dashboard stats');
        return { stats: optimizedStats, source: 'optimized' };
      } catch (error) {
        if (error?.status === 404) {
          logger.warn('Optimized stats not found, falling back to legacy calculation.');
          const currentYear = new Date().getFullYear();
          const legacyStats = await calculateDashboardStats(userId, currentYear);
          return { stats: legacyStats, source: 'legacy' };
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    structuralSharing: true,
  });
};
