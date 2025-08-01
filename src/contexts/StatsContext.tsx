/**
 * @fileoverview Dashboard Statistics Context Provider
 *
 * Centralized state management for dashboard statistics including kit counts,
 * loading states, and mobile network error handling. Optimized for mobile networks
 * with adaptive timeout handling and spinner-based loading states for status tabs.
 *
 * This context extracts stats-related functionality from the monolithic
 * DashboardFiltersContext to improve performance and reduce re-renders.
 *
 * Key Features:
 * - Mobile-specific network timeout handling
 * - Spinner-based loading states for status tab badges
 * - Intelligent error handling with user-friendly fallbacks
 * - Proper query invalidation for retry logic (no page reloads)
 * - Comprehensive loading state management
 * - TypeScript strict mode compliance
 *
 * Usage:
 * ```typescript
 * const { stats, isLoading, getCountsForTabs, getBadgeContent } = useStats();
 *
 * // Badge content with spinner for loading states
 * const badgeContent = getBadgeContent(count, isLoading);
 * ```
 *
 * @author serabi
 * @since 2025-07-08
 * @version 1.0.0
 *
 * Performance Considerations:
 * - Uses React.memo for badge content optimization
 * - Implements useMemo for expensive count calculations
 * - Minimal re-renders through focused context scope
 * - Efficient mobile network detection and handling
 *
 * Dependencies:
 * - @tanstack/react-query for data fetching
 * - @/hooks/queries/useDashboardStatsStable for stats query
 * - @/hooks/useNetworkDetection for network condition detection
 *
 * @see {@link FiltersContext} for filter state management
 * @see {@link DashboardOverview} for badge implementation
 * @see {@link useDashboardStatsStable} for stats query logic
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
  useEffect,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/logger';
import { DashboardStats } from '@/types/dashboard';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { safeInvalidateQueries } from '@/utils/queryInvalidationGuard';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardStatsStable } from '@/hooks/queries/useDashboardStatsStable';
import { useFilterStateOnly } from '@/contexts/FilterProvider';

const logger = createLogger('StatsContext');

// Network Information API interface
interface NetworkInformation {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  addEventListener?: (event: string, handler: () => void) => void;
  removeEventListener?: (event: string, handler: () => void) => void;
}

// Status counts interface for DashboardOverview component
// Only tracks the 5 metrics actually displayed on dashboard
export interface CountsForTabsType {
  all: number; // Total Active Projects
  purchased: number; // Purchased - Not Received
  progress: number; // In Progress
  onhold: number; // On Hold
  stash: number; // In Stash
}

// Complete status counts interface for carousel
// Includes all 9 project statuses for comprehensive display
export interface AllStatusCountsType {
  all: number; // Total Active Projects
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

// Spinner component for badge loading states
const SpinnerIcon: React.FC<{ className?: string }> = ({ className = 'h-3 w-3 animate-spin' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
  </svg>
);

/**
 * Context interface for dashboard statistics management
 *
 * Provides centralized access to kit counts, loading states, and error handling
 * for dashboard status tabs and other stats-dependent components.
 *
 * @interface StatsContextType
 * @since 2025-07-08
 */
interface StatsContextType {
  /** Current dashboard statistics data or null if not loaded */
  stats: DashboardStats | null;

  /** True when stats are being fetched from the API */
  isLoading: boolean;

  /** True when stats fetch has failed */
  isError: boolean;

  /** Error object if stats fetch failed */
  error: Error | null;

  /**
   * Get counts for status tabs with loading state handling
   * Returns actual counts or loading state indicator
   */
  getCountsForTabs: () => CountsForTabsType | BadgeLoadingState;

  /**
   * Get counts for all project statuses with loading state handling
   * Returns complete status breakdown or loading state indicator
   * Used by the status carousel component
   */
  getAllStatusCounts: () => AllStatusCountsType | BadgeLoadingState;

  /**
   * Get badge content with spinner for loading states
   * Shows spinner when loading/error, actual count when loaded
   */
  getBadgeContent: (count: number) => ReactNode;

  /** True if network conditions are detected as slow (mobile) */
  isNetworkSlow: boolean;

  /** Current timeout duration based on network conditions */
  timeoutDuration: number;

  /** Manually retry failed stats request */
  retry: () => void;

  /** Source of stats data ('optimized' | 'legacy' | 'unknown') */
  source: 'optimized' | 'legacy' | 'unknown';
}

const StatsContext = createContext<StatsContextType | null>(null);

/**
 * Network detection hook for mobile optimization
 *
 * Detects mobile devices and slow network conditions to adjust
 * timeout durations and retry strategies accordingly.
 *
 * @returns Network condition information
 */
const useNetworkDetection = () => {
  const [isNetworkSlow, setIsNetworkSlow] = useState(false);
  const [timeoutDuration, setTimeoutDuration] = useState(30000); // Default 30s

  useEffect(() => {
    const detectNetworkConditions = () => {
      // Mobile device detection
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      // Network connection detection (if available)
      const connection =
        (navigator as unknown as { connection?: NetworkInformation }).connection ||
        (navigator as unknown as { mozConnection?: NetworkInformation }).mozConnection ||
        (navigator as unknown as { webkitConnection?: NetworkInformation }).webkitConnection;

      const isSlowNetwork =
        connection &&
        (connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g' ||
          connection.downlink < 1);

      const shouldOptimizeForMobile = isMobile || isSlowNetwork;

      setIsNetworkSlow(shouldOptimizeForMobile);
      setTimeoutDuration(shouldOptimizeForMobile ? 15000 : 30000); // 15s mobile, 30s desktop

      logger.debug('Network conditions detected', {
        isMobile,
        isSlowNetwork,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        optimizedTimeout: shouldOptimizeForMobile ? 15000 : 30000,
      });
    };

    detectNetworkConditions();

    // Re-detect on network change if supported
    if ('connection' in navigator) {
      const connection = (navigator as unknown as { connection?: NetworkInformation }).connection;
      if (connection && connection.addEventListener) {
        connection.addEventListener('change', detectNetworkConditions);
        return () => connection.removeEventListener?.('change', detectNetworkConditions);
      }
    }
  }, []);

  return { isNetworkSlow, timeoutDuration };
};

/**
 * Props interface for StatsProvider component
 *
 * @interface StatsProviderProps
 */
interface StatsProviderProps {
  children: ReactNode;
}

/**
 * StatsProvider component that provides dashboard statistics context
 *
 * Manages dashboard statistics state including loading states, error handling,
 * and mobile network optimizations. Provides spinner-based loading states
 * for status tab badges when network requests are in progress.
 *
 * @param props - Provider props containing children
 * @returns JSX element with stats context
 */
export const StatsProvider: React.FC<StatsProviderProps> = ({ children }) => {
  // Network detection for mobile optimization
  const { isNetworkSlow, timeoutDuration } = useNetworkDetection();

  // React Query client for cache invalidation
  const queryClient = useQueryClient();

  // User authentication for query keys
  const { user } = useAuth();

  // Use dashboard data directly - single source of truth from useProjects
  const { filters, debouncedSearchTerm, isInitialized } = useFilterStateOnly();
  const { isLoadingProjects, errorProjects } = useDashboardData(
    user?.id || 'guest',
    filters,
    debouncedSearchTerm,
    isInitialized
  );

  // Separate unfiltered stats query for badge counts - prevents re-counting on tab changes
  const {
    stats: unfilteredStats,
    isLoading: isLoadingStats,
    isError: isStatsError,
  } = useDashboardStatsStable();

  // Determine if we should show loading state
  const shouldShowLoading = !isInitialized || isLoadingProjects;

  // Simplified counts calculation using unfiltered stats for badges
  const countsForTabs = useMemo((): CountsForTabsType | BadgeLoadingState => {
    logger.debug('StatsContext countsForTabs calculation:', {
      isInitialized,
      isLoadingStats,
      hasUnfilteredStats: !!unfilteredStats,
      isStatsError,
    });

    // Return loading state when filters aren't initialized yet or stats are being fetched
    if (!isInitialized) {
      logger.debug('Returning loading state - filters not initialized yet');
      return 'loading';
    }

    if (isLoadingStats) {
      logger.debug('Returning loading state - stats are loading');
      return 'loading';
    }

    // Return error state when stats fetch has failed
    if (isStatsError) {
      logger.warn('Stats fetch failed, returning error state for badges', {
        error: isStatsError,
        isNetworkSlow,
      });
      return 'error';
    }

    // Return loading state if no stats data is available after initialization
    if (!unfilteredStats?.status_breakdown) {
      logger.debug('Returning loading state - no unfilteredStats available after initialization');
      return 'loading';
    }

    // Use unfiltered stats for badge counts - ensures consistent totals regardless of current filter
    const statusBreakdown = unfilteredStats.status_breakdown;

    // Calculate active projects count: purchased (not received) + in stash + in progress + on hold
    const activeProjectsCount =
      (statusBreakdown.purchased || 0) + // purchased, not received
      (statusBreakdown.stash || 0) + // in stash
      (statusBreakdown.progress || 0) + // in progress
      (statusBreakdown.onhold || 0); // on hold

    // Debug logging to check counts
    logger.debug('📊 Active projects count calculation:', {
      purchased: statusBreakdown.purchased || 0,
      stash: statusBreakdown.stash || 0,
      progress: statusBreakdown.progress || 0,
      onhold: statusBreakdown.onhold || 0,
      calculatedTotal: activeProjectsCount,
      fullStatusBreakdown: statusBreakdown,
    });

    // Only track the 5 metrics actually displayed on dashboard
    const counts: CountsForTabsType = {
      all: activeProjectsCount, // Total Active Projects
      purchased: statusBreakdown.purchased || 0, // Purchased - Not Received
      progress: statusBreakdown.progress || 0, // In Progress
      onhold: statusBreakdown.onhold || 0, // On Hold
      stash: statusBreakdown.stash || 0, // In Stash
    };

    // Only log when counts actually change (not on every render)
    if (typeof counts.all === 'number' && counts.all > 0) {
      logger.debug('Stats counts calculated', { counts, source: 'optimized' });
    }

    return counts;
  }, [
    isInitialized,
    isLoadingStats,
    unfilteredStats, // Direct dependency since used in computation
    isStatsError,
    isNetworkSlow,
  ]);

  // Complete status counts calculation for carousel - includes all 9 statuses
  const allStatusCounts = useMemo((): AllStatusCountsType | BadgeLoadingState => {
    logger.debug('StatsContext allStatusCounts calculation:', {
      isInitialized,
      isLoadingStats,
      hasUnfilteredStats: !!unfilteredStats,
      isStatsError,
    });

    // Return loading state when filters aren't initialized yet or stats are being fetched
    if (!isInitialized) {
      logger.debug('Returning loading state - filters not initialized yet (allStatusCounts)');
      return 'loading';
    }
    if (isLoadingStats) {
      logger.debug('Returning loading state - stats are loading (allStatusCounts)');
      return 'loading';
    }

    // Return error state when stats fetch has failed
    if (isStatsError) {
      logger.warn('Stats fetch failed, returning error state for carousel', {
        error: isStatsError,
        isNetworkSlow,
      });
      return 'error';
    }

    // Return loading state if no stats data is available after initialization
    if (!unfilteredStats?.status_breakdown) {
      logger.debug(
        'Returning loading state - no unfilteredStats available after initialization (allStatusCounts)'
      );
      return 'loading';
    }

    // Use unfiltered stats for all counts - ensures consistent totals regardless of current filter
    const statusBreakdown = unfilteredStats.status_breakdown;

    // Calculate active projects count: purchased (not received) + in stash + in progress + on hold
    const activeProjectsCount =
      (statusBreakdown.purchased || 0) + // purchased, not received
      (statusBreakdown.stash || 0) + // in stash
      (statusBreakdown.progress || 0) + // in progress
      (statusBreakdown.onhold || 0); // on hold

    // Include all 9 project statuses for comprehensive carousel display
    const allCounts: AllStatusCountsType = {
      all: activeProjectsCount, // Total Active Projects
      purchased: statusBreakdown.purchased || 0, // Purchased - Not Received
      stash: statusBreakdown.stash || 0, // In Stash
      progress: statusBreakdown.progress || 0, // In Progress
      onhold: statusBreakdown.onhold || 0, // On Hold
      wishlist: statusBreakdown.wishlist || 0, // Wishlist
      completed: statusBreakdown.completed || 0, // Completed
      archived: statusBreakdown.archived || 0, // Archived
      destashed: statusBreakdown.destashed || 0, // Destashed
    };

    // Log carousel counts when they actually change
    if (typeof allCounts.all === 'number') {
      logger.debug('📊 All status counts calculated for carousel', {
        allCounts,
        source: 'optimized',
        totalStatuses: Object.keys(allCounts).length - 1, // -1 for 'all'
      });
    }

    return allCounts;
  }, [
    isInitialized,
    isLoadingStats,
    unfilteredStats, // Direct dependency since used in computation
    isStatsError,
    isNetworkSlow,
  ]);

  /**
   * Get counts for status tabs with loading state handling
   *
   * Returns actual counts when data is available, or loading state
   * indicators when data is being fetched or has failed.
   *
   * @returns Counts object or loading state
   */
  const getCountsForTabs = useCallback((): CountsForTabsType | BadgeLoadingState => {
    return countsForTabs;
  }, [countsForTabs]);

  /**
   * Get counts for all project statuses with loading state handling
   *
   * Returns complete status breakdown when data is available, or loading state
   * indicators when data is being fetched or has failed. Used by carousel.
   *
   * @returns Complete status counts object or loading state
   */
  const getAllStatusCounts = useCallback((): AllStatusCountsType | BadgeLoadingState => {
    return allStatusCounts;
  }, [allStatusCounts]);

  /**
   * Get badge content with spinner for loading states
   *
   * Shows a spinner icon when data is loading or has failed,
   * otherwise shows the actual count number.
   *
   * @param count - The actual count to display when loaded
   * @returns ReactNode with either spinner or count
   */
  const getBadgeContent = useCallback(
    (count: number): ReactNode => {
      // Use the memoized countsForTabs directly instead of calling getCountsForTabs()
      if (countsForTabs === 'loading' || countsForTabs === 'error') {
        return <SpinnerIcon className="h-3 w-3 animate-spin" />;
      }

      // Show actual count when data is available
      return count;
    },
    [countsForTabs]
  );

  /**
   * Retry failed stats request
   *
   * Manually triggers a retry of the stats query when it has failed.
   * Uses React Query's invalidation mechanism to refetch only the necessary data
   * without requiring a full page reload.
   *
   * @async
   */
  const retry = useCallback(async () => {
    if (!user?.id) {
      logger.warn('Cannot retry stats request - no user ID available');
      return;
    }

    logger.info('Manually retrying stats request via query invalidation');

    try {
      await safeInvalidateQueries(
        queryClient,
        {
          queryKey: queryKeys.stats.overview(user.id),
          refetchType: 'active',
        },
        { source: 'stats-context-retry' }
      );

      logger.info('Stats query invalidation completed successfully');
    } catch (error) {
      logger.error('Failed to invalidate stats queries during retry', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
      });
    }
  }, [queryClient, user?.id]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue: StatsContextType = useMemo(
    () => ({
      stats: unfilteredStats,
      isLoading: shouldShowLoading,
      isError: !!errorProjects,
      error: errorProjects,
      getCountsForTabs,
      getAllStatusCounts,
      getBadgeContent,
      isNetworkSlow,
      timeoutDuration,
      retry,
      source: 'optimized',
    }),
    [
      unfilteredStats,
      shouldShowLoading,
      errorProjects,
      getCountsForTabs,
      getAllStatusCounts,
      getBadgeContent,
      isNetworkSlow,
      timeoutDuration,
      retry,
    ]
  );

  return <StatsContext.Provider value={contextValue}>{children}</StatsContext.Provider>;
};

/**
 * Hook to use the StatsContext
 *
 * Provides access to dashboard statistics state and loading management.
 * Must be used within a StatsProvider component.
 *
 * @returns StatsContextType with stats data and loading states
 * @throws Error if used outside of StatsProvider
 */
export const useStats = (): StatsContextType => {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
};
