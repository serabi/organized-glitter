/**
 * Pure utility functions for project status operations
 * Extracted from useProjectStatus hook for better performance
 */

export type ProjectStatusType =
  | 'wishlist'
  | 'purchased'
  | 'stash'
  | 'progress'
  | 'onhold'
  | 'completed'
  | 'archived'
  | 'destashed';

/**
 * Returns a human-readable label for a project status
 * Pure function - no hooks or side effects
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'wishlist':
      return 'Wishlist';
    case 'purchased':
      return 'Purchased - Not Received';
    case 'stash':
      return 'In Stash';
    case 'progress':
      return 'In Progress';
    case 'onhold':
      return 'On Hold';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    case 'destashed':
      return 'Destashed';
    default:
      return status;
  }
}

/**
 * Returns Tailwind CSS classes for styling based on project status
 * Pure function - no hooks or side effects
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'wishlist':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'purchased':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'stash':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'progress':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'onhold':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'completed':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
    case 'archived':
      return 'bg-gray-500 text-white dark:bg-gray-700 dark:text-gray-200';
    case 'destashed':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

// Export the status options for forms/selects
export const statusOptions = [
  'wishlist',
  'purchased',
  'stash',
  'progress',
  'onhold',
  'completed',
  'archived',
  'destashed',
] as const;
