/**
 * Filter Provider with debounced auto-save functionality
 * @author @serabi
 * @created 2025-08-02
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useMetadata } from '@/contexts/useMetadata';
import { useMobileDevice } from '@/hooks/use-mobile';
import { useSaveNavigationContext } from '@/hooks/mutations/useSaveNavigationContext';
import useDebounce from '@/hooks/useDebounce';
import { FilterState, getDefaultFilters } from './types';
import { FilterContext, FilterContextType } from './context';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FilterProvider');

/**
 * Deep equality check for filter state to prevent unnecessary auto-saves
 */
const deepEqual = (obj1: FilterState, obj2: FilterState): boolean => {
  if (obj1 === obj2) return true;

  const keys1 = Object.keys(obj1) as (keyof FilterState)[];
  const keys2 = Object.keys(obj2) as (keyof FilterState)[];

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    const val1 = obj1[key];
    const val2 = obj2[key];

    // Handle array comparison (for selectedTags)
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      if (!val1.every((item, index) => item === val2[index])) return false;
      continue;
    }

    // Handle primitive values
    if (val1 !== val2) return false;
  }

  return true;
};

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

  // Track the last saved filters to prevent unnecessary saves
  const lastSavedFiltersRef = useRef<FilterState>(filters);

  // Debounced filters for auto-save (1000ms delay to prevent excessive database requests)
  const debouncedFilters = useDebounce(filters, 1000);

  // Simple update function - immediate local state updates, debounced auto-save
  // Memoized with empty dependency array to ensure stable reference
  const setFilters = useCallback(
    (updates: Partial<FilterState> | ((current: FilterState) => Partial<FilterState>)) => {
      setFiltersState(currentFilters => {
        const updateObj = typeof updates === 'function' ? updates(currentFilters) : updates;
        const newFilters = {
          ...currentFilters,
          ...updateObj,
          // Reset page when filters change (except when explicitly setting page)
          currentPage: 'currentPage' in updateObj ? updateObj.currentPage! : 1,
        };

        // Only update state if values actually changed to prevent unnecessary re-renders
        if (deepEqual(newFilters, currentFilters)) {
          return currentFilters;
        }

        return newFilters;
      });
    },
    []
  );

  // Debounced auto-save effect - triggers only after user stops changing filters
  // Uses deep equality check to prevent unnecessary saves
  useEffect(() => {
    if (user?.id && debouncedFilters) {
      // Check if filters have actually changed using deep equality
      if (deepEqual(debouncedFilters, lastSavedFiltersRef.current)) {
        // Skip auto-save - filters unchanged (deep equality check working correctly)
        return;
      }

      logger.debug('Auto-saving filters (debounced) - changes detected', {
        userId: user.id,
        previousFilters: lastSavedFiltersRef.current,
        newFilters: debouncedFilters,
      });

      saveFiltersMutation.mutate(
        {
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
        },
        {
          onSuccess: () => {
            // Update the last saved filters reference only after confirmed save
            lastSavedFiltersRef.current = debouncedFilters;
            logger.debug('Auto-save successful - filters synchronized');
          },
          onError: (error, variables) => {
            logger.error('Auto-save failed - filters not synchronized:', {
              userId: user.id,
              previousFilters: lastSavedFiltersRef.current,
              attemptedFilters: debouncedFilters,
              error: error?.message,
              errorStatus:
                error && typeof error === 'object' && 'status' in error
                  ? (error as { status: unknown }).status
                  : undefined,
              timestamp: Date.now(),
            });
          },
        }
      );
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

  // Memoize individual context dependencies to prevent unnecessary re-renders
  const memoizedCompanies = useMemo(() => metadata?.companies || [], [metadata?.companies]);
  const memoizedArtists = useMemo(() => metadata?.artists || [], [metadata?.artists]);
  const memoizedTags = useMemo(() => metadata?.tags || [], [metadata?.tags]);

  const contextValue: FilterContextType = useMemo(
    () => ({
      filters,
      setFilters,
      companies: memoizedCompanies,
      artists: memoizedArtists,
      tags: memoizedTags,
      isLoading,
      activeFilterCount,
    }),
    [
      filters,
      setFilters,
      memoizedCompanies,
      memoizedArtists,
      memoizedTags,
      isLoading,
      activeFilterCount,
    ]
  );

  return <FilterContext.Provider value={contextValue}>{children}</FilterContext.Provider>;
};
