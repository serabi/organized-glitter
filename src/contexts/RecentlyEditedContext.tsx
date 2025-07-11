/**
 * @fileoverview Recently Edited Project Context Provider
 *
 * Simple context for tracking the most recently edited project in the dashboard.
 * Extracted from the monolithic DashboardFiltersContext to improve performance
 * and reduce unnecessary re-renders.
 *
 * This context provides a minimal state management solution for tracking which
 * project was most recently edited, allowing the UI to highlight or provide
 * special handling for recently modified projects.
 *
 * Key Features:
 * - Lightweight state management for recently edited project tracking
 * - Type-safe project ID handling
 * - Minimal re-renders through focused context scope
 * - Simple API for setting and clearing recently edited state
 * - Comprehensive TypeScript support
 *
 * Usage:
 * ```typescript
 * const { recentlyEditedProjectId, setRecentlyEditedProjectId } = useRecentlyEdited();
 *
 * // Set recently edited project
 * setRecentlyEditedProjectId(projectId);
 *
 * // Clear recently edited state
 * setRecentlyEditedProjectId(null);
 * ```
 *
 * @author serabi
 * @since 2025-07-08
 * @version 1.0.0
 *
 * Performance Considerations:
 * - Uses React.useState for minimal state management
 * - Implements useMemo for context value optimization
 * - Minimal re-renders through focused context scope
 * - No complex state transitions or side effects
 *
 * Dependencies:
 * - React for context and state management
 * - @/utils/secureLogger for debugging
 *
 * @see {@link StatsContext} for statistics state management
 * @see {@link FiltersContext} for filter state management
 * @see {@link UIContext} for UI state management
 */

import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('RecentlyEditedContext');

/**
 * Context interface for recently edited project management
 *
 * Provides simple state management for tracking the most recently
 * edited project in the dashboard interface.
 *
 * @interface RecentlyEditedContextType
 * @since 2025-07-08
 */
interface RecentlyEditedContextType {
  /** ID of the most recently edited project, or null if none */
  recentlyEditedProjectId: string | null;

  /**
   * Set the recently edited project ID
   *
   * @param id - Project ID to set as recently edited, or null to clear
   */
  setRecentlyEditedProjectId: (id: string | null) => void;

  /**
   * Clear the recently edited project state
   *
   * Convenience method equivalent to setRecentlyEditedProjectId(null)
   */
  clearRecentlyEdited: () => void;

  /**
   * Check if a specific project is the recently edited one
   *
   * @param projectId - Project ID to check
   * @returns True if the project is recently edited
   */
  isRecentlyEdited: (projectId: string) => boolean;
}

const RecentlyEditedContext = createContext<RecentlyEditedContextType | null>(null);

/**
 * Props interface for RecentlyEditedProvider component
 *
 * @interface RecentlyEditedProviderProps
 */
interface RecentlyEditedProviderProps {
  children: ReactNode;
}

/**
 * RecentlyEditedProvider component that provides recently edited project context
 *
 * Manages the state of the most recently edited project in the dashboard.
 * This context is designed to be lightweight and focused on a single piece
 * of state without complex side effects.
 *
 * @param props - Provider props containing children
 * @returns JSX element with recently edited context
 */
export const RecentlyEditedProvider: React.FC<RecentlyEditedProviderProps> = ({ children }) => {
  // Simple state for tracking recently edited project
  const [recentlyEditedProjectId, setRecentlyEditedProjectId] = useState<string | null>(null);

  /**
   * Clear the recently edited project state
   *
   * Convenience method for clearing the recently edited project.
   * Equivalent to calling setRecentlyEditedProjectId(null).
   */
  const clearRecentlyEdited = useCallback(() => {
    logger.debug('Clearing recently edited project state');
    setRecentlyEditedProjectId(null);
  }, []);

  /**
   * Check if a specific project is the recently edited one
   *
   * Utility method to check if a given project ID matches the
   * currently tracked recently edited project.
   *
   * @param projectId - Project ID to check
   * @returns True if the project is recently edited
   */
  const isRecentlyEdited = useCallback(
    (projectId: string): boolean => {
      return recentlyEditedProjectId === projectId;
    },
    [recentlyEditedProjectId]
  );

  /**
   * Enhanced setRecentlyEditedProjectId with logging
   *
   * Wraps the state setter with logging for debugging purposes.
   *
   * @param id - Project ID to set as recently edited, or null to clear
   */
  const setRecentlyEditedProjectIdWithLogging = useCallback(
    (id: string | null) => {
      logger.debug('Setting recently edited project', {
        previousId: recentlyEditedProjectId,
        newId: id,
      });
      setRecentlyEditedProjectId(id);
    },
    [recentlyEditedProjectId]
  );

  // Memoized context value to prevent unnecessary re-renders
  const contextValue: RecentlyEditedContextType = useMemo(
    () => ({
      recentlyEditedProjectId,
      setRecentlyEditedProjectId: setRecentlyEditedProjectIdWithLogging,
      clearRecentlyEdited,
      isRecentlyEdited,
    }),
    [
      recentlyEditedProjectId,
      setRecentlyEditedProjectIdWithLogging,
      clearRecentlyEdited,
      isRecentlyEdited,
    ]
  );

  return (
    <RecentlyEditedContext.Provider value={contextValue}>{children}</RecentlyEditedContext.Provider>
  );
};

/**
 * Hook to use the RecentlyEditedContext
 *
 * Provides access to recently edited project state and management functions.
 * Must be used within a RecentlyEditedProvider component.
 *
 * @returns RecentlyEditedContextType with recently edited state and functions
 * @throws Error if used outside of RecentlyEditedProvider
 */
export const useRecentlyEdited = (): RecentlyEditedContextType => {
  const context = useContext(RecentlyEditedContext);
  if (!context) {
    throw new Error('useRecentlyEdited must be used within a RecentlyEditedProvider');
  }
  return context;
};

/**
 * Default export for the RecentlyEditedContext
 * @deprecated Use named exports instead
 */
export default RecentlyEditedContext;
