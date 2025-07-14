/**
 * Consolidated filter hooks for optimized component subscriptions
 * @author @serabi
 * @created 2025-07-09
 */

import { useFilterState } from '@/contexts/FilterStateContext';
import { useFilterActions } from '@/hooks/useFilterActions';
import { useMemo } from 'react';

/**
 * Hook for components that need comprehensive filter functionality
 * Consolidates state, actions, and metadata for optimal performance
 * Used by: DashboardFilters, ProjectsGrid, StatusTabs, AdvancedFilters
 */
export const useFilters = () => {
  const {
    filters,
    debouncedSearchTerm,
    isInitialized,
    isSearchPending,
    isMetadataLoading,
    companies,
    artists,
    tags,
    drillShapes,
    searchInputRef,
  } = useFilterState();
  const actions = useFilterActions();

  return useMemo(
    () => ({
      // State
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,

      // Metadata (ID-based for consistent querying)
      companies,
      artists,
      tags: tags, // Already includes id, name, color
      drillShapes,
      searchInputRef,

      // Actions
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
      tags,
      drillShapes,
      searchInputRef,
      actions,
    ]
  );
};

/**
 * Hook for components that only need filter state and basic metadata
 * Used by: ProjectsSection, pagination components, read-only displays
 */
export const useFilterStateOnly = () => {
  const {
    filters,
    debouncedSearchTerm,
    isInitialized,
    isSearchPending,
    isMetadataLoading,
    companies,
    artists,
    tags,
    drillShapes,
  } = useFilterState();

  return useMemo(
    () => ({
      // State
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,

      // Metadata for display purposes
      companies,
      artists,
      tags,
      drillShapes,
    }),
    [
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,
      companies,
      artists,
      tags,
      drillShapes,
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
 * Hook for components that only need filter actions (no state)
 * Used by: individual filter components, buttons
 */
export const useFilterActionsOnly = () => {
  return useFilterActions();
};

/**
 * Hook for components that need status filtering
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
 * Hook for components that need everything (full compatibility)
 * Used by: main dashboard wrapper, complex filter components
 */
export const useFiltersFull = () => {
  const {
    filters,
    debouncedSearchTerm,
    isInitialized,
    isSearchPending,
    isMetadataLoading,
    companies,
    artists,
    tags,
    drillShapes,
    companiesOptions,
    artistsOptions,
    drillShapesOptions,
    searchInputRef,
  } = useFilterState();
  const actions = useFilterActions();

  return useMemo(
    () => ({
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,
      companies,
      artists,
      tags,
      drillShapes,
      // Computed options for DashboardFilters backward compatibility
      companiesOptions,
      artistsOptions,
      drillShapesOptions,
      allTags: tags, // Alias for backward compatibility
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
      tags,
      drillShapes,
      companiesOptions,
      artistsOptions,
      drillShapesOptions,
      searchInputRef,
      actions,
    ]
  );
};

/**
 * Hook for components that need actions and metadata (no state)
 * Used by: interactive filter components
 */
export const useFilterActionsAndMeta = () => {
  const actions = useFilterActions();
  const {
    companies,
    artists,
    drillShapes,
    tags,
    companiesOptions,
    artistsOptions,
    drillShapesOptions,
    searchInputRef,
  } = useFilterState();

  return useMemo(
    () => ({
      ...actions,
      companies,
      artists,
      drillShapes,
      tags,
      companiesOptions,
      artistsOptions,
      drillShapesOptions,
      allTags: tags, // Alias for backward compatibility
      searchInputRef,
    }),
    [
      actions,
      companies,
      artists,
      drillShapes,
      tags,
      companiesOptions,
      artistsOptions,
      drillShapesOptions,
      searchInputRef,
    ]
  );
};
