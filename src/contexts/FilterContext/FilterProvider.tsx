/**
 * Filter Provider
 * @author @serabi
 * @created 2025-08-02
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useMetadata } from '@/contexts/useMetadata';
import { useMobileDevice } from '@/hooks/use-mobile';
import { useSaveNavigationContext } from '@/hooks/mutations/useSaveNavigationContext';
import { FilterState, getDefaultFilters } from './types';
import { FilterContext, FilterContextType } from './context';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FilterProvider');

interface FilterProviderProps {
  children: React.ReactNode;
  user: { id: string; email?: string } | null;
}

/**
 * Simple filter provider - easy to understand and maintain
 */
export const FilterProvider: React.FC<FilterProviderProps> = ({ children, user }) => {
  const { isMobile, isTablet } = useMobileDevice();
  const isMobilePhone = isMobile && !isTablet;
  const metadata = useMetadata();
  const saveFiltersMutation = useSaveNavigationContext();

  // Simple state - no complex reducers or refs
  const [filters, setFiltersState] = useState<FilterState>(() => getDefaultFilters(isMobilePhone));

  // Simple update function with auto-save
  const setFilters = useCallback(
    (updates: Partial<FilterState> | ((current: FilterState) => Partial<FilterState>)) => {
      const updateObj = typeof updates === 'function' ? updates(filters) : updates;
      const newFilters = {
        ...filters,
        ...updateObj,
        // Reset page when filters change (except when explicitly setting page)
        currentPage: 'currentPage' in updateObj ? updateObj.currentPage! : 1,
      };

      setFiltersState(newFilters);

      // Simple auto-save - no complex rate limiting
      if (user?.id) {
        logger.debug('Auto-saving filters', { userId: user.id });

        saveFiltersMutation.mutate({
          userId: user.id,
          navigationContext: {
            filters: {
              status: newFilters.activeStatus,
              company: newFilters.selectedCompany,
              artist: newFilters.selectedArtist,
              drillShape: newFilters.selectedDrillShape,
              yearFinished: newFilters.selectedYearFinished,
              includeMiniKits: newFilters.includeMiniKits,
              includeDestashed: newFilters.includeDestashed,
              includeArchived: newFilters.includeArchived,
              includeWishlist: newFilters.includeWishlist,
              includeOnHold: newFilters.includeOnHold,
              searchTerm: newFilters.searchTerm,
              selectedTags: newFilters.selectedTags,
            },
            sortField: newFilters.sortField,
            sortDirection: newFilters.sortDirection,
            currentPage: newFilters.currentPage,
            pageSize: newFilters.pageSize,
            preservationContext: {
              scrollPosition: window.scrollY || 0,
              timestamp: Date.now(),
            },
          },
        });
      }
    },
    [filters, user?.id, saveFiltersMutation]
  );

  // Simple computed values
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.activeStatus !== 'everything') count++;
    if (filters.selectedCompany !== 'all') count++;
    if (filters.selectedArtist !== 'all') count++;
    if (filters.selectedDrillShape !== 'all') count++;
    if (filters.selectedYearFinished !== 'all') count++;
    if (!filters.includeMiniKits) count++;
    if (!filters.includeDestashed) count++;
    if (filters.includeWishlist) count++;
    if (!filters.includeOnHold) count++;
    if (filters.searchTerm) count++;
    if (filters.selectedTags.length > 0) count++;
    return count;
  }, [filters]);

  const isLoading = Boolean(
    metadata?.isLoading?.companies || metadata?.isLoading?.artists || metadata?.isLoading?.tags
  );

  const contextValue: FilterContextType = useMemo(
    () => ({
      filters,
      setFilters,
      companies: metadata?.companies || [],
      artists: metadata?.artists || [],
      tags: metadata?.tags || [],
      isLoading,
      activeFilterCount,
    }),
    [filters, setFilters, metadata, isLoading, activeFilterCount]
  );

  return <FilterContext.Provider value={contextValue}>{children}</FilterContext.Provider>;
};
