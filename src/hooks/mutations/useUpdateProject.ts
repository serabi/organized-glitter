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

const logger = createLogger('useUpdateProject');

// Utility function to sanitize variables for logging
const sanitizeForLogging = (variables: Record<string, unknown>) => {
  const sanitized = { ...variables };

  // Remove or replace File objects to avoid cluttering logs
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] instanceof File) {
      const file = sanitized[key] as File;
      sanitized[key] = `[File: ${file.name}, size: ${file.size} bytes]`;
    }
  });

  return sanitized;
};

interface UpdateProjectData {
  id: string;
  title?: string;
  company?: string;
  artist?: string;
  status?: string;
  kit_category?: string;
  drill_shape?: string;
  date_purchased?: string;
  date_started?: string;
  date_completed?: string;
  date_received?: string;
  width?: number;
  height?: number;
  total_diamonds?: number;
  general_notes?: string;
  image?: File;
  source_url?: string;
  [key: string]: unknown;
}

interface MutationContext {
  previousProject?: unknown;
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const userTimezone = useUserTimezone();
  const { user } = useAuth();

  return useMutation<ProjectsResponse, Error, UpdateProjectData, MutationContext>({
    mutationFn: async (data: UpdateProjectData): Promise<ProjectsResponse> => {
      const { id, ...updateData } = data;
      logger.debug('Updating project:', id, updateData);

      // Auto-set date_completed when status changes to 'completed'
      if (updateData.status === 'completed' && !updateData.date_completed) {
        updateData.date_completed = getCurrentDateString(userTimezone);
        logger.debug(
          'Auto-setting date_completed for completed project:',
          updateData.date_completed
        );
      }

      // Create FormData for file upload if image is present
      const formData = new FormData();

      // Add all fields except image
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'image' && value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      // Add image file if present
      if (data.image) {
        formData.append('image', data.image);
      }

      // Update the project
      const result = await pb.collection(Collections.Projects).update(id, formData);
      logger.info('Project updated successfully:', result.id);

      return result as ProjectsResponse;
    },

    onMutate: async variables => {
      // Cancel any outgoing refetches for this project
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(variables.id),
      });

      // Snapshot the previous values for rollback
      const previousProject = queryClient.getQueryData(queryKeys.projects.detail(variables.id));

      // Optimistically update the project detail if it exists in cache
      if (previousProject) {
        queryClient.setQueryData(queryKeys.projects.detail(variables.id), {
          ...previousProject,
          ...variables,
        });
      }

      // Return context for rollback
      return {
        previousProject,
      };
    },

    onSuccess: async (data, variables) => {
      // Update the project detail in cache
      queryClient.setQueryData(queryKeys.projects.detail(data.id), data);

      // Use optimistic updates for immediate feedback
      logger.debug('Using optimistic in-place cache update');

      queryClient.setQueriesData({ queryKey: queryKeys.projects.lists() }, (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('items' in oldData)) {
          return oldData;
        }

        const typedData = oldData as { items?: ProjectsResponse[]; [key: string]: unknown };
        if (!typedData.items || !Array.isArray(typedData.items)) {
          return oldData;
        }

        // Update the specific project in the list while preserving order
        return {
          ...typedData,
          items: typedData.items.map((project: ProjectsResponse) => {
            if (project.id === data.id) {
              // Merge the updated data with the existing project
              return { ...project, ...data };
            }
            return project;
          }),
        };
      });

      // NOTE: Using optimistic updates to prevent position jumping during edits.
      // The visual order remains stable for all updates until user explicitly changes sorting.

      // Smart cache invalidation - only invalidate what actually changed
      if (user?.id) {
        // Always invalidate project lists (for updated project data)
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.lists(),
        });

        // Only invalidate status counts if status actually changed
        if (variables.status) {
          logger.info('Status update detected - invalidating status count caches', {
            newStatus: variables.status,
            projectId: data.id,
          });

          // Invalidate all project queries that include status counts
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.lists(),
          });

          // Invalidate dashboard stats for current year
          const currentYear = new Date().getFullYear();
          queryClient.invalidateQueries({
            queryKey: [...queryKeys.stats.overview(user.id), 'dashboard', currentYear],
          });
        } else {
          logger.info('Non-status update - preserving status count cache for performance');
        }

        logger.info('Cache invalidation completed');
      }

      toast({
        title: 'Project Updated',
        description: `"${data.title}" has been updated successfully.`,
      });

      // Log if this was a status change for debugging
      if (variables.status) {
        logger.info('Project status updated:', {
          projectId: data.id,
          newStatus: variables.status,
          dateCompleted: data.date_completed,
        });
      }

      logger.info('Project updated: fields updated in-place to preserve position');
    },

    onError: (error, variables, context) => {
      // Comprehensive rollback for failed mutations
      logger.error('Project update failed, performing rollback:', error);

      try {
        // Rollback project detail cache
        if (context?.previousProject) {
          queryClient.setQueryData(
            queryKeys.projects.detail(variables.id),
            context.previousProject
          );
          logger.debug('Rolled back project detail cache');
        }
      } catch (rollbackError) {
        logger.error('Rollback failed, falling back to cache invalidation:', rollbackError);

        // If rollback fails, invalidate caches to ensure consistency
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(variables.id),
        });
      }

      logger.error('Project update failed:', error);
      logger.error('Failed update variables:', sanitizeForLogging(variables));

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const lowerErrorMessage = errorMessage.toLowerCase();
      const isRateLimit =
        lowerErrorMessage.includes('429') ||
        lowerErrorMessage.includes('rate limit') ||
        lowerErrorMessage.includes('too many requests');

      const isForeignKeyError =
        lowerErrorMessage.includes('foreign key') ||
        lowerErrorMessage.includes('artist') ||
        lowerErrorMessage.includes('company') ||
        lowerErrorMessage.includes('relation');

      let title = 'Error Updating Project';
      let description = errorMessage || 'Failed to update project. Please try again.';

      if (isRateLimit) {
        title = 'Too Many Requests';
        description = 'Server is busy. Please wait a moment and try again.';
      } else if (isForeignKeyError) {
        title = 'Invalid Field Reference';
        description =
          'Artist or company reference is invalid. Please try selecting from the dropdown again.';
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });
    },

    onSettled: (_, __, variables) => {
      // Always refetch the project detail to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.id),
      });
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
