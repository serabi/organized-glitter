/**
 * Comprehensive filter context provider - combines all three split contexts
 * @author @serabi
 * @created 2025-07-09
 */

import React, { ReactNode } from 'react';
import { FilterStateProvider } from '@/contexts/FilterStateContext';
import { FilterActionsProvider } from '@/contexts/FilterActionsContext';
import { FilterMetaProvider } from '@/contexts/FilterMetaContext';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('FilterProvider');

/**
 * Props interface for FilterProvider component
 */
interface FilterProviderProps {
  children: ReactNode;
  user: { id: string; email?: string } | null;
}

/**
 * Main filter provider that combines all three split contexts
 * This replaces the monolithic FiltersContext with an optimized architecture
 */
export const FilterProvider: React.FC<FilterProviderProps> = ({ children, user }) => {
  logger.debug('FilterProvider rendering with user:', { userId: user?.id });

  return (
    <FilterMetaProvider>
      <FilterStateProvider user={user}>
        <FilterActionsProvider user={user}>{children}</FilterActionsProvider>
      </FilterStateProvider>
    </FilterMetaProvider>
  );
};

/**
 * Export all selective hooks for easy importing
 */
export * from '@/contexts/FilterHooks';
export * from '@/contexts/FilterStateContext';
export * from '@/contexts/FilterActionsContext';
export * from '@/contexts/FilterMetaContext';
