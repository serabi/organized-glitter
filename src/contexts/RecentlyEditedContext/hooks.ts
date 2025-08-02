/**
 * Recently Edited Context Hooks
 * @author @serabi
 * @created 2025-08-02
 */

import { useContext, useMemo } from 'react';
import { RecentlyEditedContext, RecentlyEditedContextType } from './context';

/**
 * Main recently edited hook - covers most use cases
 * @returns Full recently edited context with all data and functions
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
 * Recently edited state utilities hook
 *
 * Provides utilities and computed values for recently edited state.
 * Optimized with useMemo to prevent unnecessary re-renders.
 */
export const useRecentlyEditedState = () => {
  const { recentlyEditedProjectId } = useRecentlyEdited();

  return useMemo(
    () => ({
      recentlyEditedProjectId,
      hasRecentlyEdited: recentlyEditedProjectId !== null,
      isCleared: recentlyEditedProjectId === null,
    }),
    [recentlyEditedProjectId]
  );
};

/**
 * Recently edited actions utilities hook
 *
 * Provides action methods for managing recently edited state.
 * Useful when components only need actions without the state data.
 */
export const useRecentlyEditedActions = () => {
  const { setRecentlyEditedProjectId, clearRecentlyEdited, isRecentlyEdited } = useRecentlyEdited();

  return useMemo(
    () => ({
      setRecentlyEditedProjectId,
      clearRecentlyEdited,
      isRecentlyEdited,
      markAsRecentlyEdited: setRecentlyEditedProjectId,
    }),
    [setRecentlyEditedProjectId, clearRecentlyEdited, isRecentlyEdited]
  );
};

/**
 * Project-specific recently edited utilities hook
 *
 * @param projectId - Project ID to check against recently edited state
 * @returns Utilities specific to the provided project ID
 */
export const useProjectRecentlyEdited = (projectId: string) => {
  const { recentlyEditedProjectId, setRecentlyEditedProjectId, isRecentlyEdited } =
    useRecentlyEdited();

  return useMemo(
    () => ({
      isThisProjectRecentlyEdited: isRecentlyEdited(projectId),
      isCurrentlyRecentlyEdited: recentlyEditedProjectId === projectId,
      markThisProjectAsRecentlyEdited: () => setRecentlyEditedProjectId(projectId),
      clearIfThisProjectIsRecentlyEdited: () => {
        if (recentlyEditedProjectId === projectId) {
          setRecentlyEditedProjectId(null);
        }
      },
    }),
    [projectId, recentlyEditedProjectId, setRecentlyEditedProjectId, isRecentlyEdited]
  );
};
