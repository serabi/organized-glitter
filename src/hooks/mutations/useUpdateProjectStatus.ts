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
import { createLogger } from '@/utils/secureLogger';
import { ClientResponseError } from 'pocketbase';
import { getCurrentDateString } from '@/utils/dateHelpers';
import { useUserTimezone } from '@/hooks/useUserTimezone';

const logger = createLogger('useUpdateProjectStatus');

interface UpdateProjectStatusData {
  projectId: string;
  newStatus: string;
}

interface MutationContext {
  previousProjects?: unknown;
  previousStatusCounts?: unknown;
  oldStatus?: string;
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

      // Prepare update data
      const updateData: { status: string; date_completed?: string | null } = {
        status: newStatus,
      };

      // Auto-set date_completed when status changes to 'completed'
      // Clear date_completed when status changes away from 'completed'
      if (newStatus === 'completed') {
        updateData.date_completed = getCurrentDateString(userTimezone);
        logger.debug(
          'Auto-setting date_completed for completed project:',
          updateData.date_completed
        );
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

      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.list(user.id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });

      // Snapshot the previous values for rollback
      const previousProjects = queryClient.getQueryData(queryKeys.projects.list(user.id));
      const previousStatusCounts = queryClient.getQueryData([
        ...queryKeys.projects.list(user.id),
        'status-counts',
      ]);

      // Find the project and its current status and date_completed
      let oldStatus: string | undefined;
      let oldDateCompleted: string | undefined;
      if (previousProjects && typeof previousProjects === 'object' && 'items' in previousProjects) {
        const typedData = previousProjects as { items?: ProjectsResponse[] };
        const project = typedData.items?.find(p => p.id === projectId);
        oldStatus = project?.status;
        oldDateCompleted = project?.date_completed;
      }

      // Optimistically update the project in all project lists
      queryClient.setQueriesData({ queryKey: queryKeys.projects.lists() }, (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('items' in oldData)) {
          return oldData;
        }

        const typedData = oldData as {
          items?: ProjectsResponse[];
          statusCounts?: Record<string, number>;
        };
        if (!typedData.items || !Array.isArray(typedData.items)) {
          return oldData;
        }

        // Update the specific project in the list
        const updatedItems = typedData.items.map((project: ProjectsResponse) => {
          if (project.id === projectId) {
            const updatedProject = { ...project, status: newStatus };
            // Add date_completed if status is completed, clear it otherwise
            if (newStatus === 'completed') {
              updatedProject.date_completed = getCurrentDateString(userTimezone);
            } else {
              // Remove date_completed when status is not completed
              delete updatedProject.date_completed;
            }
            return updatedProject;
          }
          return project;
        });

        // Update status counts optimistically
        const updatedStatusCounts = typedData.statusCounts ? { ...typedData.statusCounts } : {};

        if (oldStatus && oldStatus !== newStatus) {
          // Decrease old status count
          if (updatedStatusCounts[oldStatus]) {
            updatedStatusCounts[oldStatus] = Math.max(0, updatedStatusCounts[oldStatus] - 1);
          }
          // Increase new status count
          updatedStatusCounts[newStatus] = (updatedStatusCounts[newStatus] || 0) + 1;
        }

        return {
          ...typedData,
          items: updatedItems,
          statusCounts: updatedStatusCounts,
        };
      });

      // Update the project detail if it exists in cache
      const previousProject = queryClient.getQueryData(queryKeys.projects.detail(projectId));
      if (previousProject) {
        const updatedProject = {
          ...previousProject,
          status: newStatus,
        };

        // Handle date_completed field based on status
        if (newStatus === 'completed') {
          updatedProject.date_completed = getCurrentDateString(userTimezone);
        } else {
          // Remove date_completed when status is not completed
          delete updatedProject.date_completed;
        }

        queryClient.setQueryData(queryKeys.projects.detail(projectId), updatedProject);
      }

      logger.debug('Optimistic updates applied:', { projectId, oldStatus, newStatus });

      // Return context for rollback
      return {
        previousProjects,
        previousStatusCounts,
        oldStatus,
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
      const { projectId, newStatus } = variables;

      logger.error('Project status update failed, performing rollback:', error);

      try {
        // Rollback project lists
        if (context?.previousProjects && user?.id) {
          queryClient.setQueryData(queryKeys.projects.list(user.id), context.previousProjects);
          logger.debug('Rolled back project lists cache');
        }

        // Rollback status counts
        if (context?.previousStatusCounts && user?.id) {
          queryClient.setQueryData(
            [...queryKeys.projects.list(user.id), 'status-counts'],
            context.previousStatusCounts
          );
          logger.debug('Rolled back status counts cache');
        }

        // Rollback project detail
        const previousProject = queryClient.getQueryData(queryKeys.projects.detail(projectId));
        if (previousProject && context?.oldStatus) {
          const rolledBackProject = {
            ...previousProject,
            status: context.oldStatus,
          };

          // Restore the original date_completed state
          if (context.oldDateCompleted) {
            rolledBackProject.date_completed = context.oldDateCompleted;
          } else {
            // If there was no date_completed originally, remove it
            delete rolledBackProject.date_completed;
          }

          queryClient.setQueryData(queryKeys.projects.detail(projectId), rolledBackProject);
          logger.debug('Rolled back project detail cache');
        }
      } catch (rollbackError) {
        logger.error('Rollback failed, falling back to cache invalidation:', rollbackError);

        // If rollback fails, invalidate caches to ensure consistency
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(user.id) });
          queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
        }
      }

      // Determine error type and show appropriate message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const lowerErrorMessage = errorMessage.toLowerCase();

      const isRateLimit =
        lowerErrorMessage.includes('429') ||
        lowerErrorMessage.includes('rate limit') ||
        lowerErrorMessage.includes('too many requests');

      let title = 'Error Updating Status';
      let description = errorMessage || 'Failed to update project status. Please try again.';

      if (isRateLimit) {
        title = 'Too Many Requests';
        description = 'Server is busy. Please wait a moment and try again.';
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });

      logger.error('Project status update failed:', { projectId, newStatus, error: errorMessage });
    },

    onSettled: (_, __, variables) => {
      // Ensure fresh data after a short delay to allow server sync
      setTimeout(() => {
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(user.id) });
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.detail(variables.projectId),
          });

          // Invalidate dashboard stats for current year
          const currentYear = new Date().getFullYear();
          queryClient.invalidateQueries({
            queryKey: [...queryKeys.stats.overview(user.id), 'dashboard', currentYear],
          });
        }
      }, 1000);
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
