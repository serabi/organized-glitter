/**
 * useRecentlyEdited hook - extracted for React Fast Refresh optimization
 * @author @serabi
 * @created 2025-08-02
 */

import { useContext } from 'react';
import {
  RecentlyEditedContext,
  type RecentlyEditedContextType,
} from '@/contexts/contexts-recentlyEdited';

/**
 * Hook to access recently edited projects context
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

// Re-export RecentlyEditedProvider for backward compatibility
export { RecentlyEditedProvider } from '@/contexts/RecentlyEditedContext';
