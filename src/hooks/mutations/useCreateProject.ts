import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, ProjectsResponse } from '@/types/pocketbase.types';
import { queryKeys } from '../queries/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';
import { ClientResponseError } from 'pocketbase';
import { DashboardStatsService } from '@/services/pocketbase/dashboardStatsService';
import { TagService } from '@/lib/tags';

const logger = createLogger('useCreateProject');

interface CreateProjectData {
  title: string;
  user: string;
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
  tagIds?: string[];
}

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateProjectData): Promise<ProjectsResponse> => {
      logger.debug('Creating project:', data);

      // Resolve company and artist names to IDs if they are provided
      let companyId = null;
      let artistId = null;

      if (data.company) {
        try {
          const companyRecord = await pb
            .collection('companies')
            .getFirstListItem(`name = "${data.company}" && user = "${data.user}"`);
          companyId = companyRecord?.id || null;
        } catch (error) {
          logger.warn('Company not found:', data.company);
          companyId = null;
        }
      }

      if (data.artist) {
        try {
          const artistRecord = await pb
            .collection('artists')
            .getFirstListItem(`name = "${data.artist}" && user = "${data.user}"`);
          artistId = artistRecord?.id || null;
        } catch (error) {
          logger.warn('Artist not found:', data.artist);
          artistId = null;
        }
      }

      // Create FormData for file upload if image is present
      const formData = new FormData();

      // Add all fields except image, company, artist, and tagIds first
      Object.entries(data).forEach(([key, value]) => {
        if (
          key !== 'image' &&
          key !== 'company' &&
          key !== 'artist' &&
          key !== 'tagIds' &&
          value !== undefined &&
          value !== null
        ) {
          formData.append(key, String(value));
        }
      });

      // Add resolved company and artist IDs
      if (companyId) {
        formData.append('company', companyId);
      }
      if (artistId) {
        formData.append('artist', artistId);
      }

      // Ensure kit_category always has a value since it's required in PocketBase
      if (!formData.has('kit_category')) {
        formData.set('kit_category', 'full');
      }

      // Add image file if present
      if (data.image) {
        formData.append('image', data.image);
      }

      try {
        // Log form data for debugging (excluding file data)
        const debugData: Record<string, unknown> = {};
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            debugData[key] = `[File: ${value.name}, ${value.size} bytes]`;
          } else {
            debugData[key] = value;
          }
        }
        logger.debug('Sending FormData to PocketBase:', debugData);

        const result = await pb.collection(Collections.Projects).create(formData);
        logger.info('Project created successfully:', result.id);

        // Handle tags after project creation
        if (data.tagIds && data.tagIds.length > 0) {
          logger.debug(`Adding ${data.tagIds.length} tags to project:`, data.tagIds);

          const tagErrors: string[] = [];

          try {
            // Add tags one by one with delays to prevent autocancellation
            for (let i = 0; i < data.tagIds.length; i++) {
              const tagId = data.tagIds[i];

              try {
                // Add delay between requests to prevent rapid-fire autocancellation
                if (i > 0) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }

                const tagResponse = await TagService.addTagToProject(result.id, tagId);
                if (tagResponse.status === 'error') {
                  logger.warn(`Failed to add tag ${tagId} to project:`, tagResponse.error);
                  tagErrors.push(`Tag ${i + 1}`);
                } else {
                  logger.debug(`✅ Successfully added tag ${tagId} to project ${result.id}`);
                }
              } catch (tagError) {
                logger.error(`Error adding tag ${tagId} to project:`, tagError);

                // Check if this is an auto-cancellation error
                const errorMessage = tagError instanceof Error ? tagError.message : '';
                if (errorMessage.includes('autocancelled') || errorMessage.includes('cancelled')) {
                  logger.warn('Tag operation auto-cancelled, continuing with next tag');
                  tagErrors.push(`Tag ${i + 1} (cancelled)`);
                } else {
                  tagErrors.push(`Tag ${i + 1}`);
                }
              }
            }

            if (tagErrors.length === 0) {
              logger.info(`✅ All ${data.tagIds.length} tags added to project successfully`);
            } else {
              logger.warn(
                `⚠️ Tag operation completed with ${tagErrors.length}/${data.tagIds.length} errors:`,
                tagErrors
              );
            }
          } catch (overallTagError) {
            logger.error('Unexpected error in tag processing:', overallTagError);
            // Don't fail the entire project creation if tags fail
          }
        }

        return result as ProjectsResponse;
      } catch (error) {
        // Log detailed error information for debugging
        if (error instanceof ClientResponseError) {
          const errorDetails = {
            status: error.status,
            message: error.message,
            data: error.data,
            originalError: error.originalError,
            url: error.url,
          };

          // Use regular logger in dev, critical logger for 400 errors in production
          logger.error('PocketBase Error Details:', errorDetails);

          // Log validation errors specifically - use critical logger for 400s even in production
          if (error.status === 400) {
            logger.criticalError('400 Validation Error in Production:', {
              status: error.status,
              message: error.message,
              validationData: error.data,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              url: window.location.href,
            });
          }
        }
        throw error;
      }
    },

    onSuccess: async data => {
      // Invalidate all project lists for this user
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });

      // Invalidate the project detail query to ensure fresh data with proper imageUrl
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(data.id),
      });

      // Invalidate tag stats queries (since new projects affect tag counts)
      queryClient.invalidateQueries({
        queryKey: queryKeys.tags.stats(),
      });

      // Proactively update stats cache when project is created
      if (user?.id) {
        try {
          await DashboardStatsService.updateCacheAfterProjectChange(user.id);

          // Invalidate React Query cache for dashboard stats to ensure immediate UI updates
          const currentYear = new Date().getFullYear();
          queryClient.invalidateQueries({
            queryKey: [...queryKeys.stats.overview(user.id), 'dashboard', currentYear],
          });

          logger.info('Dashboard stats cache invalidated after project creation');
        } catch (error) {
          // Log cache update error but don't propagate to mutation error handler
          logger.error('Failed to update stats cache after project creation:', error);
        }
      }

      toast({
        title: 'Project Created',
        description: `"${data.title}" has been added to your collection.`,
      });

      logger.info('Project creation successful, cache invalidated');
    },

    onError: error => {
      logger.error('Project creation failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit =
        errorMessage.includes('429') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('Too many requests');

      // Handle 400 validation errors specifically
      if (error instanceof ClientResponseError && error.status === 400) {
        // Log the error for production debugging
        logger.criticalError('Project creation 400 error:', {
          error: error.message,
          data: error.data,
          timestamp: new Date().toISOString(),
        });

        // Extract validation error messages
        const validationErrors = error.data?.data;
        let userFriendlyMessage = 'Please check your project information and try again.';

        if (validationErrors) {
          // Try to extract meaningful field errors
          const fieldErrors = Object.keys(validationErrors).map(field => {
            const fieldError = validationErrors[field];
            const message = fieldError?.message || String(fieldError);
            return `${field}: ${message}`;
          });

          if (fieldErrors.length > 0) {
            userFriendlyMessage = `Validation errors: ${fieldErrors.join(', ')}`;
          }
        }

        toast({
          title: 'Validation Error',
          description: userFriendlyMessage,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: isRateLimit ? 'Too Many Requests' : 'Error Creating Project',
        description: isRateLimit
          ? 'Server is busy. Please wait a moment and try again.'
          : errorMessage || 'Failed to create project. Please try again.',
        variant: 'destructive',
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
