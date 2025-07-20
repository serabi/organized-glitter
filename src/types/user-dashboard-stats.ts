/**
 * User Dashboard Stats Types - Optimized Count Storage
 * @author @serabi
 * @created 2025-07-04
 */

import { BaseSystemFields } from '@/types/pocketbase.types';

/**
 * User Dashboard Stats record interface
 * Stores pre-computed project counts for fast dashboard loading
 */
export interface UserDashboardStatsRecord extends BaseSystemFields {
  id: string;
  user: string; // Relation to users collection

  // Status counts
  all: number;
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  completed: number;
  destashed: number;
  archived: number;

  // Metadata
  last_updated: string;
  total_projects: number; // Redundant but useful for validation
}

/**
 * Status change event for updating dashboard stats
 */
export interface ProjectStatusChangeEvent {
  userId: string;
  oldStatus?: string | null;
  newStatus: string;
  operation: 'create' | 'update' | 'delete';
}
