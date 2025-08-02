/**
 * Filter state types and utilities
 * @author @serabi
 * @created 2025-08-02
 */

import React from 'react';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { ProjectFilterStatus } from '@/types/project';

/**
 * Sort direction type definition
 */
export type SortDirectionType = 'asc' | 'desc';

/**
 * View type definition for dashboard display
 */
export type ViewType = 'grid' | 'list';

/**
 * Source of filter changes for debugging and state management
 */
export type ChangeSource = 'user' | 'system' | 'real-time' | 'initialization' | 'batch';

/**
 * Comprehensive filter state interface
 */
export interface FilterState {
  // Server-side filters
  activeStatus: ProjectFilterStatus;
  selectedCompany: string;
  selectedArtist: string;
  selectedDrillShape: string;
  selectedYearFinished: string;
  includeMiniKits: boolean;
  includeDestashed: boolean;
  includeArchived: boolean;
  includeWishlist: boolean;
  includeOnHold: boolean;
  searchTerm: string;
  selectedTags: string[];

  // Sorting
  sortField: DashboardValidSortField;
  sortDirection: SortDirectionType;

  // Pagination
  currentPage: number;
  pageSize: number;

  // View
  viewType: ViewType;
}

/**
 * Context interface for filter state management with integrated metadata
 */
export interface FilterStateContextType {
  filters: FilterState;
  debouncedSearchTerm: string;
  isInitialized: boolean;
  isSearchPending: boolean;
  isMetadataLoading: boolean;
  dispatch: FilterDispatch;

  // Raw metadata (ID-based for queries)
  companies: Array<{ id: string; name: string }>;
  artists: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
  drillShapes: string[];
  searchInputRef: React.RefObject<HTMLInputElement>;

  // Computed properties for backward compatibility with DashboardFilters
  companiesOptions: Array<{ label: string; value: string }>;
  artistsOptions: Array<{ label: string; value: string }>;
  drillShapesOptions: Array<{ label: string; value: string }>;
}

/**
 * Filter reducer action types
 */
export type FilterAction =
  | { type: 'SET_STATUS'; payload: ProjectFilterStatus }
  | { type: 'SET_COMPANY'; payload: string | null }
  | { type: 'SET_ARTIST'; payload: string | null }
  | { type: 'SET_DRILL_SHAPE'; payload: string | null }
  | { type: 'SET_YEAR_FINISHED'; payload: string | null }
  | { type: 'SET_INCLUDE_MINI_KITS'; payload: boolean }
  | { type: 'SET_INCLUDE_DESTASHED'; payload: boolean }
  | { type: 'SET_INCLUDE_ARCHIVED'; payload: boolean }
  | { type: 'SET_INCLUDE_WISHLIST'; payload: boolean }
  | { type: 'SET_INCLUDE_ON_HOLD'; payload: boolean }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_TAGS'; payload: string[] }
  | { type: 'TOGGLE_TAG'; payload: string }
  | { type: 'CLEAR_ALL_TAGS' }
  | { type: 'SET_SORT'; payload: { field: DashboardValidSortField; direction: SortDirectionType } }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'SET_VIEW_TYPE'; payload: ViewType }
  | { type: 'RESET_FILTERS' }
  | { type: 'RESET_FILTERS_WITH_DEVICE'; payload: boolean }
  | { type: 'SET_INITIAL_STATE'; payload: FilterState }
  | { type: 'BATCH_UPDATE_FILTERS'; payload: Partial<FilterState> };

/**
 * Default filter state factory
 */
export const getDefaultFilters = (isMobilePhone = false): FilterState => ({
  activeStatus: 'active',
  selectedCompany: 'all',
  selectedArtist: 'all',
  selectedDrillShape: 'all',
  selectedYearFinished: 'all',
  includeMiniKits: true,
  includeDestashed: false,
  includeArchived: false,
  includeWishlist: false,
  includeOnHold: true,
  searchTerm: '',
  selectedTags: [],
  sortField: 'last_updated',
  sortDirection: 'desc',
  currentPage: 1,
  pageSize: 25,
  viewType: isMobilePhone ? 'list' : 'grid', // List on mobile phones, grid on tablets/desktop
});

/**
 * Validate and sanitize filter state
 */
export const validateAndSanitizeFilters = (
  filters: Partial<FilterState>,
  isMobilePhone = false
): FilterState => {
  const defaults = getDefaultFilters(isMobilePhone);

  return {
    activeStatus: filters.activeStatus || defaults.activeStatus,
    selectedCompany: filters.selectedCompany ?? defaults.selectedCompany,
    selectedArtist: filters.selectedArtist ?? defaults.selectedArtist,
    selectedDrillShape: filters.selectedDrillShape ?? defaults.selectedDrillShape,
    selectedYearFinished: filters.selectedYearFinished ?? defaults.selectedYearFinished,
    includeMiniKits: filters.includeMiniKits ?? defaults.includeMiniKits,
    includeDestashed: filters.includeDestashed ?? defaults.includeDestashed,
    includeArchived: filters.includeArchived ?? defaults.includeArchived,
    includeWishlist: filters.includeWishlist ?? defaults.includeWishlist,
    includeOnHold: filters.includeOnHold ?? defaults.includeOnHold,
    searchTerm: filters.searchTerm ?? defaults.searchTerm,
    selectedTags: Array.isArray(filters.selectedTags)
      ? [...filters.selectedTags] // Create a stable copy to prevent reference issues
      : [...defaults.selectedTags],
    sortField: filters.sortField || defaults.sortField,
    sortDirection: filters.sortDirection || defaults.sortDirection,
    currentPage: filters.currentPage || defaults.currentPage,
    pageSize: filters.pageSize || defaults.pageSize,
    // Use saved viewType if it exists, otherwise use device-aware default
    viewType: filters.viewType || defaults.viewType,
  };
};

// Export the dispatch function type for FilterActionsContext
export type FilterDispatch = React.Dispatch<FilterAction>;
