import { useMutation, useQueryClient, notifyManager } from '@tanstack/react-query';
import { startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { ProjectStatus } from '@/types/project';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';
import { DashboardStatsService } from '@/services/pocketbase/dashboardStatsService';

const logger = createLogger('useProjectDetailMutations');

// Constants for project status values
const PROJECT_STATUS = {
  ARCHIVED: 'archived' as const,
} satisfies Record<string, ProjectStatus>;

// Helper function to invalidate project-related queries with precise targeting
const invalidateProjectQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId?: string,
  userId?: string,
  updateStatsCache?: () => Promise<void>,
  isDeletion?: boolean
) => {
  const invalidations: Promise<void>[] = [];

  // Handle project-specific cache based on operation type
  if (projectId) {
    if (isDeletion) {
      // For deletions, remove the project and related data completely from cache to prevent 404 refetch attempts
      invalidations.push(
        queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId), exact: true }),
        queryClient.removeQueries({
          queryKey: queryKeys.progressNotes.list(projectId),
          exact: true,
        })
      );
    } else {
      // For non-deletion operations, invalidate to trigger refetch with fresh data
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(projectId),
          exact: true,
        })
      );
    }
  }

  // Precisely invalidate project lists - avoid broad invalidation
  if (userId) {
    invalidations.push(
      // Only invalidate advanced projects for this specific user
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.advanced(userId),
        exact: true,
      })
    );

    // For paginated lists, we use exact: false but with specific user context
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
        exact: false,
        refetchType: 'active', // Only refetch currently active queries
      })
    );
  } else {
    // Fallback: broader invalidation if no userId
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
        refetchType: 'active',
      })
    );
  }

  // Precisely invalidate tag stats with exact matching
  invalidations.push(
    queryClient.invalidateQueries({
      queryKey: queryKeys.tags.stats(),
      exact: true,
      refetchType: 'none', // Mark stale but don't refetch immediately
    })
  );

  // Update overview stats cache when function is provided
  if (updateStatsCache) {
    invalidations.push(updateStatsCache());
  }

  // Wait for all invalidations to complete
  await Promise.all(invalidations);

  // Background stats cache update - no longer blocking
  if (userId) {
    startTransition(() => {
      DashboardStatsService.updateCacheAfterProjectChange(userId)
        .then(() => {
          logger.info('Background stats cache updated successfully after project change:', {
            projectId,
          });
        })
        .catch(error => {
          logger.error('Failed to update stats cache after project change:', error);
          // Fallback: mark stats as stale for next access
          queryClient.invalidateQueries({
            queryKey: queryKeys.stats.overview(userId),
            refetchType: 'none',
          });
        });
    });
  }
};

// Helper function to handle common error logging and toast
const handleMutationError = (
  error: unknown,
  context: string,
  toast: ReturnType<typeof useToast>['toast']
) => {
  logger.error(`Error ${context}:`, error);
  toast({
    title: 'Error',
    description: `Failed to ${context}`,
    variant: 'destructive',
  });
};

/**
 * Mutation hook for updating project status
 */
export const useUpdateProjectStatusMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: ProjectStatus }) => {
      logger.debug('Updating project status:', { projectId, status });

      const updateData: { status: ProjectStatus; date_completed?: string } = { status };

      // Auto-set date_completed when status changes to 'completed'
      if (status === 'completed') {
        updateData.date_completed = new Date().toISOString().split('T')[0];
        logger.debug(
          'Auto-setting date_completed for completed project:',
          updateData.date_completed
        );
      }

      return await pb.collection(Collections.Projects).update(projectId, updateData);
    },
    onSuccess: async (_, { projectId, status }) => {
      // Optimistic cache updates for immediate UI feedback
      if (user?.id) {
        notifyManager.batch(() => {
          // Optimistically update project status in advanced projects list
          queryClient.setQueryData(queryKeys.projects.advanced(user.id), (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object' || !('projects' in oldData)) return oldData;
            const data = oldData as { projects: Array<{ id: string; [key: string]: unknown }> };
            return {
              ...data,
              projects: data.projects.map(p => (p.id === projectId ? { ...p, status } : p)),
            };
          });

          // Optimistically update any paginated project lists
          queryClient.setQueriesData(
            { queryKey: queryKeys.projects.lists(), exact: false },
            (oldData: unknown) => {
              if (!oldData || typeof oldData !== 'object' || !('projects' in oldData))
                return oldData;
              const data = oldData as { projects: Array<{ id: string; [key: string]: unknown }> };
              return {
                ...data,
                projects: data.projects.map(p => (p.id === projectId ? { ...p, status } : p)),
              };
            }
          );

          // Update project detail cache
          queryClient.setQueryData(queryKeys.projects.detail(projectId), (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object') return oldData;
            return { ...(oldData as Record<string, unknown>), status };
          });

          // Mark dashboard stats as stale without immediate refetch
          queryClient.invalidateQueries({
            queryKey: queryKeys.stats.overview(user.id),
            refetchType: 'none',
          });
        });
      }

      toast({
        title: 'Success',
        description: `Project status updated to ${status.replace('_', ' ')}`,
        variant: 'default',
      });

      logger.info('Project status updated successfully:', { projectId, status });

      // Background stats update
      startTransition(() => {
        if (user?.id) {
          DashboardStatsService.updateCacheAfterProjectChange(user.id).catch(error => {
            logger.error('Background stats cache update failed:', error);
            queryClient.invalidateQueries({ queryKey: queryKeys.stats.overview(user.id) });
          });
        }
      });
    },
    onError: error => {
      handleMutationError(error, 'update project status', toast);
    },
  });
};

/**
 * Mutation hook for updating project notes
 */
export const useUpdateProjectNotesMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, notes }: { projectId: string; notes: string }) => {
      return await pb.collection(Collections.Projects).update(projectId, { general_notes: notes });
    },
    onSuccess: (_, { projectId }) => {
      // Precisely invalidate only the specific project detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
        exact: true,
      });

      toast({
        title: 'Success',
        description: 'Project notes updated successfully',
        variant: 'default',
      });
    },
    onError: error => {
      handleMutationError(error, 'update project notes', toast);
    },
  });
};

/**
 * Mutation hook for adding a progress note
 */
export const useAddProgressNoteMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      projectId,
      noteData,
    }: {
      projectId: string;
      noteData: { date: string; content: string; imageFile?: File };
    }) => {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('content', noteData.content);
      formData.append('date', noteData.date);

      if (noteData.imageFile) {
        formData.append('image', noteData.imageFile);
      }

      return await pb.collection(Collections.ProgressNotes).create(formData);
    },
    onSuccess: (_, { projectId }) => {
      // Use batch for efficient cache updates
      notifyManager.batch(() => {
        // Precisely invalidate the specific project detail
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(projectId),
          exact: true,
        });
        // Precisely invalidate progress notes for this project
        queryClient.invalidateQueries({
          queryKey: queryKeys.progressNotes.list(projectId),
          exact: true,
        });
      });

      toast({
        title: 'Success',
        description: 'Progress note added successfully',
        variant: 'default',
      });
    },
    onError: error => {
      handleMutationError(error, 'add progress note', toast);
    },
  });
};

/**
 * Mutation hook for updating a progress note
 */
export const useUpdateProgressNoteMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      noteId,
      content,
    }: {
      noteId: string;
      projectId: string;
      content: string;
    }) => {
      return await pb.collection(Collections.ProgressNotes).update(noteId, { content });
    },
    onSuccess: (_, { projectId }) => {
      // Use batch for efficient cache updates
      notifyManager.batch(() => {
        // Precisely invalidate the specific project detail
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(projectId),
          exact: true,
        });
        // Precisely invalidate progress notes for this project
        queryClient.invalidateQueries({
          queryKey: queryKeys.progressNotes.list(projectId),
          exact: true,
        });
      });

      toast({
        title: 'Success',
        description: 'Progress note updated successfully',
        variant: 'default',
      });
    },
    onError: error => {
      handleMutationError(error, 'update progress note', toast);
    },
  });
};

/**
 * Mutation hook for deleting a progress note
 */
export const useDeleteProgressNoteMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ noteId, projectId }: { noteId: string; projectId?: string }) => {
      logger.debug('Deleting progress note:', { noteId, projectId });
      return await pb.collection(Collections.ProgressNotes).delete(noteId);
    },
    onSuccess: (_, { projectId }) => {
      // Use batch for efficient cache updates
      notifyManager.batch(() => {
        if (projectId) {
          // Precisely invalidate specific project queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.detail(projectId),
            exact: true,
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.progressNotes.list(projectId),
            exact: true,
          });
        } else {
          // Otherwise invalidate broader queries with exact matching where possible
          queryClient.invalidateQueries({
            queryKey: queryKeys.progressNotes.all,
            exact: true,
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.details(),
            exact: true,
          });
        }
      });

      toast({
        title: 'Success',
        description: 'Progress note deleted successfully',
        variant: 'default',
      });

      logger.info('Progress note deleted successfully');
    },
    onError: error => {
      handleMutationError(error, 'delete progress note', toast);
    },
  });
};

/**
 * Mutation hook for removing image from a progress note
 */
export const useDeleteProgressNoteImageMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ noteId, projectId: _ }: { noteId: string; projectId: string }) => {
      return await pb.collection(Collections.ProgressNotes).update(noteId, { image: null });
    },
    onSuccess: (_, { projectId }) => {
      // Use batch for efficient cache updates
      notifyManager.batch(() => {
        // Precisely invalidate the specific project detail
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(projectId),
          exact: true,
        });
        // Precisely invalidate progress notes for this project
        queryClient.invalidateQueries({
          queryKey: queryKeys.progressNotes.list(projectId),
          exact: true,
        });
      });

      toast({
        title: 'Success',
        description: 'Progress note image removed successfully',
        variant: 'default',
      });
    },
    onError: error => {
      handleMutationError(error, 'remove progress note image', toast);
    },
  });
};

/**
 * Mutation hook for archiving a project
 */
export const useArchiveProjectMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ projectId }: { projectId: string }) => {
      logger.debug('Archiving project:', { projectId });
      return await pb
        .collection(Collections.Projects)
        .update(projectId, { status: PROJECT_STATUS.ARCHIVED });
    },
    onSuccess: async (_, { projectId }) => {
      // Show immediate user feedback
      toast({
        title: 'Project Archived',
        description: 'Your project has been archived successfully',
        variant: 'default',
      });

      logger.info('Project archived successfully:', { projectId });

      // Optimistic cache updates - immediate UI feedback
      if (user?.id) {
        notifyManager.batch(() => {
          // Optimistically update project status in advanced projects list
          queryClient.setQueryData(queryKeys.projects.advanced(user.id), (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object' || !('projects' in oldData)) return oldData;
            const data = oldData as { projects: Array<{ id: string; [key: string]: unknown }> };
            return {
              ...data,
              projects: data.projects.map(p =>
                p.id === projectId ? { ...p, status: PROJECT_STATUS.ARCHIVED } : p
              ),
            };
          });

          // Optimistically update any paginated project lists
          queryClient.setQueriesData(
            { queryKey: queryKeys.projects.lists(), exact: false },
            (oldData: unknown) => {
              if (!oldData || typeof oldData !== 'object' || !('projects' in oldData))
                return oldData;
              const data = oldData as { projects: Array<{ id: string; [key: string]: unknown }> };
              return {
                ...data,
                projects: data.projects.map(p =>
                  p.id === projectId ? { ...p, status: PROJECT_STATUS.ARCHIVED } : p
                ),
              };
            }
          );

          // Update project detail cache if it exists
          queryClient.setQueryData(queryKeys.projects.detail(projectId), (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object') return oldData;
            return { ...(oldData as Record<string, unknown>), status: PROJECT_STATUS.ARCHIVED };
          });

          // Mark dashboard stats as stale without immediate refetch
          queryClient.invalidateQueries({
            queryKey: queryKeys.stats.overview(user.id),
            refetchType: 'none',
          });
        });
      }

      // Navigate using React Router for consistent routing
      logger.info('🚀 Navigating to dashboard');
      navigate('/dashboard', { replace: true });

      // Defer non-critical stats updates to background
      startTransition(() => {
        if (user?.id) {
          DashboardStatsService.updateCacheAfterProjectChange(user.id)
            .then(() => logger.info('Background stats cache update completed'))
            .catch(error => {
              logger.error('Background stats cache update failed:', error);
              queryClient.invalidateQueries({ queryKey: queryKeys.stats.overview(user.id) });
            });
        }
      });
    },
    onError: error => {
      handleMutationError(error, 'archive project', toast);
    },
  });
};

/**
 * Helper function to delete related records before deleting a project
 * Uses batch processing and parallel deletions for better performance
 */
const deleteProjectRelatedRecords = async (projectId: string) => {
  const BATCH_SIZE = 50;
  const PARALLEL_LIMIT = 5;

  // Helper function to delete records in parallel batches
  const deleteInBatches = async (collection: Collections, filter: string, recordType: string) => {
    let page = 1;
    let hasMore = true;
    let totalDeleted = 0;

    try {
      while (hasMore) {
        // Fetch a batch of records
        const records = await pb.collection(collection).getList(page, BATCH_SIZE, {
          filter,
          fields: 'id', // Only fetch IDs to minimize memory usage
        });

        if (!records || !records.items || records.items.length === 0) {
          hasMore = false;
          break;
        }

        logger.debug(`Deleting batch ${page} of ${recordType} (${records.items.length} items)`);

        // Delete records in parallel chunks
        for (let i = 0; i < records.items.length; i += PARALLEL_LIMIT) {
          const chunk = records.items.slice(i, i + PARALLEL_LIMIT);
          await Promise.all(chunk.map(record => pb.collection(collection).delete(record.id)));
          totalDeleted += chunk.length;
        }

        // Check if there are more pages
        hasMore = records.totalItems > page * BATCH_SIZE;
        page++;
      }

      logger.debug(`Deleted ${totalDeleted} ${recordType} for project:`, projectId);
    } catch (error) {
      logger.error(`Failed to delete ${recordType} for project ${projectId}:`, error);
      throw new Error(
        `Failed to delete ${recordType}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Delete progress notes and project tags in parallel
  try {
    await Promise.all([
      deleteInBatches(Collections.ProgressNotes, `project = "${projectId}"`, 'progress notes'),
      deleteInBatches(Collections.ProjectTags, `project = "${projectId}"`, 'project tags'),
    ]);
  } catch (error) {
    logger.error(`Failed to delete related records for project ${projectId}:`, error);
    throw new Error(
      `Failed to delete project related data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Mutation hook for deleting a project
 */
export const useDeleteProjectMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ projectId, title }: { projectId: string; title?: string }) => {
      logger.debug('Deleting project:', { projectId, title });

      // Delete related records first
      await deleteProjectRelatedRecords(projectId);

      // Delete the project itself
      return await pb.collection(Collections.Projects).delete(projectId);
    },
    onSuccess: async (_, { projectId, title }) => {
      // Show immediate user feedback
      toast({
        title: 'Project Deleted',
        description: title
          ? `"${title}" has been permanently deleted`
          : 'Your project has been permanently deleted',
        variant: 'default',
      });

      logger.info('Project deleted successfully:', { projectId, title });

      // Optimistic cache updates - immediate UI feedback
      if (user?.id) {
        notifyManager.batch(() => {
          // Remove the deleted project completely from cache
          queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
          // Remove any progress notes for the deleted project
          queryClient.removeQueries({ queryKey: queryKeys.progressNotes.list(projectId) });

          // Optimistically update advanced projects list by removing the deleted project
          queryClient.setQueryData(queryKeys.projects.advanced(user.id), (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object' || !('projects' in oldData)) return oldData;
            const data = oldData as {
              projects: Array<{ id: string; [key: string]: unknown }>;
              totalItems: number;
            };
            return {
              ...data,
              projects: data.projects.filter(p => p.id !== projectId),
              totalItems: Math.max(0, data.totalItems - 1),
            };
          });

          // Optimistically update any paginated project lists by removing the deleted project
          queryClient.setQueriesData(
            { queryKey: queryKeys.projects.lists(), exact: false },
            (oldData: unknown) => {
              if (!oldData || typeof oldData !== 'object' || !('projects' in oldData))
                return oldData;
              const data = oldData as {
                projects: Array<{ id: string; [key: string]: unknown }>;
                totalItems: number;
              };
              return {
                ...data,
                projects: data.projects.filter(p => p.id !== projectId),
                totalItems: Math.max(0, data.totalItems - 1),
              };
            }
          );

          // Mark dashboard stats as stale without immediate refetch (defer to background)
          queryClient.invalidateQueries({
            queryKey: queryKeys.stats.overview(user.id),
            refetchType: 'none',
          });

          // Mark tag stats as stale without immediate refetch
          queryClient.invalidateQueries({
            queryKey: queryKeys.tags.stats(),
            refetchType: 'none',
          });
        });
      }

      // Navigate using React Router for consistent routing
      logger.info('🚀 Navigating to dashboard');
      navigate('/dashboard', { replace: true });

      // Defer non-critical stats updates to background using startTransition
      startTransition(() => {
        if (user?.id) {
          // Background stats cache update - no longer blocks UI
          DashboardStatsService.updateCacheAfterProjectChange(user.id)
            .then(() => {
              logger.info('Background stats cache update completed');
            })
            .catch(error => {
              logger.error('Background stats cache update failed:', error);
              // Fallback: just invalidate the cache to refetch on next access
              queryClient.invalidateQueries({ queryKey: queryKeys.stats.overview(user.id) });
            });
        }
      });
    },
    onError: error => {
      handleMutationError(error, 'delete project', toast);
    },
  });
};
