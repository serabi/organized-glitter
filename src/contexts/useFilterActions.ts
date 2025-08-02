/**
 * Filter actions hook
 * @author @serabi
 * @created 2025-08-02
 */

import { useContext } from 'react';
import { FilterActionsContext } from '@/contexts/contexts';
import { FilterActionsContextType } from '@/contexts/filterActions';

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