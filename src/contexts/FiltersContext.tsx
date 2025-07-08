/**
 * @fileoverview Dashboard Filters Context Provider
 * 
 * Comprehensive context for managing dashboard filter state, persistence, and URL integration.
 * Extracted from the monolithic DashboardFiltersContext to improve performance and maintainability.
 * 
 * This context handles all aspects of dashboard filtering including:
 * - Complex filter state management with useReducer
 * - Automatic database persistence with debounced auto-save
 * - URL parameter processing and navigation integration
 * - Change source tracking for debugging and optimization
 * - Filter validation and sanitization
 * - Performance optimization with memoization
 * 
 * Key Features:
 * - Comprehensive filter state management (status, company, artist, drill shape, etc.)
 * - Database persistence with automatic saving and loading
 * - URL parameter integration for deep linking
 * - Debounced auto-save to prevent excessive database writes
 * - Change source tracking for debugging and state management
 * - Performance monitoring with detailed logging
 * - Mobile-optimized network handling
 * - Type-safe filter operations with comprehensive validation
 * 
 * Performance Optimizations:
 * - Uses useReducer for complex state management
 * - Debounced auto-save with rate limiting
 * - Memoized computed values and callbacks
 * - Efficient re-render prevention
 * - Performance monitoring with metrics
 * 
 * @author serabi
 * @since 2025-07-08
 * @version 1.0.0
 * 
 * Dependencies:
 * - React for context and state management
 * - React Router for URL integration
 * - PocketBase for database persistence
 * - MetadataContext for available options
 * - Custom hooks for debouncing and navigation
 * 
 * @see {@link StatsContext} for statistics state management
 * @see {@link UIContext} for UI state management
 * @see {@link RecentlyEditedContext} for recently edited tracking
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useDebounce from '@/hooks/useDebounce';
import { useMetadata } from '@/contexts/MetadataContext';
import {
  useSaveNavigationContext,
  DashboardFilterContext,
} from '@/hooks/mutations/useSaveNavigationContext';
import { createLogger, performanceLogger } from '@/utils/secureLogger';
import { useToast } from '@/hooks/use-toast';
import { ProjectFilterStatus, Tag } from '@/types/project';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';

const logger = createLogger('FiltersContext');

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
 * 
 * Defines all possible filter states for the dashboard, including
 * server-side filters, sorting, pagination, and view preferences.
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
 * Context interface for dashboard filters management
 * 
 * Provides comprehensive filter state management with persistence,
 * URL integration, and performance optimization.
 */
export interface FiltersContextType {
  // Current filter state
  filters: FilterState;
  debouncedSearchTerm: string;

  // Filter actions
  updateStatus: (status: ProjectFilterStatus, source?: ChangeSource) => void;
  updateCompany: (company: string | null, source?: ChangeSource) => void;
  updateArtist: (artist: string | null, source?: ChangeSource) => void;
  updateDrillShape: (shape: string | null, source?: ChangeSource) => void;
  updateYearFinished: (year: string | null, source?: ChangeSource) => void;
  updateIncludeMiniKits: (include: boolean, source?: ChangeSource) => void;
  updateIncludeDestashed: (include: boolean, source?: ChangeSource) => void;
  updateIncludeArchived: (include: boolean, source?: ChangeSource) => void;
  updateSearchTerm: (term: string, source?: ChangeSource) => void;
  updateTags: (tags: string[], source?: ChangeSource) => void;
  toggleTag: (tagId: string, source?: ChangeSource) => void;
  clearAllTags: (source?: ChangeSource) => void;
  updateSort: (
    field: DashboardValidSortField,
    direction: SortDirectionType,
    source?: ChangeSource
  ) => void;
  updatePage: (page: number, source?: ChangeSource) => void;
  updatePageSize: (size: number, source?: ChangeSource) => void;
  updateViewType: (type: ViewType, source?: ChangeSource) => void;
  resetAllFilters: (source?: ChangeSource) => void;
  batchUpdateFilters: (updates: Partial<FilterState>, source?: ChangeSource) => void;

  // Computed values
  getActiveFilterCount: () => number;

  // Available options
  companies: { label: string; value: string }[];
  artists: { label: string; value: string }[];
  drillShapes: string[];
  allTags: Tag[];

  // UI state
  searchInputRef: React.RefObject<HTMLInputElement>;
  isSearchPending: boolean;
  isMetadataLoading: boolean;
  isInitialized: boolean;
}

const FiltersContext = createContext<FiltersContextType | null>(null);

/**
 * Default filter state factory
 * 
 * Provides consistent default values for all filter properties.
 */
const getDefaultFilters = (): FilterState => ({
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
 * 
 * Ensures all filter properties have valid values, falling back to
 * defaults for any invalid or missing properties.
 */
const validateAndSanitizeFilters = (filters: Partial<FilterState>): FilterState => {
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
type FilterAction =
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
 * 
 * Handles all filter state transitions with performance monitoring
 * and consistent state updates.
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
 * Props interface for FiltersProvider component
 */
interface FiltersProviderProps {
  children: ReactNode;
  user: { id: string; email?: string } | null;
}

/**
 * FiltersProvider component that provides comprehensive filter management
 * 
 * Manages all aspects of dashboard filtering including state, persistence,
 * URL integration, and performance optimization.
 */
export const FiltersProvider: React.FC<FiltersProviderProps> = ({ children, user }) => {
  const userMetadata = useMetadata();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const saveNavigationContext = useSaveNavigationContext();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter state management
  const [filters, dispatch] = useReducer(filtersReducer, getDefaultFilters());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);

  // State tracking for performance and debugging
  const initializationStateRef = useRef<'pending' | 'initializing' | 'complete'>('pending');
  const changeSourceRef = useRef<ChangeSource>('initialization');
  const lastSaveTimeRef = useRef(0);
  const lastSavedFiltersRef = useRef<FilterState | null>(null);

  // Performance monitoring
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());

  // Monitor for potential infinite loops
  useEffect(() => {
    renderCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;

    if (timeSinceLastRender > 5000) {
      renderCountRef.current = 1;
    }

    if (renderCountRef.current > 50) {
      logger.error('🚨 Infinite loop detected in FiltersContext', {
        renderCount: renderCountRef.current,
        timeWindow: timeSinceLastRender,
        isInitialized,
        userId: user?.id,
      });
      renderCountRef.current = 0;
    }

    lastRenderTimeRef.current = now;
  });

  // Debounced values for performance
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);
  const debouncedFilters = useDebounce(filters, 1000);
  const isSearchPending = filters.searchTerm !== debouncedSearchTerm;

  // State ref for avoiding stale closures
  const latestStateRef = useRef({
    filters,
    user,
    isInitialized,
    saveNavigationContext: saveNavigationContext.mutate,
  });
  latestStateRef.current = {
    filters,
    user,
    isInitialized,
    saveNavigationContext: saveNavigationContext.mutate,
  };

  /**
   * Auto-save filter changes to database
   * 
   * Implements debounced saving with rate limiting and content-based
   * deduplication to prevent unnecessary database writes.
   */
  useEffect(() => {
    const perfId = performanceLogger.start('autoSaveEffect');

    if (!isInitialized || !user?.id || !isAutoSaveEnabled) {
      logger.debug('💾 Auto-save skipped', {
        isInitialized,
        hasUser: !!user?.id,
        isAutoSaveEnabled,
      });
      performanceLogger.end(perfId, { skipped: true, reason: 'not_ready' });
      return;
    }

    const source = changeSourceRef.current;
    if (source !== 'user' && source !== 'batch') {
      logger.debug(`💾 Auto-save skipped - change source is "${source}"`);
      performanceLogger.end(perfId, { skipped: true, reason: 'invalid_source', source });
      return;
    }

    const now = Date.now();
    if (now - lastSaveTimeRef.current < 1000) {
      logger.debug('💾 Auto-save skipped - too soon since last save');
      performanceLogger.end(perfId, { skipped: true, reason: 'rate_limited' });
      return;
    }

    if (lastSavedFiltersRef.current) {
      const hasContentChanged =
        JSON.stringify(debouncedFilters) !== JSON.stringify(lastSavedFiltersRef.current);
      if (!hasContentChanged) {
        logger.debug('💾 Auto-save skipped - filter content unchanged');
        changeSourceRef.current = 'system';
        performanceLogger.end(perfId, { skipped: true, reason: 'no_content_change' });
        return;
      }
    }

    const saveFilters = async () => {
      const savePerfId = performanceLogger.start('saveNavigationContext.mutate');
      logger.info('💾 Auto-saving filter changes...', { source });

      const navigationContext: DashboardFilterContext = {
        filters: {
          status: debouncedFilters.activeStatus,
          company: debouncedFilters.selectedCompany,
          artist: debouncedFilters.selectedArtist,
          drillShape: debouncedFilters.selectedDrillShape,
          yearFinished: debouncedFilters.selectedYearFinished,
          includeMiniKits: debouncedFilters.includeMiniKits,
          includeDestashed: debouncedFilters.includeDestashed,
          includeArchived: debouncedFilters.includeArchived,
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
      };

      saveNavigationContext.mutate(
        {
          userId: user.id,
          navigationContext,
        },
        {
          onSuccess: () => {
            logger.info('✅ Filter changes auto-saved successfully');
            lastSavedFiltersRef.current = { ...debouncedFilters };
            changeSourceRef.current = 'system';
            lastSaveTimeRef.current = Date.now();
            performanceLogger.end(savePerfId);
          },
          onError: error => {
            logger.error('❌ Failed to auto-save filter changes:', error);
            changeSourceRef.current = 'system';
            performanceLogger.end(savePerfId, { error: true });
          },
        }
      );
    };

    saveFilters();
    performanceLogger.end(perfId);
  }, [debouncedFilters, isInitialized, user?.id, saveNavigationContext.mutate, isAutoSaveEnabled]);

  /**
   * Save filters to database on navigation
   * 
   * Ensures filter state is persisted when navigating away from dashboard.
   */
  const saveFiltersToDatabase = useCallback(() => {
    const {
      filters: currentFilters,
      user: currentUser,
      isInitialized: currentInitialized,
      saveNavigationContext: currentSaveNavigationContext,
    } = latestStateRef.current;

    if (!currentInitialized || !currentUser?.id) {
      logger.debug('Skipping save - not initialized or no user');
      return;
    }

    if (
      !currentFilters.activeStatus ||
      !currentFilters.sortField ||
      !currentFilters.sortDirection
    ) {
      logger.warn('Skipping database save due to incomplete filter state');
      return;
    }

    const navigationContext: DashboardFilterContext = {
      filters: {
        status: currentFilters.activeStatus,
        company: currentFilters.selectedCompany,
        artist: currentFilters.selectedArtist,
        drillShape: currentFilters.selectedDrillShape,
        yearFinished: currentFilters.selectedYearFinished,
        includeMiniKits: currentFilters.includeMiniKits,
        includeDestashed: currentFilters.includeDestashed,
        includeArchived: currentFilters.includeArchived,
        searchTerm: currentFilters.searchTerm,
        selectedTags: currentFilters.selectedTags,
      },
      sortField: currentFilters.sortField,
      sortDirection: currentFilters.sortDirection,
      currentPage: currentFilters.currentPage,
      pageSize: currentFilters.pageSize,
      preservationContext: {
        scrollPosition: window.scrollY || 0,
        timestamp: Date.now(),
      },
    };

    currentSaveNavigationContext(
      {
        userId: currentUser.id,
        navigationContext,
      },
      {
        onSuccess: () => {
          logger.info('✅ Saved current filter state on navigation');
        },
        onError: error => {
          logger.error('Failed to save dashboard filters on navigation:', error);
          toast({
            title: 'Save Issue',
            description: 'Dashboard preferences may not be saved.',
            variant: 'destructive',
            duration: 3000,
          });
        },
      }
    );
  }, [toast]);

  // Save filters when navigating away from dashboard
  useEffect(() => {
    const currentPath = location.pathname;

    return () => {
      if (currentPath === '/dashboard' && isInitialized) {
        saveFiltersToDatabase();
      }
    };
  }, [location.pathname, saveFiltersToDatabase, isInitialized]);

  /**
   * Initialize filters from database and URL parameters
   * 
   * Loads saved filter state from database and applies URL parameters
   * with proper validation and fallback handling.
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
      logger.info('🚀 Initializing dashboard filters...');

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

      logger.info('🏁 Filter initialization complete', { sourceOfTruth });
      dispatch({ type: 'SET_INITIAL_STATE', payload: initialFilters });
      changeSourceRef.current = 'initialization';
      setIsInitialized(true);
      initializationStateRef.current = 'complete';

      setTimeout(() => {
        setIsAutoSaveEnabled(true);
        logger.info('✅ Auto-save mechanism enabled');
      }, 1500);

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

  /**
   * Enhanced dispatch wrapper with source tracking and logging
   */
  const dispatchWithSource = useCallback(
    (action: FilterAction, source: ChangeSource = 'user') => {
      const prevState = latestStateRef.current.filters;
      changeSourceRef.current = source;

      logger.debug(`🚀 Dispatching filter action: ${action.type}`, { source });

      const perfId = performanceLogger.start(`dispatch:${action.type}`);
      dispatch(action);
      performanceLogger.end(perfId);

      setTimeout(() => {
        const nextState = latestStateRef.current.filters;
        const changedKeys = Object.keys(nextState).filter(
          key => nextState[key as keyof FilterState] !== prevState[key as keyof FilterState]
        );
        if (changedKeys.length > 0) {
          logger.info(`🔄 Filter state updated via ${action.type}`, { source, changedKeys });
        }
      }, 0);
    },
    [dispatch]
  );

  // Filter update functions
  const updateStatus = useCallback(
    (status: ProjectFilterStatus, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_STATUS', payload: status }, source);
    },
    [dispatchWithSource]
  );

  const updateCompany = useCallback(
    (company: string | null, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_COMPANY', payload: company }, source);
    },
    [dispatchWithSource]
  );

  const updateArtist = useCallback(
    (artist: string | null, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_ARTIST', payload: artist }, source);
    },
    [dispatchWithSource]
  );

  const updateDrillShape = useCallback(
    (shape: string | null, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_DRILL_SHAPE', payload: shape }, source);
    },
    [dispatchWithSource]
  );

  const updateYearFinished = useCallback(
    (year: string | null, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_YEAR_FINISHED', payload: year }, source);
    },
    [dispatchWithSource]
  );

  const updateIncludeMiniKits = useCallback(
    (include: boolean, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_INCLUDE_MINI_KITS', payload: include }, source);
    },
    [dispatchWithSource]
  );

  const updateIncludeDestashed = useCallback(
    (include: boolean, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_INCLUDE_DESTASHED', payload: include }, source);
    },
    [dispatchWithSource]
  );

  const updateIncludeArchived = useCallback(
    (include: boolean, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_INCLUDE_ARCHIVED', payload: include }, source);
    },
    [dispatchWithSource]
  );

  const updateSearchTerm = useCallback(
    (term: string, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_SEARCH_TERM', payload: term }, source);
    },
    [dispatchWithSource]
  );

  const updateTags = useCallback(
    (tags: string[], source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_TAGS', payload: tags }, source);
    },
    [dispatchWithSource]
  );

  const toggleTag = useCallback(
    (tagId: string, source?: ChangeSource) => {
      dispatchWithSource({ type: 'TOGGLE_TAG', payload: tagId }, source);
    },
    [dispatchWithSource]
  );

  const clearAllTags = useCallback(
    (source?: ChangeSource) => {
      dispatchWithSource({ type: 'CLEAR_ALL_TAGS' }, source);
    },
    [dispatchWithSource]
  );

  const updateSort = useCallback(
    (field: DashboardValidSortField, direction: SortDirectionType, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_SORT', payload: { field, direction } }, source);
    },
    [dispatchWithSource]
  );

  const updatePage = useCallback(
    (page: number, source: ChangeSource = 'system') => {
      dispatchWithSource({ type: 'SET_PAGE', payload: page }, source);
    },
    [dispatchWithSource]
  );

  const updatePageSize = useCallback(
    (size: number, source?: ChangeSource) => {
      dispatchWithSource({ type: 'SET_PAGE_SIZE', payload: size }, source);
    },
    [dispatchWithSource]
  );

  const updateViewType = useCallback(
    (type: ViewType, source: ChangeSource = 'system') => {
      dispatchWithSource({ type: 'SET_VIEW_TYPE', payload: type }, source);
    },
    [dispatchWithSource]
  );

  const resetAllFilters = useCallback(
    (source?: ChangeSource) => {
      dispatchWithSource({ type: 'RESET_FILTERS' }, source);
      if (searchInputRef.current) {
        searchInputRef.current.value = '';
      }
    },
    [dispatchWithSource]
  );

  const batchUpdateFilters = useCallback(
    (updates: Partial<FilterState>, source: ChangeSource = 'batch') => {
      dispatchWithSource({ type: 'BATCH_UPDATE_FILTERS', payload: updates }, source);
    },
    [dispatchWithSource]
  );

  // Computed values
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.activeStatus !== 'all') count++;
    if (filters.selectedCompany !== 'all') count++;
    if (filters.selectedArtist !== 'all') count++;
    if (filters.selectedDrillShape !== 'all') count++;
    if (filters.selectedYearFinished !== 'all') count++;
    if (!filters.includeMiniKits) count++;
    if (!filters.includeDestashed) count++;
    if (filters.searchTerm) count++;
    if (filters.selectedTags.length > 0) count++;
    return count;
  }, [filters]);

  // Available options
  const companies = useMemo(
    () =>
      userMetadata?.companies?.map(company => ({
        label: company.name,
        value: company.id,
      })) || [],
    [userMetadata?.companies]
  );

  const artists = useMemo(
    () =>
      userMetadata?.artists?.map(artist => ({
        label: artist.name,
        value: artist.id,
      })) || [],
    [userMetadata?.artists]
  );

  const allTags = useMemo(() => userMetadata?.tags || [], [userMetadata?.tags]);

  const drillShapes = useMemo(() => ['round', 'square'], []);

  const isMetadataLoading = useMemo(
    () =>
      Boolean(
        userMetadata?.isLoading?.companies ||
          userMetadata?.isLoading?.artists ||
          userMetadata?.isLoading?.tags
      ),
    [userMetadata?.isLoading]
  );

  // Memoized context value
  const contextValue: FiltersContextType = useMemo(
    () => ({
      filters,
      debouncedSearchTerm,
      updateStatus,
      updateCompany,
      updateArtist,
      updateDrillShape,
      updateYearFinished,
      updateIncludeMiniKits,
      updateIncludeDestashed,
      updateIncludeArchived,
      updateSearchTerm,
      updateTags,
      toggleTag,
      clearAllTags,
      updateSort,
      updatePage,
      updatePageSize,
      updateViewType,
      resetAllFilters,
      batchUpdateFilters,
      getActiveFilterCount,
      companies,
      artists,
      drillShapes,
      allTags,
      searchInputRef,
      isSearchPending,
      isMetadataLoading,
      isInitialized,
    }),
    [
      filters,
      debouncedSearchTerm,
      updateStatus,
      updateCompany,
      updateArtist,
      updateDrillShape,
      updateYearFinished,
      updateIncludeMiniKits,
      updateIncludeDestashed,
      updateIncludeArchived,
      updateSearchTerm,
      updateTags,
      toggleTag,
      clearAllTags,
      updateSort,
      updatePage,
      updatePageSize,
      updateViewType,
      resetAllFilters,
      batchUpdateFilters,
      getActiveFilterCount,
      companies,
      artists,
      drillShapes,
      allTags,
      searchInputRef,
      isSearchPending,
      isMetadataLoading,
      isInitialized,
    ]
  );

  return (
    <FiltersContext.Provider value={contextValue}>
      {children}
    </FiltersContext.Provider>
  );
};

/**
 * Hook to use the FiltersContext
 * 
 * Provides access to filter state and management functions.
 * Must be used within a FiltersProvider component.
 * 
 * @returns FiltersContextType with filter state and functions
 * @throws Error if used outside of FiltersProvider
 */
export const useFilters = (): FiltersContextType => {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
};

/**
 * Default export for the FiltersContext
 * @deprecated Use named exports instead
 */
export default FiltersContext;