/**
 * Hook for accessing filter actions context
 * @author @serabi
 * @created 2025-01-14
 */

import { useContext } from 'react';
import { FilterActionsContext, FilterActionsContextType } from '@/contexts/FilterActionsContext';

/**
 * Hook to use the FilterActionsContext
 */
export const useFilterActions = (): FilterActionsContextType => {
  const context = useContext(FilterActionsContext);
  if (!context) {
    throw new Error('useFilterActions must be used within a FilterActionsProvider');
  }
  return context;
};
