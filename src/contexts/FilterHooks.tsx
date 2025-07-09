/**
 * Selective filter hooks for optimized component subscriptions
 * @author @serabi
 * @created 2025-07-09
 */

import { useFilterState } from '@/contexts/FilterStateContext';
import { useFilterActions } from '@/contexts/FilterActionsContext';
import { useFilterMeta } from '@/contexts/FilterMetaContext';
import { useMemo } from 'react';

/**
 * Hook for components that need filter state and actions
 * Used by: DashboardFilters, ProjectsGrid, StatusTabs
 */
export const useFilters = () => {
  const { filters, debouncedSearchTerm, isInitialized, isSearchPending } = useFilterState();
  const actions = useFilterActions();

  return useMemo(
    () => ({
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      ...actions,
    }),
    [filters, debouncedSearchTerm, isInitialized, isSearchPending, actions]
  );
};

/**
 * Hook for components that only need filter state (no actions)
 * Used by: ProjectsSection, pagination components
 */
export const useFilterStateOnly = () => {
  const { filters, debouncedSearchTerm, isInitialized, isSearchPending, isMetadataLoading } =
    useFilterState();

  return useMemo(
    () => ({
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,
    }),
    [filters, debouncedSearchTerm, isInitialized, isSearchPending, isMetadataLoading]
  );
};

/**
 * Hook for components that only need filter actions (no state)
 * Used by: individual filter components, buttons
 */
export const useFilterActionsOnly = () => {
  return useFilterActions();
};

/**
 * Hook for components that only need metadata (no state or actions)
 * Used by: dropdown components, option lists
 */
export const useFilterMetaOnly = () => {
  return useFilterMeta();
};

/**
 * Hook for components that need state and metadata (no actions)
 * Used by: display components, read-only filters
 */
export const useFilterStateAndMeta = () => {
  const { filters, debouncedSearchTerm, isInitialized, isSearchPending, isMetadataLoading } =
    useFilterState();
  const { companies, artists, drillShapes, allTags } = useFilterMeta();

  return useMemo(
    () => ({
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,
      companies,
      artists,
      drillShapes,
      allTags,
    }),
    [
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,
      companies,
      artists,
      drillShapes,
      allTags,
    ]
  );
};

/**
 * Hook for components that need actions and metadata (no state)
 * Used by: interactive filter components
 */
export const useFilterActionsAndMeta = () => {
  const actions = useFilterActions();
  const { companies, artists, drillShapes, allTags, searchInputRef } = useFilterMeta();

  return useMemo(
    () => ({
      ...actions,
      companies,
      artists,
      drillShapes,
      allTags,
      searchInputRef,
    }),
    [actions, companies, artists, drillShapes, allTags, searchInputRef]
  );
};

/**
 * Hook for components that need everything (full compatibility)
 * Used by: main dashboard wrapper, complex filter components
 */
export const useFiltersFull = () => {
  const { filters, debouncedSearchTerm, isInitialized, isSearchPending, isMetadataLoading } =
    useFilterState();
  const actions = useFilterActions();
  const { companies, artists, drillShapes, allTags, searchInputRef } = useFilterMeta();

  return useMemo(
    () => ({
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,
      companies,
      artists,
      drillShapes,
      allTags,
      searchInputRef,
      ...actions,
    }),
    [
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,
      companies,
      artists,
      drillShapes,
      allTags,
      searchInputRef,
      actions,
    ]
  );
};

/**
 * Hook for components that only need pagination state and actions
 * Used by: pagination components
 */
export const usePagination = () => {
  const { filters } = useFilterState();
  const { updatePage, updatePageSize } = useFilterActions();

  return useMemo(
    () => ({
      currentPage: filters.currentPage,
      pageSize: filters.pageSize,
      updatePage,
      updatePageSize,
    }),
    [filters.currentPage, filters.pageSize, updatePage, updatePageSize]
  );
};

/**
 * Hook for components that only need sorting state and actions
 * Used by: sorting components, table headers
 */
export const useSorting = () => {
  const { filters } = useFilterState();
  const { updateSort } = useFilterActions();

  return useMemo(
    () => ({
      sortField: filters.sortField,
      sortDirection: filters.sortDirection,
      updateSort,
    }),
    [filters.sortField, filters.sortDirection, updateSort]
  );
};

/**
 * Hook for components that only need search functionality
 * Used by: search components
 */
export const useSearch = () => {
  const { filters, debouncedSearchTerm, isSearchPending } = useFilterState();
  const { updateSearchTerm } = useFilterActions();
  const { searchInputRef } = useFilterMeta();

  return useMemo(
    () => ({
      searchTerm: filters.searchTerm,
      debouncedSearchTerm,
      isSearchPending,
      updateSearchTerm,
      searchInputRef,
    }),
    [filters.searchTerm, debouncedSearchTerm, isSearchPending, updateSearchTerm, searchInputRef]
  );
};

/**
 * Hook for components that only need status filtering
 * Used by: status tabs, status buttons
 */
export const useStatusFilter = () => {
  const { filters } = useFilterState();
  const { updateStatus } = useFilterActions();

  return useMemo(
    () => ({
      activeStatus: filters.activeStatus,
      updateStatus,
    }),
    [filters.activeStatus, updateStatus]
  );
};

/**
 * Hook for components that only need tag filtering
 * Used by: tag components
 */
export const useTagFilter = () => {
  const { filters } = useFilterState();
  const { updateTags, toggleTag, clearAllTags } = useFilterActions();
  const { allTags } = useFilterMeta();

  return useMemo(
    () => ({
      selectedTags: filters.selectedTags,
      allTags,
      updateTags,
      toggleTag,
      clearAllTags,
    }),
    [filters.selectedTags, allTags, updateTags, toggleTag, clearAllTags]
  );
};
