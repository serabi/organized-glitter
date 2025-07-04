/**
 * PocketBase Real-time Project Synchronization Hook
 *
 * Handles real-time project updates from PocketBase to ensure
 * React Query cache stays synchronized with external changes
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { createLogger } from '@/utils/secureLogger';
import { RecordModel } from 'pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { safeInvalidateQueries } from '@/utils/queryInvalidationGuard';
import { QueryKey } from '@tanstack/react-query';

const logger = createLogger('useRealtimeProjectSync');

// Debounce time for batching invalidations
const INVALIDATION_DEBOUNCE_MS = 500;

interface ProjectRealtimeEvent {
  action: 'create' | 'update' | 'delete';
  record: RecordModel & {
    status: string;
    user: string;
  };
}

interface StatsRealtimeEvent {
  action: 'create' | 'update' | 'delete';
  record: RecordModel & {
    user: string;
  };
}

export const useRealtimeProjectSync = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Refs for debounced invalidation
  const invalidationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingInvalidationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) {
      logger.debug('🔌 Real-time sync skipped - no authenticated user');
      return;
    }

    logger.info('🔌 Establishing real-time project sync for user:', user.id);

    const processPendingInvalidations = () => {
      const queryKeysToInvalidate = Array.from(pendingInvalidationsRef.current).map(key =>
        JSON.parse(key)
      );
      pendingInvalidationsRef.current.clear();

      if (queryKeysToInvalidate.length > 0) {
        logger.info('⚡️ Processing batched invalidations', {
          count: queryKeysToInvalidate.length,
          keys: queryKeysToInvalidate.map(k => k.join('.')),
        });
        queryKeysToInvalidate.forEach(queryKey => {
          safeInvalidateQueries(
            queryClient,
            { queryKey, exact: true, refetchType: 'active' },
            { source: `realtime:batched:${queryKey[0]}` }
          );
        });
      }
    };

    const scheduleInvalidation = (queryKey: QueryKey, source: string) => {
      pendingInvalidationsRef.current.add(JSON.stringify(queryKey));
      if (invalidationTimerRef.current) {
        clearTimeout(invalidationTimerRef.current);
      }
      logger.debug(`⏳ Scheduling invalidation for ${source}`, { queryKey });
      invalidationTimerRef.current = setTimeout(
        processPendingInvalidations,
        INVALIDATION_DEBOUNCE_MS
      );
    };

    // Subscribe to all project collection changes
    pb.collection('projects').subscribe('*', async (e: ProjectRealtimeEvent) => {
      logger.debug('📡 Received real-time project event:', {
        action: e.action,
        projectId: e.record?.id,
        projectStatus: e.record?.status,
        projectUser: e.record?.user,
        currentUser: user.id,
      });

      if (e.record?.user !== user.id) {
        logger.debug("⏭️ Skipping event - not current user's project");
        return;
      }

      try {
        // --- Smart Invalidation Logic ---
        const { action, record } = e;
        const source = `realtime:project-${action}`;

        // Always invalidate the specific project detail on any change
        scheduleInvalidation(queryKeys.projects.detail(record.id), `${source}:detail`);

        // For any change, lists and high-level stats are likely affected
        scheduleInvalidation(queryKeys.projects.advanced(user.id), `${source}:advanced-list`);
        scheduleInvalidation(queryKeys.projects.lists(), `${source}:project-lists`);

        // Critical: Invalidate stats overview, now debounced
        scheduleInvalidation(queryKeys.stats.overview(user.id), `${source}:stats-overview`);

        logger.info(`✅ Queued invalidations for real-time ${action} event:`, record.id);
      } catch (error) {
        logger.error('❌ Error processing real-time project event:', error);
      }
    });

    // Subscribe to dashboard stats collection changes for live count updates
    pb.collection(Collections.UserDashboardStats).subscribe('*', async (e: StatsRealtimeEvent) => {
      logger.debug('📊 Received real-time stats event:', {
        action: e.action,
        statsId: e.record?.id,
        statsUser: e.record?.user,
        currentUser: user.id,
      });

      // Only process events for the current user's stats
      if (e.record?.user !== user.id) {
        logger.debug("⏭️ Skipping stats event - not current user's data");
        return;
      }

      try {
        // Invalidate optimized dashboard stats cache for instant updates
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [...queryKeys.stats.overview(user.id), 'optimized'],
            exact: true,
            refetchType: 'active',
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.stats.overview(user.id),
            exact: false,
            refetchType: 'active',
          }),
        ]);

        logger.info(`✅ Live stats updated for ${e.action} event`);
      } catch (error) {
        logger.error('❌ Error processing real-time stats event:', error);
      }
    });

    // Cleanup function
    return () => {
      logger.info('🔌 Disconnecting real-time project sync');
      if (invalidationTimerRef.current) {
        clearTimeout(invalidationTimerRef.current);
      }
      try {
        pb.collection('projects').unsubscribe('*');
        pb.collection(Collections.UserDashboardStats).unsubscribe('*');
        logger.debug('✅ Successfully unsubscribed from project and stats changes');
      } catch (error) {
        logger.error('❌ Error during real-time sync cleanup:', error);
      }
    };
  }, [user?.id, queryClient]);

  return {
    isConnected: !!user?.id,
  };
};
