/**
 * Shared project status types
 */

export type ProjectStatus =
  | 'wishlist'
  | 'purchased'
  | 'stash'
  | 'progress'
  | 'completed'
  | 'archived'
  | 'destashed';
export type ProjectFilterStatus = ProjectStatus | 'all';
