/**
 * Stats context definition - separated for circular import avoidance
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext, ReactNode } from 'react';
import { StatusBreakdown } from '@/types/dashboard';

// Complete status counts interface for carousel
export interface AllStatusCountsType {
  active: number; // Total Active Projects
  everything: number; // All Projects (complete collection)
  purchased: number; // Purchased - Not Received
  stash: number; // In Stash
  progress: number; // In Progress
  onhold: number; // On Hold
  wishlist: number; // Wishlist
  completed: number; // Completed
  archived: number; // Archived
  destashed: number; // Destashed
}

// Loading state for badge content
export type BadgeLoadingState = 'loading' | 'error';

// Interface for tab counts (subset of all status counts for dashboard tabs)
export interface CountsForTabsType {
  all: number;
  purchased: number;
  progress: number;
  onhold: number;
  stash: number;
}

interface StatsContextOptimizedType {
  /** Current status breakdown from optimized calculation */
  statusCounts: StatusBreakdown;

  /** Total project count */
  totalProjects: number;

  /** True when stats are being fetched from the API */
  isLoading: boolean;

  /** True when stats fetch has failed */
  isError: boolean;

  /** Error object if stats fetch failed */
  error: Error | null | unknown;

  /** Get counts for all project statuses with loading state handling */
  getAllStatusCounts: () => AllStatusCountsType | BadgeLoadingState;

  /** Get counts for dashboard tabs (subset of all status counts) */
  getCountsForTabs: () => CountsForTabsType | BadgeLoadingState;

  /** Get badge content with spinner for loading states */
  getBadgeContent: (count: number) => ReactNode;

  /** True if network conditions are detected as slow (mobile) */
  isNetworkSlow: boolean;

  /** Current timeout duration based on network conditions */
  timeoutDuration: number;

  /** Manually retry failed stats request */
  retry: () => void;

  /** Source of stats data (always 'optimized' for this implementation) */
  source: 'optimized';

  /** Performance metrics from optimized calculation */
  performanceMetrics?: {
    calculationTime: number;
    projectCount: number;
    cacheHit: boolean;
  };
}

export const StatsContextOptimized = createContext<StatsContextOptimizedType | null>(null);

export type { StatsContextOptimizedType };
