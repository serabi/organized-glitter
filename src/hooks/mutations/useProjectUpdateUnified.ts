/**
 * Unified project update mutation hook with proper file upload handling
 * Replaces fragmented update logic with a single, type-safe approach
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, ProjectsResponse } from '@/types/pocketbase.types';
import { queryKeys } from '../queries/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';
import { ClientResponseError } from 'pocketbase';
import type { ProjectUpdatePayload, ProjectFormWithFile } from '@/types/file-upload';
import { mapFormDataToPocketBase } from '@/utils/field-mapping';
import {
  buildFormDataForUpdate,
  validateFormDataForUpdate,
  logFormData,
} from '@/utils/formdata-builder';

const logger = createLogger('useProjectUpdateUnified');

/**
 * Unified project update hook that handles both regular updates and file uploads
 * Provides type safety and proper field name mapping
 */
export const useProjectUpdateUnified = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      payload: ProjectUpdatePayload | ProjectFormWithFile
    ): Promise<ProjectsResponse> => {
      let projectId: string;
      let formData: FormData;

      // Handle different payload types
      if ('id' in payload && 'data' in payload) {
        // ProjectUpdatePayload format
        const { id, data, fileUpload } = payload as ProjectUpdatePayload;
        projectId = id;

        // Use the new FormData builder
        formData = buildFormDataForUpdate(data, fileUpload?.file);
      } else {
        // ProjectFormWithFile format (legacy compatibility)
        const formPayload = payload as ProjectFormWithFile;
        if (!formPayload.id) {
          throw new Error('Project ID is required for update');
        }

        projectId = formPayload.id;

        // Map form data to PocketBase format
        const mappedData = mapFormDataToPocketBase(formPayload);

        // Auto-set date_completed when status changes to 'completed'
        if (mappedData.status === 'completed' && !mappedData.date_completed) {
          mappedData.date_completed = new Date().toISOString().split('T')[0];
          logger.debug('Auto-setting date_completed for completed project');
        }

        // Use the new FormData builder with proper type handling
        formData = buildFormDataForUpdate(mappedData, formPayload.imageFile || undefined);
      }

      // Validate FormData before sending
      const validation = validateFormDataForUpdate(formData, ['title']); // title is required
      if (!validation.isValid) {
        const errorMessage = `Validation failed: ${validation.errors.join(', ')}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Log FormData for debugging in development
      logFormData(formData, `Project Update: ${projectId}`);

      logger.debug('Updating project with unified mutation:', { projectId });

      try {
        const result = await pb.collection(Collections.Projects).update(projectId, formData);
        logger.info('Project updated successfully:', result.id);
        return result as ProjectsResponse;
      } catch (error) {
        // Enhanced error logging for 400 errors
        if (error instanceof ClientResponseError && error.status === 400) {
          logger.error('PocketBase 400 Error Details:', {
            status: error.status,
            message: error.message,
            data: error.data,
            response: error.response,
            url: error.url,
          });

          // Log the specific validation errors if available
          if (error.data) {
            logger.error(
              'PocketBase Validation Errors (detailed):',
              JSON.stringify(error.data, null, 2)
            );
          }

          // Log the FormData being sent for debugging
          logger.error(
            'FormData being sent:',
            Array.from(formData.entries()).map(([key, value]) => ({
              key,
              value:
                value instanceof File
                  ? `[File: ${value.name}, ${value.size} bytes, ${value.type}]`
                  : value,
            }))
          );
        }
        throw error;
      }
    },

    onMutate: async variables => {
      const projectId =
        'id' in variables && 'data' in variables
          ? variables.id
          : (variables as ProjectFormWithFile).id;

      if (!projectId) return {};

      // Cancel any outgoing refetches for this project
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });

      // Snapshot the previous value for rollback
      const previousProject = queryClient.getQueryData(queryKeys.projects.detail(projectId));

      // Optimistically update the project detail if it exists in cache
      if (previousProject) {
        const updateData = 'data' in variables ? variables.data : variables;
        queryClient.setQueryData(queryKeys.projects.detail(projectId), {
          ...(previousProject as object),
          ...(updateData as object),
        });
      }

      return { previousProject, projectId };
    },

    onSuccess: async (data, _variables, context) => {
      const projectId = context?.projectId || data.id;

      // Update the project detail in cache
      queryClient.setQueryData(queryKeys.projects.detail(projectId), data);

      // Invalidate all project lists to refresh data
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });

      // Invalidate dashboard stats cache when project is updated
      if (user?.id) {
        const currentYear = new Date().getFullYear();
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.stats.overview(user.id), 'dashboard', currentYear],
        });
        logger.info('Dashboard stats cache invalidated after project update');
      }

      toast({
        title: 'Project Updated',
        description: `"${data.title}" has been updated successfully.`,
      });

      logger.info('Project update successful, cache update initiated');
    },

    onError: (error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousProject && context?.projectId) {
        queryClient.setQueryData(
          queryKeys.projects.detail(context.projectId),
          context.previousProject
        );
      }

      logger.error('Project update failed:', error);

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

      const isFileError =
        lowerErrorMessage.includes('file') ||
        lowerErrorMessage.includes('upload') ||
        lowerErrorMessage.includes('image');

      let title = 'Error Updating Project';
      let description = errorMessage || 'Failed to update project. Please try again.';

      if (isRateLimit) {
        title = 'Too Many Requests';
        description = 'Server is busy. Please wait a moment and try again.';
      } else if (isForeignKeyError) {
        title = 'Invalid Field Reference';
        description =
          'Artist or company reference is invalid. Please try selecting from the dropdown again.';
      } else if (isFileError) {
        title = 'File Upload Error';
        description = 'Failed to upload image. Please check the file and try again.';
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });
    },

    onSettled: (_, __, variables, context) => {
      const projectId =
        context?.projectId ||
        ('id' in variables && 'data' in variables
          ? variables.id
          : (variables as ProjectFormWithFile).id);

      if (projectId) {
        // Always refetch the project detail to ensure consistency
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(projectId),
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
