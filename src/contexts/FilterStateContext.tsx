/**
 * Filter State Context - State-only values for dashboard filters
 * @author @serabi
 * @created 2025-07-09
 */

import React, { createContext, useContext, useReducer, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMetadata } from '@/contexts/MetadataContext';
import { createLogger, performanceLogger } from '@/utils/secureLogger';
import { ProjectFilterStatus, Tag } from '@/types/project';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { DashboardFilterContext } from '@/hooks/mutations/useSaveNavigationContext';

const logger = createLogger('FilterStateContext');

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
 * Context interface for filter state management
 */
export interface FilterStateContextType {
  filters: FilterState;
  debouncedSearchTerm: string;
  isInitialized: boolean;
  isSearchPending: boolean;
  isMetadataLoading: boolean;
  dispatch: FilterDispatch;
}

const FilterStateContext = createContext<FilterStateContextType | null>(null);

/**
 * Default filter state factory
 */
export const getDefaultFilters = (): FilterState => ({
  activeStatus: 'all',
  selectedCompany: 'all',
  selectedArtist: 'all',
  selectedDrillShape: 'all',
  selectedYearFinished: 'all',
  includeMiniKits: true,
  includeDestashed: true,
  includeArchived: false,
  searchTerm: '',
  selectedTags: [],
  sortField: 'last_updated',
  sortDirection: 'desc',
  currentPage: 1,
  pageSize: 25,
  viewType: 'grid',
});

/**
 * Validate and sanitize filter state
 */
export const validateAndSanitizeFilters = (filters: Partial<FilterState>): FilterState => {
  const defaults = getDefaultFilters();

  return {
    activeStatus: filters.activeStatus || defaults.activeStatus,
    selectedCompany: filters.selectedCompany ?? defaults.selectedCompany,
    selectedArtist: filters.selectedArtist ?? defaults.selectedArtist,
    selectedDrillShape: filters.selectedDrillShape ?? defaults.selectedDrillShape,
    selectedYearFinished: filters.selectedYearFinished ?? defaults.selectedYearFinished,
    includeMiniKits: filters.includeMiniKits ?? defaults.includeMiniKits,
    includeDestashed: filters.includeDestashed ?? defaults.includeDestashed,
    includeArchived: filters.includeArchived ?? defaults.includeArchived,
    searchTerm: filters.searchTerm ?? defaults.searchTerm,
    selectedTags: Array.isArray(filters.selectedTags)
      ? filters.selectedTags
      : defaults.selectedTags,
    sortField: filters.sortField || defaults.sortField,
    sortDirection: filters.sortDirection || defaults.sortDirection,
    currentPage: filters.currentPage || defaults.currentPage,
    pageSize: filters.pageSize || defaults.pageSize,
    viewType: filters.viewType || defaults.viewType,
  };
};

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
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_TAGS'; payload: string[] }
  | { type: 'TOGGLE_TAG'; payload: string }
  | { type: 'CLEAR_ALL_TAGS' }
  | { type: 'SET_SORT'; payload: { field: DashboardValidSortField; direction: SortDirectionType } }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'SET_VIEW_TYPE'; payload: ViewType }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_INITIAL_STATE'; payload: FilterState }
  | { type: 'BATCH_UPDATE_FILTERS'; payload: Partial<FilterState> };

/**
 * Filter reducer function
 */
const filtersReducer = (state: FilterState, action: FilterAction): FilterState => {
  const perfId = performanceLogger.start(`reducer:${action.type}`);
  let newState: FilterState;

  switch (action.type) {
    case 'SET_STATUS':
      newState = { ...state, activeStatus: action.payload, currentPage: 1 };
      break;
    case 'SET_COMPANY':
      newState = { ...state, selectedCompany: action.payload || 'all', currentPage: 1 };
      break;
    case 'SET_ARTIST':
      newState = { ...state, selectedArtist: action.payload || 'all', currentPage: 1 };
      break;
    case 'SET_DRILL_SHAPE':
      newState = { ...state, selectedDrillShape: action.payload || 'all', currentPage: 1 };
      break;
    case 'SET_YEAR_FINISHED':
      newState = { ...state, selectedYearFinished: action.payload || 'all', currentPage: 1 };
      break;
    case 'SET_INCLUDE_MINI_KITS':
      newState = { ...state, includeMiniKits: action.payload, currentPage: 1 };
      break;
    case 'SET_INCLUDE_DESTASHED':
      newState = { ...state, includeDestashed: action.payload, currentPage: 1 };
      break;
    case 'SET_INCLUDE_ARCHIVED':
      newState = { ...state, includeArchived: action.payload, currentPage: 1 };
      break;
    case 'SET_SEARCH_TERM':
      newState = { ...state, searchTerm: action.payload, currentPage: 1 };
      break;
    case 'SET_TAGS':
      newState = { ...state, selectedTags: action.payload, currentPage: 1 };
      break;
    case 'TOGGLE_TAG':
      newState = {
        ...state,
        selectedTags: state.selectedTags.includes(action.payload)
          ? state.selectedTags.filter(id => id !== action.payload)
          : [...state.selectedTags, action.payload],
        currentPage: 1,
      };
      break;
    case 'CLEAR_ALL_TAGS':
      newState = { ...state, selectedTags: [], currentPage: 1 };
      break;
    case 'SET_SORT':
      newState = {
        ...state,
        sortField: action.payload.field,
        sortDirection: action.payload.direction,
        currentPage: 1,
      };
      break;
    case 'SET_PAGE':
      newState = { ...state, currentPage: action.payload };
      break;
    case 'SET_PAGE_SIZE':
      newState = { ...state, pageSize: action.payload, currentPage: 1 };
      break;
    case 'SET_VIEW_TYPE':
      newState = { ...state, viewType: action.payload };
      break;
    case 'RESET_FILTERS':
      newState = getDefaultFilters();
      break;
    case 'SET_INITIAL_STATE':
      newState = action.payload;
      break;
    case 'BATCH_UPDATE_FILTERS':
      newState = { ...state, ...action.payload, currentPage: 1 };
      break;
    default:
      newState = state;
  }

  performanceLogger.end(perfId);
  return newState;
};

/**
 * Props interface for FilterStateProvider component
 */
interface FilterStateProviderProps {
  children: ReactNode;
  user: { id: string; email?: string } | null;
}

/**
 * FilterStateProvider component that provides filter state management
 */
export const FilterStateProvider: React.FC<FilterStateProviderProps> = ({ children, user }) => {
  const userMetadata = useMetadata();
  const location = useLocation();
  const navigate = useNavigate();

  // Filter state management
  const [filters, dispatch] = useReducer(filtersReducer, getDefaultFilters());
  const [isInitialized, setIsInitialized] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // State tracking for performance and debugging
  const initializationStateRef = useRef<'pending' | 'initializing' | 'complete'>('pending');

  // Debounced search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  const isSearchPending = filters.searchTerm !== debouncedSearchTerm;

  const isMetadataLoading = Boolean(
    userMetadata?.isLoading?.companies ||
      userMetadata?.isLoading?.artists ||
      userMetadata?.isLoading?.tags
  );

  /**
   * Initialize filters from database and URL parameters with batched updates
   */
  useEffect(() => {
    if (
      !user?.id ||
      initializationStateRef.current !== 'pending' ||
      userMetadata.isLoading.tags ||
      userMetadata.isLoading.companies ||
      userMetadata.isLoading.artists
    ) {
      return;
    }

    const initializeFilters = async () => {
      initializationStateRef.current = 'initializing';
      const perfId = performanceLogger.start('initializeFilters');
      logger.info('🚀 Initializing filter state with batched updates...');

      let initialFilters = getDefaultFilters();
      let sourceOfTruth = 'defaults';

      try {
        const { pb } = await import('@/lib/pocketbase');
        const record = await pb
          .collection('user_dashboard_settings')
          .getFirstListItem(`user="${user.id}"`);

        if (record.navigation_context) {
          const savedContext = record.navigation_context as DashboardFilterContext;
          const savedTimestamp = savedContext.preservationContext?.timestamp ?? 0;
          const timeSinceLastVisit = Date.now() - savedTimestamp;
          const twentyFourHours = 24 * 60 * 60 * 1000;

          if (timeSinceLastVisit > twentyFourHours) {
            logger.info('⏰ Resetting to defaults - more than 24 hours since last visit');
            sourceOfTruth = 'defaults (24h reset)';
          } else {
            const rawSavedFilters = {
              activeStatus: savedContext.filters?.status,
              selectedCompany: savedContext.filters?.company,
              selectedArtist: savedContext.filters?.artist,
              selectedDrillShape: savedContext.filters?.drillShape,
              selectedYearFinished: savedContext.filters?.yearFinished,
              includeMiniKits: savedContext.filters?.includeMiniKits,
              includeDestashed: savedContext.filters?.includeDestashed,
              includeArchived: savedContext.filters?.includeArchived,
              searchTerm: savedContext.filters?.searchTerm,
              selectedTags: savedContext.filters?.selectedTags,
              sortField: savedContext.sortField,
              sortDirection: savedContext.sortDirection,
              currentPage: savedContext.currentPage,
              pageSize: savedContext.pageSize,
              viewType: 'grid',
            };
            initialFilters = validateAndSanitizeFilters(rawSavedFilters as Partial<FilterState>);
            sourceOfTruth = 'database';
            logger.info('✅ Restored filters from database');
          }
        }
      } catch (error) {
        if (error?.status !== 404) {
          logger.error('Error loading saved filters:', error);
        } else {
          logger.info('No saved filter settings found. Using defaults.');
          sourceOfTruth = 'defaults (no record)';
        }
      }

      // Process URL parameters
      const urlParams = new URLSearchParams(location.search);
      if (urlParams.toString().length > 0) {
        logger.info('🔥 Processing URL parameters...');
        sourceOfTruth = 'url_params';
        const urlFilters: Partial<FilterState> = {};

        const status = urlParams.get('status');
        if (status) urlFilters.activeStatus = status as ProjectFilterStatus;

        const company = urlParams.get('company');
        if (company) urlFilters.selectedCompany = company;

        const artist = urlParams.get('artist');
        if (artist) urlFilters.selectedArtist = artist;

        const tag = urlParams.get('tag');
        if (tag) {
          const matchingTag = userMetadata.tags.find(t => t.name === tag);
          if (matchingTag) urlFilters.selectedTags = [matchingTag.id];
        }

        const year = urlParams.get('year');
        if (year) urlFilters.selectedYearFinished = year;

        const drillShape = urlParams.get('drillShape');
        if (drillShape) urlFilters.selectedDrillShape = drillShape;

        initialFilters = { ...initialFilters, ...urlFilters };
        logger.info('✅ URL parameters applied');
        navigate(location.pathname, { replace: true });
      }

      logger.info('🏁 Filter state initialization complete', { sourceOfTruth });
      
      // BATCHED INITIALIZATION - Apply all initialization updates in a single React update cycle
      React.startTransition(() => {
        // Set filter state
        dispatch({ type: 'SET_INITIAL_STATE', payload: initialFilters });
        
        // Set initialization flag
        setIsInitialized(true);
        initializationStateRef.current = 'complete';
        
        logger.info('✅ Batched filter state initialization updates applied');
      });

      performanceLogger.end(perfId);
    };

    initializeFilters();
  }, [
    user?.id,
    userMetadata.isLoading.tags,
    userMetadata.isLoading.companies,
    userMetadata.isLoading.artists,
    location.search,
    location.pathname,
    navigate,
    userMetadata.tags,
  ]);

  // Stable context value - state values and dispatch function
  const contextValue: FilterStateContextType = {
    filters,
    debouncedSearchTerm,
    isInitialized,
    isSearchPending,
    isMetadataLoading,
    dispatch,
  };

  return (
    <FilterStateContext.Provider value={contextValue}>
      {children}
    </FilterStateContext.Provider>
  );
};

/**
 * Hook to use the FilterStateContext
 */
export const useFilterState = (): FilterStateContextType => {
  const context = useContext(FilterStateContext);
  if (!context) {
    throw new Error('useFilterState must be used within a FilterStateProvider');
  }
  return context;
};

// Export the dispatch function type for FilterActionsContext
export type FilterDispatch = React.Dispatch<FilterAction>;