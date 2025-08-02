/**
 * RecentlyEdited context definition - separated for circular import avoidance
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext } from 'react';

/**
 * @interface RecentlyEditedContextType
 * Context interface for managing recently edited projects state
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

export const RecentlyEditedContext = createContext<RecentlyEditedContextType | null>(null);

export type { RecentlyEditedContextType };
