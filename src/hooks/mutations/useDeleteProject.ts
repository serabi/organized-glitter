import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services/pocketbase/projectService';
import { queryKeys } from '../queries/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';
import { ClientResponseError } from 'pocketbase';
import { DashboardStatsService } from '@/services/pocketbase/dashboardStatsService';

const logger = createLogger('useDeleteProject');

interface DeleteProjectData {
  id: string;
  title?: string; // Optional, for better user feedback
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: DeleteProjectData): Promise<void> => {
      logger.debug('Deleting project:', data.id);

      await projectService.deleteProject(data.id);

      logger.info('Project deleted successfully:', data.id);
    },

    onMutate: async variables => {
      // Cancel any outgoing refetches for this project
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(variables.id),
      });

      // Cancel any outgoing refetches for project lists
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.lists(),
      });

      // Cancel any outgoing refetches for advanced projects
      if (user?.id) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.projects.advanced(user.id),
        });
      }

      // Snapshot the previous project lists for rollback
      const previousProjectLists = new Map<unknown[], unknown>();

      queryClient
        .getQueriesData({
          queryKey: queryKeys.projects.lists(),
        })
        .forEach(([queryKey, data]) => {
          previousProjectLists.set([...queryKey], data);
        });

      // Snapshot the previous advanced projects data for rollback
      const previousAdvancedProjects = user?.id
        ? queryClient.getQueryData(queryKeys.projects.advanced(user.id))
        : null;

      // Snapshot the project detail data for rollback
      const previousProjectDetail = queryClient.getQueryData(
        queryKeys.projects.detail(variables.id)
      );

      // Optimistically remove the project from all cached lists
      queryClient.setQueriesData({ queryKey: queryKeys.projects.lists() }, (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('projects' in oldData)) return oldData;

        const typedData = oldData as { projects: Array<{ id: string }>; totalItems?: number };

        return {
          ...typedData,
          projects: typedData.projects.filter(p => p.id !== variables.id),
          totalItems: Math.max(0, (typedData.totalItems || 0) - 1),
        };
      });

      // Optimistically remove the project from advanced projects cache
      if (user?.id) {
        queryClient.setQueryData(queryKeys.projects.advanced(user.id), (oldData: unknown) => {
          if (!oldData || typeof oldData !== 'object' || !('projects' in oldData)) return oldData;

          const typedData = oldData as { projects: Array<{ id: string }>; totalItems?: number };

          return {
            ...typedData,
            projects: typedData.projects.filter(p => p.id !== variables.id),
            totalItems: Math.max(0, (typedData.totalItems || 0) - 1),
          };
        });
      }

      // Remove the individual project from cache
      queryClient.removeQueries({
        queryKey: queryKeys.projects.detail(variables.id),
      });

      // Return context for rollback
      return {
        previousProjectLists,
        previousAdvancedProjects,
        previousProjectDetail: previousProjectDetail
          ? {
              id: variables.id,
              data: previousProjectDetail,
            }
          : null,
      };
    },

    onSuccess: async (_, variables) => {
      // Invalidate all project lists to refresh data and get accurate counts
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });

      // Invalidate advanced projects query to update the Advanced Edit page
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.advanced(user.id),
        });

        // Force refetch to ensure UI updates immediately
        queryClient.refetchQueries({
          queryKey: queryKeys.projects.advanced(user.id),
          type: 'active',
        });
      }

      // Remove the individual project from cache (in case it wasn't already)
      queryClient.removeQueries({
        queryKey: queryKeys.projects.detail(variables.id),
      });

      // Proactively update stats cache when project is deleted
      if (user?.id) {
        await DashboardStatsService.updateCacheAfterProjectChange(user.id);

        // Invalidate React Query cache for dashboard stats to ensure immediate UI updates
        const currentYear = new Date().getFullYear();
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.stats.overview(user.id), 'dashboard', currentYear],
        });

        logger.info('Dashboard stats cache invalidated after project deletion');
      }

      toast({
        title: 'Project Deleted',
        description: variables.title
          ? `"${variables.title}" has been deleted from your collection.`
          : 'Project has been deleted from your collection.',
      });

      logger.info('Project deletion successful, cache updated');
    },

    onError: (error, _, context) => {
      // Rollback optimistic updates
      if (context?.previousProjectLists) {
        context.previousProjectLists.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      // Rollback advanced projects optimistic update
      if (context?.previousAdvancedProjects && user?.id) {
        queryClient.setQueryData(
          queryKeys.projects.advanced(user.id),
          context.previousAdvancedProjects
        );
      }

      // Re-add the individual project detail if it was removed
      if (context?.previousProjectDetail) {
        queryClient.setQueryData(
          queryKeys.projects.detail(context.previousProjectDetail.id),
          context.previousProjectDetail.data
        );
      }

      logger.error('Project deletion failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit =
        errorMessage.includes('429') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('Too many requests');

      toast({
        title: isRateLimit ? 'Too Many Requests' : 'Error Deleting Project',
        description: isRateLimit
          ? 'Server is busy. Please wait a moment and try again.'
          : errorMessage || 'Failed to delete project. Please try again.',
        variant: 'destructive',
      });
    },

    onSettled: () => {
      // Always invalidate project lists to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });

      // Always invalidate and refetch advanced projects to ensure consistency
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.advanced(user.id),
        });

        // Force refetch to ensure UI is in sync
        queryClient.refetchQueries({
          queryKey: queryKeys.projects.advanced(user.id),
          type: 'active',
        });
      }
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
