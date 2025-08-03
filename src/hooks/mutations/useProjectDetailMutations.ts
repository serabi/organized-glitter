import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { ProjectStatus } from '@/types/project';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/logger';
import { dashboardSyncMonitor } from '@/utils/dashboardSyncMonitor';
import { statusOptions } from '@/hooks/useProjectStatus';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { toUserDateString } from '@/utils/timezoneUtils';

const logger = createLogger('useProjectDetailMutations');

// Constants for project status values
const PROJECT_STATUS = {
  ARCHIVED: 'archived' as const,
} satisfies Record<string, ProjectStatus>;

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
  const userTimezone = useUserTimezone();

  return useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: ProjectStatus }) => {
      logger.debug('Updating project status:', { projectId, status });

      // Validate status value
      const validStatuses = statusOptions;
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid project status: ${status}. Must be one of: ${validStatuses.join(', ')}`
        );
      }

      // Validate projectId
      if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
        throw new Error('Invalid project ID: must be a non-empty string');
      }

      // Log the update attempt for debugging
      logger.debug('Status update validation passed:', {
        projectId: projectId.substring(0, 8) + '...',
        status,
        validStatuses,
      });

      const updateData: { status: ProjectStatus; date_completed?: string } = { status };

      // Auto-set date_completed when status changes to 'completed'
      if (status === 'completed') {
        updateData.date_completed = toUserDateString(new Date(), userTimezone);
        logger.debug(
          'Auto-setting date_completed for completed project:',
          updateData.date_completed
        );
      }

      return await pb.collection(Collections.Projects).update(projectId, updateData);
    },
    onMutate: async ({ projectId, status }) => {
      const endTiming = dashboardSyncMonitor.startTiming('status-update-mutation');

      // Defensive check for required data
      if (!user?.id) {
        logger.warn('Status update attempted without authenticated user');
        throw new Error('User authentication required');
      }

      if (!projectId) {
        logger.warn('Status update attempted without project ID');
        throw new Error('Project ID required');
      }

      // Record the mutation start
      dashboardSyncMonitor.recordEvent({
        type: 'status_update',
        projectId,
        status,
        userId: user.id,
        success: true,
        metadata: { phase: 'onMutate' },
      });

      // Cancel any outgoing refetches to prevent race conditions
      if (user?.id) {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) }),
          queryClient.cancelQueries({ queryKey: queryKeys.projects.lists() }),
          queryClient.cancelQueries({ queryKey: queryKeys.stats.overview(user.id) }),
        ]);
      }

      // Snapshot the previous values for rollback
      const previousProjectDetail = queryClient.getQueryData(queryKeys.projects.detail(projectId));

      // Get old status for optimistic stats updates
      let oldStatus: string | undefined;
      if (
        previousProjectDetail &&
        typeof previousProjectDetail === 'object' &&
        'status' in previousProjectDetail
      ) {
        oldStatus = (previousProjectDetail as { status: string }).status;
      }

      const previousStats = null;

      // Return context object for rollback
      return {
        previousProjectDetail,
        previousStats,
        projectId,
        status,
        oldStatus,
        newStatus: status,
        endTiming,
      };
    },
    onError: (err, variables, context) => {
      // Enhanced error logging to capture more details
      const errorDetails = {
        message: err instanceof Error ? err.message : 'Unknown error',
        name: err instanceof Error ? err.name : undefined,
        stack: err instanceof Error ? err.stack : undefined,
        errorObject: err,
        projectId: variables.projectId,
        status: variables.status,
        userId: user?.id,
      };

      logger.error('Status update mutation failed with detailed error:', errorDetails);

      // Record the error
      dashboardSyncMonitor.recordEvent({
        type: 'status_update',
        projectId: variables.projectId,
        status: variables.status,
        userId: user?.id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        metadata: {
          phase: 'onError',
          errorName: err instanceof Error ? err.name : undefined,
          errorDetails: errorDetails,
        },
      });

      // Roll back the optimistic updates using snapshots
      if (context) {
        if (context.previousProjectDetail) {
          queryClient.setQueryData(
            queryKeys.projects.detail(context.projectId),
            context.previousProjectDetail
          );
        }

        // Note: With optimized architecture, stats are automatically recalculated
        // when projects data changes, so no manual rollback needed

        // End timing
        if (context.endTiming) {
          context.endTiming();
        }
      }

      handleMutationError(err, 'update project status', toast);
    },
    onSuccess: async (_, { projectId, status }, context) => {
      const endTiming = dashboardSyncMonitor.startTiming('simple-invalidation');

      // Record successful mutation
      dashboardSyncMonitor.recordEvent({
        type: 'status_update',
        projectId,
        status,
        userId: user?.id,
        success: true,
        metadata: { phase: 'onSuccess' },
      });

      if (user?.id) {
        logger.debug('🔄 Using simple invalidation approach for status update:', {
          projectId,
          newStatus: status,
          userId: user.id,
        });

        try {
          await Promise.all([
            // Invalidate project detail with immediate active refetch
            queryClient.invalidateQueries({
              queryKey: queryKeys.projects.detail(projectId),
              exact: true,
              refetchType: 'active',
            }),
            // Invalidate all project list queries (dashboard + advanced) using prefix matching
            queryClient.invalidateQueries({
              queryKey: queryKeys.projects.lists(),
              refetchType: 'active',
            }),
            // Invalidate dashboard stats with immediate active refetch for instant tab updates
            queryClient.invalidateQueries({
              queryKey: queryKeys.stats.overview(user.id),
              exact: true,
              refetchType: 'active',
            }),
          ]);

          endTiming();

          dashboardSyncMonitor.recordEvent({
            type: 'cache_invalidation',
            projectId,
            userId: user.id,
            success: true,
            metadata: { approach: 'simple-invalidation' },
          });

          logger.info('✅ Simple cache invalidation completed successfully');
        } catch (error) {
          logger.error('❌ Cache invalidation failed:', error);

          endTiming();

          dashboardSyncMonitor.recordEvent({
            type: 'cache_invalidation',
            projectId,
            userId: user.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: { approach: 'simple-invalidation' },
          });
        }
      }

      // End timing from context
      if (context?.endTiming) {
        context.endTiming();
      }

      toast({
        title: 'Success',
        description: `Project status updated to ${status.replace('_', ' ')}`,
        variant: 'default',
      });

      logger.info('Project status updated successfully:', { projectId, status });
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
  const userTimezone = useUserTimezone();

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

      // Convert date through timezone utilities to ensure consistency
      const convertedDate = toUserDateString(noteData.date, userTimezone);
      formData.append('date', convertedDate || '');

      if (noteData.imageFile) {
        formData.append('image', noteData.imageFile);
      }

      return await pb.collection(Collections.ProgressNotes).create(formData);
    },
    onSuccess: (_, { projectId }) => {
      // Modern React 18+ handles batching automatically - no need for manual batching
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
      // Modern React 18+ handles batching automatically - no need for manual batching
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
      // Modern React 18+ handles batching automatically - no need for manual batching
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
      // Modern React 18+ handles batching automatically - no need for manual batching
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
        // Modern React 18+ handles batching automatically - no need for manual batching

        // Optimistically update any paginated project lists
        queryClient.setQueriesData(
          { queryKey: queryKeys.projects.lists(), exact: false },
          (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object' || !('projects' in oldData)) return oldData;
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
      }

      // Simple cache invalidation before navigation
      if (user?.id) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['projects'],
            refetchType: 'active',
          }),
          queryClient.invalidateQueries({
            queryKey: ['stats'],
            refetchType: 'active',
          }),
        ]);
        logger.info('✅ Simple cache invalidation completed before navigation');
      }

      // Navigate using React Router for consistent routing
      logger.info('🚀 Navigating to dashboard');
      navigate('/dashboard', { replace: true });
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

      // Get project status before deletion for stats update
      const project = await pb.collection(Collections.Projects).getOne(projectId, {
        fields: 'status',
      });

      // Delete related records first
      await deleteProjectRelatedRecords(projectId);

      // Delete the project itself
      await pb.collection(Collections.Projects).delete(projectId);

      return { deletedProject: project, projectId, title };
    },
    onSuccess: async (result, { projectId, title }) => {
      // Show immediate user feedback
      toast({
        title: 'Project Deleted',
        description: title
          ? `"${title}" has been permanently deleted`
          : 'Your project has been permanently deleted',
        variant: 'default',
      });

      logger.info('Project deleted successfully:', { projectId, title });

      // Note: With optimized architecture, stats are automatically recalculated
      // when projects data changes, so no manual stats updates needed

      // Optimistic cache updates - immediate UI feedback
      if (user?.id) {
        // Modern React 18+ handles batching automatically - no need for manual batching
        // Remove the deleted project completely from cache
        queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
        // Remove any progress notes for the deleted project
        queryClient.removeQueries({ queryKey: queryKeys.progressNotes.list(projectId) });

        // Optimistically update any paginated project lists by removing the deleted project
        queryClient.setQueriesData(
          { queryKey: queryKeys.projects.lists(), exact: false },
          (oldData: unknown) => {
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
      }

      // Simple cache invalidation before navigation
      if (user?.id) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['projects'],
            refetchType: 'active',
          }),
          queryClient.invalidateQueries({
            queryKey: ['stats'],
            refetchType: 'active',
          }),
        ]);
        logger.info('✅ Simple cache invalidation completed before navigation');
      }

      // Navigate using React Router for consistent routing
      logger.info('🚀 Navigating to dashboard');
      navigate('/dashboard', { replace: true });
    },
    onError: error => {
      handleMutationError(error, 'delete project', toast);
    },
  });
};
