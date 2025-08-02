/**
 * StatsContext Types - Consolidated type definitions for dashboard statistics
 * @author @serabi
 * @created 2025-08-02
 */

import { ReactNode } from 'react';
import { StatusBreakdown } from '@/types/dashboard';

/**
 * Complete status counts interface for carousel display
 * Includes all project statuses plus aggregated counts
 */
export interface AllStatusCountsType {
  /** Total Active Projects (purchased + stash + progress + onhold) */
  active: number;
  /** All Projects - complete collection including all statuses */
  everything: number;
  /** Purchased - Not Received */
  purchased: number;
  /** In Stash */
  stash: number;
  /** In Progress */
  progress: number;
  /** On Hold */
  onhold: number;
  /** Wishlist */
  wishlist: number;
  /** Completed */
  completed: number;
  /** Archived */
  archived: number;
  /** Destashed */
  destashed: number;
}

/**
 * Loading state for badge content with error handling
 */
export type BadgeLoadingState = 'loading' | 'error';

/**
 * Interface for dashboard tab counts
 * Subset of all status counts specifically for main dashboard tabs
 */
export interface CountsForTabsType {
  /** All active projects */
  all: number;
  /** Purchased projects */
  purchased: number;
  /** In progress projects */
  progress: number;
  /** On hold projects */
  onhold: number;
  /** Stash projects */
  stash: number;
}

/**
 * Performance metrics from optimized stats calculation
 */
export interface StatsPerformanceMetrics {
  /** Time taken for calculation in milliseconds */
  calculationTime: number;
  /** Number of projects processed */
  projectCount: number;
  /** Whether the data came from cache */
  cacheHit: boolean;
}

/**
 * Network Information API interface
 * Used for mobile/slow network detection and optimization
 */
export interface NetworkInformation {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  addEventListener?: (event: string, handler: () => void) => void;
  removeEventListener?: (event: string, handler: () => void) => void;
}

/**
 * Main StatsContext interface with optimized performance features
 */
export interface StatsContextType {
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
  performanceMetrics?: StatsPerformanceMetrics;
}

/**
 * Props interface for StatsProvider component
 */
export interface StatsProviderProps {
  children: ReactNode;
}

/**
 * Backward compatibility interface for legacy useStats hook
 * Maintains the original interface while using optimized implementation
 */
export interface LegacyStatsInterface extends Omit<StatsContextType, 'performanceMetrics'> {
  /** Legacy stats format for backward compatibility */
  stats: { status_breakdown: StatusBreakdown } | null;
}
