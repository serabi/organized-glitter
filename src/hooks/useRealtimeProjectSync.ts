/**
 * PocketBase Real-time Project Synchronization Hook
 * 
 * Handles real-time project updates from PocketBase to ensure
 * React Query cache stays synchronized with external changes
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { createLogger } from '@/utils/secureLogger';
import { DashboardStatsService } from '@/services/pocketbase/dashboardStatsService';

const logger = createLogger('useRealtimeProjectSync');

interface ProjectRealtimeEvent {
  action: 'create' | 'update' | 'delete';
  record: {
    id: string;
    status: string;
    user: string;
    [key: string]: any;
  };
}

export const useRealtimeProjectSync = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      logger.debug('🔌 Real-time sync skipped - no authenticated user');
      return;
    }

    logger.info('🔌 Establishing real-time project sync for user:', user.id);

    // Subscribe to all project collection changes
    pb.collection('projects').subscribe('*', async (e: ProjectRealtimeEvent) => {
      logger.debug('📡 Received real-time project event:', {
        action: e.action,
        projectId: e.record?.id,
        projectStatus: e.record?.status,
        projectUser: e.record?.user,
        currentUser: user.id,
      });

      // Only process events for the current user's projects
      if (e.record?.user !== user.id) {
        logger.debug('⏭️ Skipping event - not current user\'s project');
        return;
      }

      try {
        const currentYear = new Date().getFullYear();

        // Invalidate affected React Query caches
        await Promise.all([
          // Project-specific caches
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.detail(e.record.id),
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.advanced(user.id),
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.lists(),
            exact: false,
            refetchType: 'active',
          }),
          // Dashboard stats caches  
          queryClient.invalidateQueries({
            queryKey: [...queryKeys.stats.overview(user.id), 'dashboard', currentYear],
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.stats.overview(user.id),
            exact: false,
          }),
        ]);

        // Update dashboard stats cache for real-time events
        if (e.action === 'update' || e.action === 'delete' || e.action === 'create') {
          try {
            await DashboardStatsService.updateCacheAfterProjectChange(user.id, currentYear);
            logger.info('✅ Dashboard stats updated after real-time event');
          } catch (error) {
            logger.error('❌ Failed to update dashboard stats after real-time event:', error);
            // Force broader invalidation as fallback
            await queryClient.invalidateQueries({
              queryKey: queryKeys.stats.overview(user.id),
              refetchType: 'active',
            });
          }
        }

        logger.info(`✅ Cache invalidated for real-time ${e.action} event:`, e.record.id);
      } catch (error) {
        logger.error('❌ Error processing real-time project event:', error);
      }
    });

    // Cleanup function
    return () => {
      logger.info('🔌 Disconnecting real-time project sync');
      try {
        pb.collection('projects').unsubscribe('*');
        logger.debug('✅ Successfully unsubscribed from project changes');
      } catch (error) {
        logger.error('❌ Error during real-time sync cleanup:', error);
      }
    };
  }, [user?.id, queryClient]);

  return {
    isConnected: !!user?.id,
  };
};