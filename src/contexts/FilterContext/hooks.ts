/**
 * Filter hooks - Separated for React Fast Refresh compatibility
 * @author @serabi
 * @created 2025-08-02
 */

import { useContext, useMemo } from 'react';
import { FilterContext } from './context';
import { getDefaultFilters } from './types';
import { ProjectFilterStatus } from '@/types/project';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';

/**
 * Main hook - covers 90% of use cases
 */
export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};

/**
 * Helper functions for common filter updates
 */
export const useFilterHelpers = () => {
  const { setFilters } = useFilters();

  return useMemo(
    () => ({
      updateStatus: (status: ProjectFilterStatus) => setFilters({ activeStatus: status }),
      updateCompany: (company: string) => setFilters({ selectedCompany: company }),
      updateArtist: (artist: string) => setFilters({ selectedArtist: artist }),
      updateDrillShape: (shape: string) => setFilters({ selectedDrillShape: shape }),
      updateYearFinished: (year: string) => setFilters({ selectedYearFinished: year }),
      updateSearch: (searchTerm: string) => setFilters({ searchTerm }),
      updateTags: (selectedTags: string[]) => setFilters({ selectedTags }),
      toggleTag: (tagId: string) => {
        setFilters(current => {
          const currentTags = current.selectedTags;
          const newTags = currentTags.includes(tagId)
            ? currentTags.filter(id => id !== tagId)
            : [...currentTags, tagId];
          return { selectedTags: newTags };
        });
      },
      updateSort: (sortField: DashboardValidSortField, sortDirection: 'asc' | 'desc') =>
        setFilters({ sortField, sortDirection }),
      updatePage: (currentPage: number) => setFilters({ currentPage }),
      updatePageSize: (pageSize: number) => setFilters({ pageSize }),
      updateViewType: (viewType: 'grid' | 'list') => setFilters({ viewType }),
      resetFilters: () => setFilters(getDefaultFilters()),
    }),
    [setFilters]
  );
};

// Legacy compatibility aliases
export const useFilterState = useFilters;
export const useFilterActions = useFilterHelpers;
