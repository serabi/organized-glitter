import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startTransition } from 'react';
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

// Helper function to invalidate project-related queries and update cache
const invalidateProjectQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId?: string,
  userId?: string,
  updateStatsCache?: () => Promise<void>
) => {
  const invalidations: Promise<void>[] = [];

  // Invalidate specific project detail if projectId provided
  if (projectId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
    );
  }

  // Invalidate all project lists
  invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() }));

  // Invalidate tag stats queries (since project changes affect tag counts)
  invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.tags.stats() }));

  // Update overview stats cache when function is provided
  if (updateStatsCache) {
    invalidations.push(updateStatsCache());
  }

  // Wait for all invalidations to complete
  await Promise.all(invalidations);

  // Update stats cache after query invalidation to ensure consistent sequencing
  if (userId) {
    try {
      await DashboardStatsService.updateCacheAfterProjectChange(userId);
      logger.info('Stats cache updated successfully after project change:', { projectId });
    } catch (error) {
      logger.error('Failed to update stats cache after project change:', error);
      if (import.meta.env.DEV) {
        console.warn('[ProjectMutation] Stats cache update failed:', error);
      }
    }
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
      // Invalidate project queries and update stats cache
      await invalidateProjectQueries(queryClient, projectId, user?.id);

      toast({
        title: 'Success',
        description: `Project status updated to ${status.replace('_', ' ')}`,
        variant: 'default',
      });

      logger.info('Project status updated successfully:', { projectId, status });
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
      // Invalidate the specific project detail
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });

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
      // Invalidate the specific project detail to refresh progress notes
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      // Invalidate progress notes for this project
      queryClient.invalidateQueries({ queryKey: queryKeys.progressNotes.list(projectId) });

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
      // Invalidate the specific project detail
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      // Invalidate progress notes for this project
      queryClient.invalidateQueries({ queryKey: queryKeys.progressNotes.list(projectId) });

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
      // If we have projectId, invalidate specific project queries
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.progressNotes.list(projectId) });
      } else {
        // Otherwise invalidate all progress notes and project details
        queryClient.invalidateQueries({ queryKey: queryKeys.progressNotes.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.details() });
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
      // Invalidate the specific project detail
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      // Invalidate progress notes for this project
      queryClient.invalidateQueries({ queryKey: queryKeys.progressNotes.list(projectId) });

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

      // CRITICAL: Do navigation BEFORE cache invalidation to prevent race condition
      logger.info('🚀 Performing immediate navigation before cache invalidation');
      
      try {
        // Use direct window.location for immediate, synchronous redirect
        // This bypasses React Router entirely and prevents race conditions
        window.location.href = '/dashboard';
        
        logger.info('✅ Navigation completed successfully to: /dashboard');
      } catch (navigationError) {
        logger.error('❌ Direct navigation failed:', navigationError);
        // Note: No fallback needed since we removed useNavigate
      }

      // Defer cache invalidation to happen after navigation
      // Use startTransition to mark cache updates as non-urgent
      startTransition(() => {
        // Invalidate all project-related queries and update stats cache
        Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
          invalidateProjectQueries(queryClient, projectId, user?.id),
        ]).catch(error => {
          logger.error('Failed to invalidate queries after project archive:', error);
        });

        logger.info('Project archive cache invalidation completed');
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

      // CRITICAL: Do navigation BEFORE cache invalidation to prevent race condition
      logger.info('🚀 Performing immediate navigation before cache invalidation');
      
      try {
        // Use direct window.location for immediate, synchronous redirect
        // This bypasses React Router entirely and prevents race conditions
        window.location.href = '/dashboard';
        
        logger.info('✅ Navigation completed successfully to: /dashboard');
      } catch (navigationError) {
        logger.error('❌ Direct navigation failed:', navigationError);
        // Note: No fallback needed since we removed useNavigate
      }

      // Defer cache invalidation to happen after navigation
      // Use startTransition to mark cache updates as non-urgent
      startTransition(() => {
        // Invalidate all project-related queries
        Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.progressNotes.all }),
          invalidateProjectQueries(queryClient, projectId, user?.id),
        ]).catch(error => {
          logger.error('Failed to invalidate queries after project deletion:', error);
        });

        logger.info('Project deletion cache invalidation completed');
      });
    },
    onError: error => {
      handleMutationError(error, 'delete project', toast);
    },
  });
};
