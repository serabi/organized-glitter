/**
 * Tag Synchronization Hook
 *
 * Handles adding and removing tags from projects with proper error handling.
 * Extracted from useEditProject to enable reuse across project creation,
 * bulk operations, and other tag management scenarios.
 *
 * @author @serabi
 * @created 2025-01-14
 */

import { useCallback } from 'react';
import { TagService } from '@/lib/tags';
import { useServiceToast } from '@/utils/toast-adapter';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useTagSync');

/**
 * Tag synchronization result
 */
export interface TagSyncResult {
  success: boolean;
  addedCount: number;
  removedCount: number;
  errors: Array<{
    operation: 'add' | 'remove';
    tagId: string;
    error: unknown;
  }>;
}

/**
 * Tag data structure
 */
export interface Tag {
  id: string;
  name: string;
  color?: string;
}

/**
 * Hook for synchronizing project tags
 *
 * Provides functions to sync tags between form state and project state,
 * with proper error handling and user feedback.
 *
 * @returns Object with tag synchronization functions
 */
export function useTagSync() {
  const { toast } = useServiceToast();

  /**
   * Synchronizes tags for a project
   * Compares current tags with new tags and adds/removes as needed
   *
   * @param projectId - Project ID to sync tags for
   * @param currentTags - Currently associated tags
   * @param newTags - New tags to associate
   * @returns Promise resolving to sync result
   */
  const syncProjectTags = useCallback(
    async (projectId: string, currentTags: Tag[], newTags: Tag[]): Promise<TagSyncResult> => {
      logger.debug('Starting tag synchronization', {
        projectId,
        currentCount: currentTags.length,
        newCount: newTags.length,
      });

      const result: TagSyncResult = {
        success: true,
        addedCount: 0,
        removedCount: 0,
        errors: [],
      };

      try {
        // Extract tag IDs for comparison
        const currentTagIds = currentTags.map(tag => tag.id);
        const newTagIds = newTags.map(tag => tag.id);

        // Find tags to add and remove
        const tagsToAdd = newTagIds.filter(tagId => !currentTagIds.includes(tagId));
        const tagsToRemove = currentTagIds.filter(tagId => !newTagIds.includes(tagId));

        logger.debug('Tag synchronization plan', {
          projectId,
          tagsToAdd: tagsToAdd.length,
          tagsToRemove: tagsToRemove.length,
        });

        // Add new tags
        for (const tagId of tagsToAdd) {
          try {
            await TagService.addTagToProject(projectId, tagId);
            result.addedCount++;
            logger.debug(`Successfully added tag ${tagId} to project ${projectId}`);
          } catch (error) {
            result.success = false;
            result.errors.push({
              operation: 'add',
              tagId,
              error,
            });
            logger.warn(`Failed to add tag ${tagId} to project ${projectId}`, error);
          }
        }

        // Remove old tags
        for (const tagId of tagsToRemove) {
          try {
            await TagService.removeTagFromProject(projectId, tagId);
            result.removedCount++;
            logger.debug(`Successfully removed tag ${tagId} from project ${projectId}`);
          } catch (error) {
            result.success = false;
            result.errors.push({
              operation: 'remove',
              tagId,
              error,
            });
            logger.warn(`Failed to remove tag ${tagId} from project ${projectId}`, error);
          }
        }

        // Show user feedback for errors
        if (result.errors.length > 0) {
          const addErrors = result.errors.filter(e => e.operation === 'add').length;
          const removeErrors = result.errors.filter(e => e.operation === 'remove').length;

          let description = 'The project was updated but some tags may not be saved properly.';
          if (addErrors > 0 && removeErrors > 0) {
            description = `Failed to add ${addErrors} tag(s) and remove ${removeErrors} tag(s). ${description}`;
          } else if (addErrors > 0) {
            description = `Failed to add ${addErrors} tag(s). ${description}`;
          } else if (removeErrors > 0) {
            description = `Failed to remove ${removeErrors} tag(s). ${description}`;
          }

          toast({
            title: 'Tag Update Warning',
            description,
            variant: 'destructive',
          });
        }

        logger.info('Tag synchronization completed', {
          projectId,
          success: result.success,
          added: result.addedCount,
          removed: result.removedCount,
          errors: result.errors.length,
        });

        return result;
      } catch (error) {
        logger.error('Tag synchronization failed', { projectId, error });
        result.success = false;

        toast({
          title: 'Tag Synchronization Error',
          description: 'Failed to synchronize project tags. Please try again.',
          variant: 'destructive',
        });

        throw error;
      }
    },
    [toast]
  );

  /**
   * Adds multiple tags to a project
   *
   * @param projectId - Project ID to add tags to
   * @param tagIds - Array of tag IDs to add
   * @returns Promise resolving to operation result
   */
  const addTagsToProject = useCallback(
    async (projectId: string, tagIds: string[]): Promise<TagSyncResult> => {
      return syncProjectTags(
        projectId,
        [],
        tagIds.map(id => ({ id, name: '' }))
      );
    },
    [syncProjectTags]
  );

  /**
   * Removes multiple tags from a project
   *
   * @param projectId - Project ID to remove tags from
   * @param tagIds - Array of tag IDs to remove
   * @returns Promise resolving to operation result
   */
  const removeTagsFromProject = useCallback(
    async (projectId: string, tagIds: string[]): Promise<TagSyncResult> => {
      return syncProjectTags(
        projectId,
        tagIds.map(id => ({ id, name: '' })),
        []
      );
    },
    [syncProjectTags]
  );

  /**
   * Bulk tag operations for multiple projects
   *
   * @param operations - Array of tag operations to perform
   * @returns Promise resolving to results for each operation
   */
  const bulkTagSync = useCallback(
    async (
      operations: Array<{
        projectId: string;
        currentTags: Tag[];
        newTags: Tag[];
      }>
    ): Promise<TagSyncResult[]> => {
      logger.debug(`Starting bulk tag sync for ${operations.length} projects`);

      const results = await Promise.allSettled(
        operations.map(op => syncProjectTags(op.projectId, op.currentTags, op.newTags))
      );

      const syncResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          logger.error(`Bulk tag sync failed for operation ${index}`, result.reason);
          const failedOperation = operations[index];
          const tagId =
            failedOperation.newTags.length > 0
              ? failedOperation.newTags[0].id
              : failedOperation.currentTags.length > 0
                ? failedOperation.currentTags[0].id
                : '';

          return {
            success: false,
            addedCount: 0,
            removedCount: 0,
            errors: [{ operation: 'add' as const, tagId, error: result.reason }],
          };
        }
      });

      const totalErrors = syncResults.reduce((sum, result) => sum + result.errors.length, 0);
      const successfulOperations = syncResults.filter(result => result.success).length;

      if (totalErrors > 0) {
        toast({
          title: 'Bulk Tag Sync Completed',
          description: `${successfulOperations}/${operations.length} operations succeeded. ${totalErrors} errors occurred.`,
          variant: totalErrors === 0 ? 'default' : 'destructive',
        });
      }

      return syncResults;
    },
    [syncProjectTags, toast]
  );

  return {
    syncProjectTags,
    addTagsToProject,
    removeTagsFromProject,
    bulkTagSync,
  };
}
