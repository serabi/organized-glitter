/**
 * Filter context definition
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext } from 'react';
import { FilterState } from './types';

// Simple context type - no over-abstraction
export interface FilterContextType {
  filters: FilterState;
  setFilters: (
    updates: Partial<FilterState> | ((current: FilterState) => Partial<FilterState>)
  ) => void;

  // Metadata (from existing context)
  companies: Array<{ id: string; name: string }>;
  artists: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string; color: string }>;

  // Computed helpers
  isLoading: boolean;
  activeFilterCount: number;
}

export const FilterContext = createContext<FilterContextType | null>(null);
