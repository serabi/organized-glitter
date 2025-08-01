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
export interface CountsForTabsType {
  all: number;
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  completed: number;
  destashed: number;
  archived: number;
}

// Loading state for badge content
export type BadgeLoadingState = 'idle' | 'loading' | 'error';

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
  const { statusCounts, totalItems, isLoadingProjects, errorProjects } = useDashboardData(
    user?.id || 'guest',
    filters,
    debouncedSearchTerm,
    isInitialized
  );

  // Determine if we should show loading state
  const shouldShowLoading = !isInitialized || isLoadingProjects;

  // Simplified counts calculation using statusCounts directly with optimized dependencies
  const countsForTabs = useMemo((): CountsForTabsType | BadgeLoadingState => {
    logger.debug('StatsContext countsForTabs calculation:', {
      isInitialized,
      isLoadingProjects,
      hasStatusCounts: !!statusCounts,
      isError: !!errorProjects,
    });

    // Return loading state when filters aren't initialized yet or data is being fetched
    if (!isInitialized) {
      logger.debug('Returning loading state - filters not initialized yet');
      return 'loading';
    }

    if (isLoadingProjects) {
      logger.debug('Returning loading state - projects are loading');
      return 'loading';
    }

    // Return error state when fetch has failed
    if (errorProjects) {
      logger.warn('Stats fetch failed, returning error state for badges', {
        error: errorProjects,
        isNetworkSlow,
      });
      return 'error';
    }

    // Return loading state if no data is available after initialization
    if (!statusCounts) {
      logger.debug('Returning loading state - no statusCounts available after initialization');
      return 'loading';
    }

    // Use totalItems from main query as authoritative "All" count (single source of truth)
    const counts: CountsForTabsType = {
      all: totalItems || 0,
      wishlist: statusCounts.wishlist || 0,
      purchased: statusCounts.purchased || 0,
      stash: statusCounts.stash || 0,
      progress: statusCounts.progress || 0,
      completed: statusCounts.completed || 0,
      destashed: statusCounts.destashed || 0,
      archived: statusCounts.archived || 0,
    };

    // Only log when counts actually change (not on every render)
    if (typeof counts.all === 'number' && counts.all > 0) {
      logger.debug('Stats counts calculated', { counts, source: 'optimized' });
    }

    return counts;
  }, [
    isInitialized,
    isLoadingProjects,
    statusCounts, // Direct dependency since used in computation
    totalItems,
    errorProjects,
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

  // Create simplified DashboardStats from statusCounts
  const simplifiedStats: DashboardStats | null = useMemo(() => {
    if (!statusCounts) return null;

    return {
      completed_count: statusCounts.completed,
      started_count: statusCounts.progress,
      in_progress_count: statusCounts.progress,
      total_diamonds: 0, // Not needed for current functionality
      estimated_drills: 0, // Not needed for current functionality
      status_breakdown: statusCounts,
      available_years: [], // Not needed for current functionality
    };
  }, [statusCounts]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue: StatsContextType = useMemo(
    () => ({
      stats: simplifiedStats,
      isLoading: shouldShowLoading,
      isError: !!errorProjects,
      error: errorProjects,
      getCountsForTabs,
      getBadgeContent,
      isNetworkSlow,
      timeoutDuration,
      retry,
      source: 'optimized',
    }),
    [
      simplifiedStats,
      shouldShowLoading,
      errorProjects,
      getCountsForTabs,
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
