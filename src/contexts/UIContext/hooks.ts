/**
 * UI Context Hooks
 * @author @serabi
 * @created 2025-08-02
 */

import { useContext, useMemo } from 'react';
import { UIContext, UIContextType } from './context';

/**
 * Main UI hook - covers most use cases
 */
export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

/**
 * Loading state utilities hook
 */
export const useLoadingStates = () => {
  const { loadingStates, setLoadingState, setLoadingStates, utils } = useUI();

  return useMemo(
    () => ({
      loadingStates,
      setLoadingState,
      setLoadingStates,
      resetLoadingStates: utils.resetLoadingStates,
      isAnyLoading: utils.isAnyLoading,
    }),
    [loadingStates, setLoadingState, setLoadingStates, utils]
  );
};

/**
 * Skeleton loading utilities hook
 */
export const useSkeletonLoading = () => {
  const { skeletonConfig, setSkeletonConfig, loadingStates, utils } = useUI();

  return useMemo(
    () => ({
      skeletonConfig,
      setSkeletonConfig,
      isSkeletonLoading: loadingStates.isSkeletonLoading,
      enableSkeletonLoading: utils.enableSkeletonLoading,
      disableSkeletonLoading: utils.disableSkeletonLoading,
      getOptimalSkeletonCount: utils.getOptimalSkeletonCount,
    }),
    [skeletonConfig, setSkeletonConfig, loadingStates.isSkeletonLoading, utils]
  );
};

/**
 * Responsive utilities hook
 */
export const useResponsive = () => {
  const { isMobileView, isTabletView, screenWidth } = useUI();

  return useMemo(
    () => ({
      isMobileView,
      isTabletView,
      screenWidth,
      isDesktopView: !isMobileView && !isTabletView,
    }),
    [isMobileView, isTabletView, screenWidth]
  );
};

/**
 * View type utilities hook
 */
export const useViewType = () => {
  const { viewType, setViewType } = useUI();

  return useMemo(
    () => ({
      viewType,
      setViewType,
      isGridView: viewType === 'grid',
      isListView: viewType === 'list',
      toggleViewType: () => setViewType(viewType === 'grid' ? 'list' : 'grid'),
    }),
    [viewType, setViewType]
  );
};
