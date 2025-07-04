import { useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ProjectType, ProjectStatus } from '@/types/project';
import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useProjectStatus');

// Extended toast handlers interface
interface ExtendedToastHandlers {
  showSuccess?: (message: string) => void;
  showError?: (message: string) => void;
  onSuccess?: (options: { title: string; description: string; variant?: string }) => void;
}

/**
 * @fileoverview This is the consolidated version of useProjectStatus
 * that merges functionality from both the .ts and .tsx versions.
 * It provides both utility functions and status update functionality.
 */

export const statusOptions = [
  'wishlist',
  'purchased',
  'stash',
  'progress',
  'completed',
  'archived',
  'destashed',
] as const;
type StatusType = (typeof statusOptions)[number] | string;

interface StatusUtils {
  getStatusLabel: (status: StatusType) => string;
  getStatusColor: (status: StatusType) => string;
  statusOptions: readonly string[];
  handleUpdateStatus?: (newStatus: ProjectStatus) => Promise<boolean>;
}

/**
 * Hook that provides utility functions for working with project statuses
 * and optionally provides functionality for updating a project's status
 *
 * @param project Optional project object. If provided, the hook will include
 *                status update functionality.
 * @returns Object containing status utility functions and update handler
 */
export const useProjectStatus = (project?: ProjectType | null): StatusUtils => {
  const { toast: originalToast } = useToast();

  // Use the singleton PocketBase service instance

  // Create a toast handler that matches the expected service interface
  // Wrap in useMemo to prevent it from changing on every render
  const toastHandlers = useMemo<ExtendedToastHandlers>(
    () => ({
      showSuccess: (message: string) => {
        originalToast({
          title: 'Success',
          description: message,
          variant: 'default',
        });
      },
      showError: (message: string) => {
        originalToast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      },
      onSuccess: options => {
        originalToast({
          title: options.title,
          description: options.description,
          variant: 'default',
        });
      },
    }),
    [originalToast]
  );

  // Status update handler - only available if project is provided
  const handleUpdateStatus = useCallback(
    async (newStatus: ProjectStatus): Promise<boolean> => {
      if (!project) return false;
      if (!project.id) {
        logger.error('Error: Project ID is undefined');
        toastHandlers.showError?.('Invalid project ID. Please try refreshing the page.');
        return false;
      }

      try {
        logger.debug(`Updating project ${project.id} status to ${newStatus}`);

        await pb.collection('projects').update(project.id, {
          status: newStatus,
        });

        logger.debug(`Project ${project.id} status updated successfully`);
        toastHandlers.showSuccess?.('Project status updated');

        return true;
      } catch (error) {
        const errorMsg = 'Failed to update project status';
        logger.error(errorMsg, error);
        toastHandlers.showError?.(errorMsg);
        return false;
      }
    },
    [project, toastHandlers]
  );

  // Core utility functions
  return useMemo(() => {
    const utils: StatusUtils = {
      statusOptions,

      /**
       * Returns a human-readable label for a project status
       */
      getStatusLabel: (status: StatusType): string => {
        switch (status) {
          case 'wishlist':
            return 'Wishlist';
          case 'purchased':
            return 'Purchased - Not Received';
          case 'stash':
            return 'In Stash';
          case 'progress':
            return 'In Progress';
          case 'completed':
            return 'Completed';
          case 'archived':
            return 'Archived';
          case 'destashed':
            return 'Destashed';
          default:
            return status;
        }
      },

      /**
       * Returns Tailwind CSS classes for styling based on project status
       */
      getStatusColor: (status: StatusType): string => {
        switch (status) {
          case 'wishlist':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
          case 'purchased':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
          case 'stash':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
          case 'progress':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
          case 'completed':
            return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
          case 'archived':
            return 'bg-gray-500 text-white dark:bg-gray-700 dark:text-gray-200';
          case 'destashed':
            return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
          default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
        }
      },
    };

    // Only add the update handler if a project was provided
    if (project) {
      utils.handleUpdateStatus = handleUpdateStatus;
    }

    return utils;
  }, [project, handleUpdateStatus]);
};

export default useProjectStatus;
