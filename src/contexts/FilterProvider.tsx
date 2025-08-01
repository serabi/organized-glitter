/**
 * Comprehensive filter context provider - combines consolidated filter contexts
 * @author @serabi
 * @created 2025-07-09
 */

import React, { ReactNode } from 'react';
import { FilterStateProvider } from '@/contexts/FilterStateContext';
import { FilterActionsProvider } from '@/contexts/FilterActionsContext';
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

/**
 * Export all consolidated hooks for easy importing
 */
export * from '@/contexts/FilterHooks';
export * from '@/contexts/FilterStateContext';
export * from '@/contexts/FilterActionsContext';
