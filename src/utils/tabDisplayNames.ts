/**
 * @fileoverview Tab Display Names Utility
 *
 * Centralized utility for mapping ProjectFilterStatus values to user-friendly display names.
 * Extracts display logic from dashboard components for reusability and consistency.
 *
 * This utility ensures a single source of truth for tab display names across the application,
 * making it easy to maintain consistency and add new tab types in the future.
 *
 * @author serabi
 * @since 2025-07-08
 * @version 1.0.0
 */

import { ProjectFilterStatus } from '@/types/project';

/**
 * Interface for tab display configuration
 */
export interface TabDisplayConfig {
  value: ProjectFilterStatus;
  fullText: string;
  abbreviatedText: string;
}

/**
 * Centralized mapping of ProjectFilterStatus to display names
 * Extracted from dashboard components for consistency
 */
export const TAB_DISPLAY_NAMES: Record<ProjectFilterStatus, string> = {
  everything: 'All Projects',
  active: 'Collection Total',
  wishlist: 'Wishlist',
  purchased: 'Purchased',
  stash: 'In Stash',
  progress: 'In Progress',
  onhold: 'On Hold',
  completed: 'Completed',
  destashed: 'Destashed',
  archived: 'Archived',
};

/**
 * Get user-friendly display name for a ProjectFilterStatus
 *
 * @param status - The ProjectFilterStatus to get display name for
 * @returns User-friendly display name
 */
export const getTabDisplayName = (status: ProjectFilterStatus): string => {
  return TAB_DISPLAY_NAMES[status] || 'All';
};

/**
 * Check if a ProjectFilterStatus has a valid display name
 *
 * @param status - The ProjectFilterStatus to validate
 * @returns True if status has a valid display name
 */
export const isValidTabStatus = (status: string): status is ProjectFilterStatus => {
  return status in TAB_DISPLAY_NAMES;
};
