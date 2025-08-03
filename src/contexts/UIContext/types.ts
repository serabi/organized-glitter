/**
 * UI Context Types
 * @author @serabi
 * @created 2025-08-02
 */

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
 * Default loading states factory
 */
export const getDefaultLoadingStates = (): LoadingStates => ({
  isMainContentLoading: false,
  isSkeletonLoading: false,
  isSearchLoading: false,
  isFilterOptionsLoading: false,
  isPageTransitionLoading: false,
});

/**
 * Default skeleton configuration factory
 */
export const getDefaultSkeletonConfig = (): SkeletonConfig => ({
  count: 12,
  animationSpeed: 1500,
  enableShimmer: true,
  heightVariant: 'medium',
});
