/**
 * Filter state hook
 * @author @serabi
 * @created 2025-08-02
 */

import { useContext } from 'react';
import { FilterStateContext } from '@/contexts/contexts';
import { FilterStateContextType } from '@/contexts/filterState';

/**
 * Hook to use the FilterStateContext
 */
export const useFilterState = (): FilterStateContextType => {
  const context = useContext(FilterStateContext);
  if (!context) {
    throw new Error('useFilterState must be used within a FilterStateProvider');
  }
  return context;
};