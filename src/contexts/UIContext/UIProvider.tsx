/**
 * @fileoverview Dashboard UI Context Provider
 *
 * Focused context for managing dashboard UI state including view preferences,
 * loading states, and skeleton display patterns. Extracted from the monolithic
 * DashboardFiltersContext to improve performance and UI responsiveness.
 *
 * This context provides comprehensive UI state management for the dashboard,
 * focusing on visual presentation, loading states, and user interface preferences.
 * It implements modern skeleton loading patterns and responsive design considerations.
 *
 * Key Features:
 * - View type management (grid/list) with persistence
 * - Skeleton loading states for improved perceived performance
 * - Mobile-optimized UI state handling
 * - Responsive design state management
 * - Loading state coordination across components
 * - Performance-optimized UI updates
 *
 * Performance Optimizations:
 * - Minimal re-renders through focused state scope
 * - Memoized context values and callbacks
 * - Efficient skeleton loading patterns
 * - Optimized mobile UI state management
 *
 * Mobile Considerations:
 * - Adaptive skeleton loading for mobile networks
 * - Touch-friendly UI state management
 * - Responsive view type handling
 * - Mobile-specific loading patterns
 *
 * @author @serabi
 * @since 2025-07-08
 * @version 1.0.0
 *
 * Dependencies:
 * - React for context and state management
 * - @/utils/secureLogger for debugging
 * - Local storage for view preference persistence
 *
 * @see {@link StatsContext} for statistics state management
 * @see {@link FiltersContext} for filter state management
 * @see {@link RecentlyEditedContext} for recently edited tracking
 */

import React, { useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { UIContext, UIContextType } from './context';
import {
  ViewType,
  LoadingStates,
  SkeletonConfig,
  getDefaultLoadingStates,
  getDefaultSkeletonConfig,
} from './types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UIContext');

/**
 * Props interface for UIProvider component
 */
interface UIProviderProps {
  children: ReactNode;
}

/**
 * UIProvider component that provides dashboard UI context
 *
 * Manages all UI-related state including view preferences, loading states,
 * and responsive design considerations. Implements modern skeleton loading
 * patterns and performance optimizations.
 *
 * @param props - Provider props containing children
 * @returns JSX element with UI context
 */
export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  // View type state with localStorage persistence
  const [viewType, setViewTypeState] = useState<ViewType>(() => {
    try {
      const saved = localStorage.getItem('dashboard-view-type');
      return (saved as ViewType) || 'grid';
    } catch (_error) {
      logger.debug('Failed to load view type from localStorage, using default');
      return 'grid';
    }
  });

  // Loading states management
  const [loadingStates, setLoadingStatesState] = useState<LoadingStates>(getDefaultLoadingStates);

  // Skeleton configuration
  const [skeletonConfig, setSkeletonConfigState] =
    useState<SkeletonConfig>(getDefaultSkeletonConfig);

  // Responsive design state
  const [screenWidth, setScreenWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  // Computed responsive values
  const isMobileView = useMemo(() => screenWidth < 768, [screenWidth]);
  const isTabletView = useMemo(() => screenWidth >= 768 && screenWidth < 1024, [screenWidth]);

  /**
   * Handle window resize for responsive design
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Update view type with localStorage persistence
   */
  const setViewType = useCallback(
    (type: ViewType) => {
      logger.debug('Updating view type', { from: viewType, to: type });
      setViewTypeState(type);

      try {
        localStorage.setItem('dashboard-view-type', type);
      } catch (error) {
        logger.warn('Failed to save view type to localStorage', error);
      }
    },
    [viewType]
  );

  /**
   * Update individual loading state
   */
  const setLoadingState = useCallback((key: keyof LoadingStates, value: boolean) => {
    logger.debug('Updating loading state', { key, value });
    setLoadingStatesState(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Update multiple loading states at once
   */
  const setLoadingStates = useCallback((states: Partial<LoadingStates>) => {
    logger.debug('Updating multiple loading states', states);
    setLoadingStatesState(prev => ({ ...prev, ...states }));
  }, []);

  /**
   * Update skeleton configuration
   */
  const setSkeletonConfig = useCallback((config: Partial<SkeletonConfig>) => {
    logger.debug('Updating skeleton configuration', config);
    setSkeletonConfigState(prev => ({ ...prev, ...config }));
  }, []);

  /**
   * Reset all loading states to default
   */
  const resetLoadingStates = useCallback(() => {
    logger.debug('Resetting all loading states');
    setLoadingStatesState(getDefaultLoadingStates());
  }, []);

  /**
   * Enable skeleton loading with optional configuration
   */
  const enableSkeletonLoading = useCallback((config?: Partial<SkeletonConfig>) => {
    logger.debug('Enabling skeleton loading', config);

    if (config) {
      setSkeletonConfigState(prev => ({ ...prev, ...config }));
    }

    setLoadingStatesState(prev => ({ ...prev, isSkeletonLoading: true }));
  }, []);

  /**
   * Disable skeleton loading
   */
  const disableSkeletonLoading = useCallback(() => {
    logger.debug('Disabling skeleton loading');
    setLoadingStatesState(prev => ({ ...prev, isSkeletonLoading: false }));
  }, []);

  /**
   * Get optimal skeleton count based on current view and screen size
   */
  const getOptimalSkeletonCount = useCallback(() => {
    if (isMobileView) {
      return viewType === 'grid' ? 6 : 8;
    }

    if (isTabletView) {
      return viewType === 'grid' ? 9 : 12;
    }

    return viewType === 'grid' ? 12 : 15;
  }, [isMobileView, isTabletView, viewType]);

  /**
   * Check if any loading state is currently active
   */
  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  // Utility functions object
  const utils = useMemo(
    () => ({
      resetLoadingStates,
      enableSkeletonLoading,
      disableSkeletonLoading,
      getOptimalSkeletonCount,
      isAnyLoading,
    }),
    [
      resetLoadingStates,
      enableSkeletonLoading,
      disableSkeletonLoading,
      getOptimalSkeletonCount,
      isAnyLoading,
    ]
  );

  // Memoized context value to prevent unnecessary re-renders
  const contextValue: UIContextType = useMemo(
    () => ({
      viewType,
      setViewType,
      loadingStates,
      setLoadingState,
      setLoadingStates,
      skeletonConfig,
      setSkeletonConfig,
      isMobileView,
      isTabletView,
      screenWidth,
      utils,
    }),
    [
      viewType,
      setViewType,
      loadingStates,
      setLoadingState,
      setLoadingStates,
      skeletonConfig,
      setSkeletonConfig,
      isMobileView,
      isTabletView,
      screenWidth,
      utils,
    ]
  );

  return <UIContext.Provider value={contextValue}>{children}</UIContext.Provider>;
};
