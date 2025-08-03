/**
 * Filter Provider with debounced auto-save functionality
 * @author @serabi
 * @created 2025-08-02
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useMetadata } from '@/contexts/useMetadata';
import { useMobileDevice } from '@/hooks/use-mobile';
import { useSaveNavigationContext } from '@/hooks/mutations/useSaveNavigationContext';
import useDebounce from '@/hooks/useDebounce';
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
  // Always call the hook to avoid conditional hook calls (rules of hooks)
  // Pass a fallback userId to satisfy the type requirement, but guard the mutation call
  const saveFiltersMutation = useSaveNavigationContext(user?.id || 'no-user');

  // Simple state - no complex reducers or refs
  const [filters, setFiltersState] = useState<FilterState>(() => getDefaultFilters(isMobilePhone));

  // Debounced filters for auto-save (1000ms delay to prevent excessive database requests)
  const debouncedFilters = useDebounce(filters, 1000);

  // Simple update function - immediate local state updates, debounced auto-save
  const setFilters = useCallback(
    (updates: Partial<FilterState> | ((current: FilterState) => Partial<FilterState>)) => {
      setFiltersState(currentFilters => {
        const updateObj = typeof updates === 'function' ? updates(currentFilters) : updates;
        return {
          ...currentFilters,
          ...updateObj,
          // Reset page when filters change (except when explicitly setting page)
          currentPage: 'currentPage' in updateObj ? updateObj.currentPage! : 1,
        };
      });
    },
    []
  );

  // Debounced auto-save effect - triggers only after user stops changing filters
  useEffect(() => {
    if (user?.id && debouncedFilters) {
      logger.debug('Auto-saving filters (debounced)', { userId: user.id });

      saveFiltersMutation.mutate({
        userId: user.id,
        navigationContext: {
          filters: {
            status: debouncedFilters.activeStatus,
            company: debouncedFilters.selectedCompany,
            artist: debouncedFilters.selectedArtist,
            drillShape: debouncedFilters.selectedDrillShape,
            yearFinished: debouncedFilters.selectedYearFinished,
            includeMiniKits: debouncedFilters.includeMiniKits,
            includeDestashed: debouncedFilters.includeDestashed,
            includeArchived: debouncedFilters.includeArchived,
            includeWishlist: debouncedFilters.includeWishlist,
            includeOnHold: debouncedFilters.includeOnHold,
            searchTerm: debouncedFilters.searchTerm,
            selectedTags: debouncedFilters.selectedTags,
          },
          sortField: debouncedFilters.sortField,
          sortDirection: debouncedFilters.sortDirection,
          currentPage: debouncedFilters.currentPage,
          pageSize: debouncedFilters.pageSize,
          preservationContext: {
            scrollPosition: window.scrollY || 0,
            timestamp: Date.now(),
          },
        },
      });
    }
  }, [debouncedFilters, user?.id, saveFiltersMutation]);

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
