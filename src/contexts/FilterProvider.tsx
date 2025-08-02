/**
 * Comprehensive filter context provider - combines consolidated filter contexts
 * @author @serabi
 * @created 2025-07-09
 */

import React, { ReactNode } from 'react';
import { FilterStateProvider } from '@/contexts/FilterStateProvider';
import { FilterActionsProvider } from '@/contexts/FilterActionsProvider';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FilterProvider');

/**
 * Props interface for FilterProvider component
 */
interface FilterProviderProps {
  children: ReactNode;
  user: { id: string; email?: string } | null;
}

/**
 * Main filter provider that combines the consolidated filter contexts
 * This replaces the monolithic FiltersContext with an optimized architecture
 */
export const FilterProvider: React.FC<FilterProviderProps> = ({ children, user }) => {
  logger.debug('FilterProvider rendering with user:', { userId: user?.id });

  return (
    <FilterStateProvider user={user}>
      <FilterActionsProvider user={user}>{children}</FilterActionsProvider>
    </FilterStateProvider>
  );
};

// Re-export essential hooks and types for backward compatibility
export * from '@/contexts/filterState';
export * from '@/contexts/filterActions';
export { useFilterState } from '@/contexts/useFilterState';
export { useFilterActions } from '@/contexts/useFilterActions';

// Re-export FilterHooks for compatibility
export {
  useFilters,
  useFilterStateOnly,
  usePagination,
  useSorting,
  useFilterActionsOnly,
  useStatusFilter,
  useFiltersFull,
  useFilterActionsAndMeta,
} from '@/contexts/FilterHooks';
