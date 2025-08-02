/**
 * UI context definition - separated for circular import avoidance
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext } from 'react';

export type ViewType = 'grid' | 'list';

/**
 * Loading state types for different UI components
 */
export interface LoadingStates {
  /** Main content loading state */
  isMainContentLoading: boolean;
  /** Skeleton loading state for cards */
  isSkeletonLoading: boolean;
  /** Search results loading state */
  isSearchLoading: boolean;
  /** Filter options loading state */
  isFilterOptionsLoading: boolean;
  /** Page transition loading state */
  isPageTransitionLoading: boolean;
}

/**
 * Skeleton configuration for different loading patterns
 */
export interface SkeletonConfig {
  /** Number of skeleton items to display */
  count: number;
  /** Animation speed (ms) */
  animationSpeed: number;
  /** Enable shimmer effect */
  enableShimmer: boolean;
  /** Skeleton height variant */
  heightVariant: 'small' | 'medium' | 'large';
}

/**
 * @interface UIContextType
 * @since 2025-07-08
 */
interface UIContextType {
  /** Current view type (grid or list) */
  viewType: ViewType;

  /** Update view type with persistence */
  setViewType: (type: ViewType) => void;

  /** Loading states for various UI components */
  loadingStates: LoadingStates;

  /** Update individual loading state */
  setLoadingState: (key: keyof LoadingStates, value: boolean) => void;

  /** Update multiple loading states at once */
  setLoadingStates: (states: Partial<LoadingStates>) => void;

  /** Skeleton configuration */
  skeletonConfig: SkeletonConfig;

  /** Update skeleton configuration */
  setSkeletonConfig: (config: Partial<SkeletonConfig>) => void;

  /** Mobile detection state */
  isMobileView: boolean;

  /** Responsive breakpoint detection */
  isTabletView: boolean;

  /** Current screen width */
  screenWidth: number;

  /** Utility functions */
  utils: {
    /** Reset all loading states */
    resetLoadingStates: () => void;

    /** Enable skeleton loading with configuration */
    enableSkeletonLoading: (config?: Partial<SkeletonConfig>) => void;

    /** Disable skeleton loading */
    disableSkeletonLoading: () => void;

    /** Get optimal skeleton count for current view */
    getOptimalSkeletonCount: () => number;

    /** Check if any loading state is active */
    isAnyLoading: () => boolean;
  };
}

export const UIContext = createContext<UIContextType | null>(null);

export type { UIContextType };
