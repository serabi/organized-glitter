/**
 * Optimistic status update mutation for instant dashboard feedback
 * Provides immediate UI updates for project status changes while syncing to server
 * @author @serabi
 * @created 2025-07-17
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, ProjectsResponse } from '@/types/pocketbase.types';
import { queryKeys } from '../queries/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/logger';
import { ClientResponseError } from 'pocketbase';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import {
  updateProjectStatusOptimistic,
  rollbackProjectsOptimistic,
  invalidateProjectsCache,
  OptimisticProjectsContext,
} from '@/utils/optimisticUpdatesOptimized';

const logger = createLogger('useUpdateProjectStatus');

interface UpdateProjectStatusData {
  projectId: string;
  newStatus: string;
  currentStatus?: string;
}

interface MutationContext extends OptimisticProjectsContext {
  oldDateCompleted?: string;
}

export const useUpdateProjectStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const userTimezone = useUserTimezone();
  const { user } = useAuth();

  return useMutation<ProjectsResponse, Error, UpdateProjectStatusData, MutationContext>({
    mutationFn: async (data: UpdateProjectStatusData): Promise<ProjectsResponse> => {
      const { projectId, newStatus } = data;
      logger.debug('Updating project status:', { projectId, newStatus });

      // Get current project data to check existing date_started
      const currentProject = await pb.collection(Collections.Projects).getOne(projectId);

      // Prepare update data
      const updateData: {
        status: string;
        date_completed?: string | null;
        date_started?: string;
      } = {
        status: newStatus,
      };

      // Auto-set date_started when status changes to 'in-progress' (only if not already set)
      if (newStatus === 'in-progress' && !currentProject.date_started) {
        updateData.date_started = getCurrentDateString(userTimezone);
        logger.debug('Auto-setting date_started for in-progress project:', updateData.date_started);
      }

      // Auto-set date_completed when status changes to 'completed' (only if not already set)
      // Clear date_completed when status changes away from 'completed'
      // Note: date_started should be preserved for all active statuses
      if (newStatus === 'completed') {
        if (!currentProject.date_completed) {
          updateData.date_completed = getCurrentDateString(userTimezone);
          logger.debug(
            'Auto-setting date_completed for completed project:',
            updateData.date_completed
          );
        } else {
          logger.debug('Preserving existing date_completed:', currentProject.date_completed);
        }
      } else {
        updateData.date_completed = null;
        logger.debug('Clearing date_completed for non-completed project');
      }

      // Update the project
      const result = await pb.collection(Collections.Projects).update(projectId, updateData);
      logger.info('Project status updated successfully:', { projectId: result.id, newStatus });

      return result as ProjectsResponse;
    },

    onMutate: async variables => {
      const { projectId, newStatus } = variables;

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      logger.debug('🔄 [OPTIMIZED] Applying optimistic update', {
        projectId,
        newStatus,
      });

      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.forStats(user.id),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });

      // Get old date_completed for rollback
      const previousProject = queryClient.getQueryData(queryKeys.projects.detail(projectId));
      const oldDateCompleted = previousProject
        ? ((previousProject as Record<string, unknown>).date_completed as string)
        : undefined;

      // Optimistically update projects cache (stats will recalculate automatically)
      const previousProjects = updateProjectStatusOptimistic(
        queryClient,
        user.id,
        projectId,
        newStatus
      );

      // Update project detail if it exists in cache
      if (previousProject) {
        const updatedProject = {
          ...(previousProject as Record<string, unknown>),
          status: newStatus,
        } as Record<string, unknown>;

        // Auto-set date_started for in-progress projects (only if not already set)
        if (newStatus === 'in-progress' && !updatedProject.date_started) {
          updatedProject.date_started = getCurrentDateString(userTimezone);
        }

        // Handle date_completed field based on status
        // Note: date_started should be preserved for all active statuses
        if (newStatus === 'completed') {
          // Only auto-set date_completed if not already set
          if (!updatedProject.date_completed) {
            updatedProject.date_completed = getCurrentDateString(userTimezone);
          }
          // If date_completed already exists, preserve it
        } else {
          // Remove date_completed when status is not completed
          // Keep date_started intact for active statuses like "in-progress", "on-hold"
          delete updatedProject.date_completed;
        }

        queryClient.setQueryData(queryKeys.projects.detail(projectId), updatedProject);
      }

      logger.debug('✅ [OPTIMIZED] Optimistic updates applied', {
        projectId,
        newStatus,
        performance: 'Stats will recalculate automatically',
      });

      return {
        previousProjects,
        oldDateCompleted,
      };
    },

    onSuccess: async (data, variables) => {
      const { newStatus } = variables;

      if (!user?.id) return;

      // Update the project detail in cache with real data
      queryClient.setQueryData(queryKeys.projects.detail(data.id), data);

      // Show success toast
      toast({
        title: 'Status Updated',
        description: `Project status changed to ${newStatus}`,
      });

      logger.info('Project status updated successfully:', {
        projectId: data.id,
        newStatus,
        dateCompleted: data.date_completed,
      });
    },

    onError: (error, variables, context) => {
      const { projectId } = variables;

      if (!user?.id || !context?.previousProjects) return;

      logger.error('❌ [OPTIMIZED] Mutation failed, rolling back', {
        error: error.message,
        projectId,
      });

      // Rollback optimistic updates (much simpler than before)
      rollbackProjectsOptimistic(queryClient, user.id, context.previousProjects);

      // Rollback project detail
      const currentProject = queryClient.getQueryData(queryKeys.projects.detail(projectId));
      if (currentProject) {
        const rolledBackProject = {
          ...(currentProject as Record<string, unknown>),
        } as Record<string, unknown>;

        // Restore the original date_completed state
        if (context.oldDateCompleted) {
          rolledBackProject.date_completed = context.oldDateCompleted;
        } else {
          delete rolledBackProject.date_completed;
        }

        queryClient.setQueryData(queryKeys.projects.detail(projectId), rolledBackProject);
      }

      // Show error toast
      if (error instanceof ClientResponseError) {
        toast({
          title: 'Failed to update project status',
          description: error.message || 'Please try again.',
          variant: 'destructive',
        });
      }
    },

    onSettled: () => {
      if (!user?.id) return;

      logger.debug('🔄 [OPTIMIZED] Ensuring eventual consistency');

      // Invalidate projects cache to sync with server state
      // Stats will be recalculated automatically from fresh data
      invalidateProjectsCache(queryClient, user.id);
    },

    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500) {
        return false;
      }

      // Retry once for other errors
      return failureCount < 1;
    },
  });
};
