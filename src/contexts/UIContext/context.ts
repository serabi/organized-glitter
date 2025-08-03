/**
 * UI Context Definition
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext } from 'react';
import { ViewType, LoadingStates, SkeletonConfig } from './types';

/**
 * UI Context Type Definition
 */
export interface UIContextType {
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
