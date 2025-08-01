/**
 * Dashboard Stats Updater Hook - Auto-update stats on project changes
 * @author @serabi
 * @created 2025-07-04
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { updateDashboardStats } from '@/services/dashboardStatsService';
import { ProjectStatusChangeEvent } from '@/types/user-dashboard-stats';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useDashboardStatsUpdater');

/**
 * Hook to update dashboard stats when projects change
 */
export const useDashboardStatsUpdater = () => {
  const queryClient = useQueryClient();

  const updateStats = useCallback(
    async (event: ProjectStatusChangeEvent) => {
      logger.debug('📊 Updating dashboard stats for project change:', event);

      try {
        // Update the stats in the database
        await updateDashboardStats(event);

        // Invalidate and refetch optimized stats
        await queryClient.invalidateQueries({
          queryKey: [...queryKeys.stats.overview(event.userId), 'optimized'],
        });

        // Also invalidate legacy stats cache for compatibility
        await queryClient.invalidateQueries({
          queryKey: queryKeys.stats.overview(event.userId),
        });

        logger.debug('✅ Dashboard stats updated and cache invalidated');
      } catch (error) {
        logger.error('❌ Failed to update dashboard stats:', error);
        // Don't throw - stats updates shouldn't break the main flow
      }
    },
    [queryClient]
  );

  return { updateStats };
};

/**
 * Helper hook for project creation
 */
export const useProjectCreateStatsUpdate = () => {
  const { updateStats } = useDashboardStatsUpdater();

  return useCallback(
    async (userId: string, projectStatus: string) => {
      await updateStats({
        userId,
        newStatus: projectStatus,
        operation: 'create',
      });
    },
    [updateStats]
  );
};

/**
 * Helper hook for project status updates
 */
export const useProjectUpdateStatsUpdate = () => {
  const { updateStats } = useDashboardStatsUpdater();

  return useCallback(
    async (userId: string, oldStatus: string, newStatus: string) => {
      await updateStats({
        userId,
        oldStatus,
        newStatus,
        operation: 'update',
      });
    },
    [updateStats]
  );
};

/**
 * Helper hook for project deletion
 */
export const useProjectDeleteStatsUpdate = () => {
  const { updateStats } = useDashboardStatsUpdater();

  return useCallback(
    async (userId: string, projectStatus: string) => {
      await updateStats({
        userId,
        oldStatus: projectStatus,
        newStatus: '', // Empty string for delete operations
        operation: 'delete',
      });
    },
    [updateStats]
  );
};
