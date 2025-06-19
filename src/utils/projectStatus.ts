/**
 * Returns a human-readable label for a project status
 */
export const getStatusLabel = (status: string): string => {
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
    case 'destashed':
      return 'Destashed';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
};

/**
 * Returns Tailwind CSS classes for styling based on project status
 * Using the 12-color palette for tag colors
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'wishlist':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'; // #3B82F6 Blue
    case 'purchased':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'; // #8B5CF6 Purple
    case 'stash':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'; // #F59E0B Amber
    case 'progress':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'; // #10B981 Green
    case 'completed':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'; // #6366F1 Indigo
    case 'destashed':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'; // #F43F5E Rose
    case 'archived':
      return 'bg-gray-500 text-white dark:bg-gray-700 dark:text-gray-200'; // #6B7280 Gray
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

/**
 * Additional colors available for future tag functionality:
 * - #EF4444 (Red), #EC4899 (Pink), #14B8A6 (Teal)
 * - #F97316 (Orange), #84CC16 (Lime)
 */
