/**
 * User Dashboard Stats Types - Optimized Count Storage
 * @author @serabi
 * @created 2025-07-04
 */

import { BaseRecord } from '@/types/pocketbase.types';

/**
 * User Dashboard Stats record interface
 * Stores pre-computed project counts for fast dashboard loading
 */
export interface UserDashboardStatsRecord extends BaseRecord {
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
 * Input data for creating/updating dashboard stats
 */
export interface UserDashboardStatsInput {
  user: string;
  all: number;
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  completed: number;
  destashed: number;
  archived: number;
  total_projects: number;
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

/**
 * Dashboard stats validation result
 */
export interface DashboardStatsValidation {
  isValid: boolean;
  expectedTotal: number;
  actualTotal: number;
  discrepancies: Record<string, number>;
}
