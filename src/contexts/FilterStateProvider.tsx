/**
 * Filter State Provider - State-only values for dashboard filters
 * @author @serabi
 * @created 2025-08-02
 */

import React, {
  useReducer,
  useState,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMetadata } from '@/contexts/MetadataContext';
import { createLogger, performanceLogger } from '@/utils/logger';
import { DashboardFilterContext } from '@/hooks/mutations/useSaveNavigationContext';
import { useMobileDevice } from '@/hooks/use-mobile';
import {
  FilterState,
  FilterAction,
  FilterStateContextType,
  getDefaultFilters,
  validateAndSanitizeFilters,
} from '@/contexts/filterState';
import { FilterStateContext } from '@/contexts/contexts';
import { ProjectFilterStatus } from '@/types/project';

const logger = createLogger('FilterStateContext');

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
    case 'SET_INCLUDE_WISHLIST':
      newState = { ...state, includeWishlist: action.payload, currentPage: 1 };
      break;
    case 'SET_INCLUDE_ON_HOLD':
      newState = { ...state, includeOnHold: action.payload, currentPage: 1 };
      break;
    case 'SET_SEARCH_TERM':
      newState = { ...state, searchTerm: action.payload, currentPage: 1 };
      break;
    case 'SET_TAGS':
      newState = { ...state, selectedTags: action.payload, currentPage: 1 };
      break;
    case 'TOGGLE_TAG': {
      const currentTags = state.selectedTags;
      const tagId = action.payload;
      const isTagSelected = currentTags.includes(tagId);

      // Optimize array operations to prevent unnecessary reconstructions
      const newSelectedTags = isTagSelected
        ? currentTags.filter(id => id !== tagId)
        : [...currentTags, tagId];

      newState = {
        ...state,
        selectedTags: newSelectedTags,
        currentPage: 1,
      };
      break;
    }
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
      newState = getDefaultFilters(); // Legacy support - defaults to grid
      break;
    case 'RESET_FILTERS_WITH_DEVICE':
      newState = getDefaultFilters(action.payload); // Device-aware reset
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
 * Memoized to prevent unnecessary re-renders when user prop doesn't change
 */
const FilterStateProviderComponent: React.FC<FilterStateProviderProps> = ({ children, user }) => {
  const userMetadata = useMetadata();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useMobileDevice();

  // Determine if this is a mobile phone (not tablet)
  const isMobilePhone = isMobile && !isTablet;

  // Filter state management
  const [filters, dispatch] = useReducer(filtersReducer, getDefaultFilters(isMobilePhone));
  const [isInitialized, setIsInitialized] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // State tracking for performance and debugging
  const initializationStateRef = useRef<'pending' | 'initializing' | 'complete'>('pending');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ref to track current filters state for async operations (prevents stale closures)
  const filtersRef = useRef(filters);

  // Debounced search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  // Keep filtersRef synchronized with current filters state
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

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
    if (!user?.id || initializationStateRef.current !== 'pending' || isMetadataLoading) {
      return;
    }

    const initializeFilters = () => {
      initializationStateRef.current = 'initializing';
      const perfId = performanceLogger.start('initializeFilters');
      logger.info('🚀 Initializing filter state with batched updates...');

      let initialFilters = getDefaultFilters(isMobilePhone);
      let sourceOfTruth = 'defaults';

      // OPTIMIZATION: Initialize with defaults immediately, load saved state in background
      React.startTransition(() => {
        // Process URL parameters first (synchronous)
        const urlParams = new URLSearchParams(location.search);
        if (urlParams.toString().length > 0) {
          logger.info('🔥 Processing URL parameters...');
          sourceOfTruth = 'url_params';
          const urlFilters: Partial<FilterState> = {};

          const status = urlParams.get('status');
          if (status) {
            // Backward compatibility: map old 'all' status to 'active'
            const mappedStatus = status === 'all' ? 'active' : status;
            urlFilters.activeStatus = mappedStatus as ProjectFilterStatus;
          }

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

        // Set initial state immediately with defaults/URL params
        dispatch({ type: 'SET_INITIAL_STATE', payload: initialFilters });
        setIsInitialized(true);
        initializationStateRef.current = 'complete';

        logger.info('🏁 Filter state initialization complete', { sourceOfTruth });
        logger.info('✅ Batched filter state initialization updates applied');
        performanceLogger.end(perfId);
      });

      // Load saved settings in background after initial render
      loadSavedFiltersAsync();
    };

    const loadSavedFiltersAsync = async () => {
      try {
        // Don't restore from database if URL parameters were provided
        // URL parameters should take precedence over saved state
        const urlParams = new URLSearchParams(location.search);
        if (urlParams.toString().length > 0) {
          logger.info('🔗 Skipping database restoration - URL parameters take precedence');
          return;
        }

        const { pb } = await import('@/lib/pocketbase');
        const record = await pb
          .collection('user_dashboard_settings')
          .getFirstListItem(`user="${user.id}"`);

        if (record.navigation_context) {
          const savedContext = record.navigation_context as DashboardFilterContext;
          const savedTimestamp = savedContext.preservationContext?.timestamp ?? 0;
          const timeSinceLastVisit = Date.now() - savedTimestamp;
          const twentyFourHours = 24 * 60 * 60 * 1000;

          if (timeSinceLastVisit <= twentyFourHours) {
            const rawSavedFilters = {
              activeStatus: savedContext.filters?.status,
              selectedCompany: savedContext.filters?.company,
              selectedArtist: savedContext.filters?.artist,
              selectedDrillShape: savedContext.filters?.drillShape,
              selectedYearFinished: savedContext.filters?.yearFinished,
              includeMiniKits: savedContext.filters?.includeMiniKits,
              includeDestashed: savedContext.filters?.includeDestashed,
              includeArchived: savedContext.filters?.includeArchived,
              includeWishlist: savedContext.filters?.includeWishlist,
              includeOnHold: savedContext.filters?.includeOnHold,
              searchTerm: savedContext.filters?.searchTerm,
              selectedTags: savedContext.filters?.selectedTags,
              sortField: savedContext.sortField,
              sortDirection: savedContext.sortDirection,
              currentPage: savedContext.currentPage,
              pageSize: savedContext.pageSize,
            };
            const restoredFilters = validateAndSanitizeFilters(
              rawSavedFilters as Partial<FilterState>,
              isMobilePhone
            );

            // Only apply restored filters if they're different from current state
            const currentFiltersString = JSON.stringify(filtersRef.current);
            const restoredFiltersString = JSON.stringify(restoredFilters);

            if (currentFiltersString !== restoredFiltersString) {
              React.startTransition(() => {
                dispatch({ type: 'SET_INITIAL_STATE', payload: restoredFilters });
              });

              logger.info('✅ Restored filters from database (background) - filters updated');
            } else {
              logger.debug('Background filter restoration skipped - no changes detected');
            }
          }
        }
      } catch (error) {
        if ((error as { status?: number })?.status !== 404) {
          logger.warn('Background filter restoration failed:', error);
        }
        // Don't log 404s - this is normal for first-time users
      }
    };

    initializeFilters();
  }, [
    user?.id,
    isMetadataLoading, // Single dependency instead of individual loading states
    location.search,
    location.pathname,
    navigate,
    userMetadata.tags,
    isMobilePhone, // For device-aware view defaults
  ]);

  // Compute transformed options for backward compatibility
  const companiesOptions = useMemo(
    () =>
      (userMetadata?.companies || []).map(company => ({
        label: company.name,
        value: company.name, // Use name as value for DashboardFilters compatibility
      })),
    [userMetadata?.companies]
  );

  const artistsOptions = useMemo(
    () =>
      (userMetadata?.artists || []).map(artist => ({
        label: artist.name,
        value: artist.name, // Use name as value for DashboardFilters compatibility
      })),
    [userMetadata?.artists]
  );

  const drillShapesOptions = useMemo(
    () =>
      ['round', 'square'].map(shape => ({
        label: shape === 'round' ? 'Round' : 'Square',
        value: shape,
      })),
    []
  );

  // Memoize arrays to prevent unnecessary re-renders
  const stableCompanies = useMemo(() => userMetadata?.companies || [], [userMetadata?.companies]);
  const stableArtists = useMemo(() => userMetadata?.artists || [], [userMetadata?.artists]);
  const stableTags = useMemo(() => userMetadata?.tags || [], [userMetadata?.tags]);
  const stableDrillShapes = useMemo(() => ['round', 'square'], []);

  // Stable context value - memoized to prevent unnecessary re-renders
  const contextValue: FilterStateContextType = useMemo(
    () => ({
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,
      dispatch,

      // Raw metadata (ID-based for queries like AdvancedFilters)
      companies: stableCompanies,
      artists: stableArtists,
      tags: stableTags,
      drillShapes: stableDrillShapes,
      searchInputRef,

      // Computed options for backward compatibility (DashboardFilters)
      companiesOptions,
      artistsOptions,
      drillShapesOptions,
    }),
    [
      filters,
      debouncedSearchTerm,
      isInitialized,
      isSearchPending,
      isMetadataLoading,
      dispatch,
      stableCompanies,
      stableArtists,
      stableTags,
      stableDrillShapes,
      searchInputRef,
      companiesOptions,
      artistsOptions,
      drillShapesOptions,
    ]
  );

  return <FilterStateContext.Provider value={contextValue}>{children}</FilterStateContext.Provider>;
};

/**
 * Memoized FilterStateProvider with custom comparison
 */
export const FilterStateProvider = React.memo(
  FilterStateProviderComponent,
  (prevProps, nextProps) => {
    // Custom comparison function - only re-render if user.id changes
    return prevProps.user?.id === nextProps.user?.id;
  }
);