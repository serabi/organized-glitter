/**
 * Filter Actions Context - Stable action functions for dashboard filters
 * Provides memoized filter action handlers and auto-save functionality
 * Fixed infinite loop issue by stabilizing mutation dependencies
 * @author @serabi
 * @created 2025-07-09
 * @updated 2025-07-10
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { createLogger, performanceLogger } from '@/utils/secureLogger';
import { ProjectFilterStatus } from '@/types/project';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import {
  FilterState,
  FilterAction,
  FilterDispatch,
  SortDirectionType,
  ViewType,
  ChangeSource,
  useFilterState,
} from '@/contexts/FilterStateContext';
import {
  useSaveNavigationContext,
  DashboardFilterContext,
} from '@/hooks/mutations/useSaveNavigationContext';

const logger = createLogger('FilterActionsContext');

/**
 * Context interface for filter actions management
 */
export interface FilterActionsContextType {
  // Filter update actions
  updateStatus: (status: ProjectFilterStatus, source?: ChangeSource) => void;
  updateCompany: (company: string | null, source?: ChangeSource) => void;
  updateArtist: (artist: string | null, source?: ChangeSource) => void;
  updateDrillShape: (shape: string | null, source?: ChangeSource) => void;
  updateYearFinished: (year: string | null, source?: ChangeSource) => void;
  updateIncludeMiniKits: (include: boolean, source?: ChangeSource) => void;
  updateIncludeDestashed: (include: boolean, source?: ChangeSource) => void;
  updateIncludeArchived: (include: boolean, source?: ChangeSource) => void;
  updateIncludeWishlist: (include: boolean, source?: ChangeSource) => void;
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
}

const FilterActionsContext = createContext<FilterActionsContextType | null>(null);

/**
 * Props interface for FilterActionsProvider component
 */
interface FilterActionsProviderProps {
  children: ReactNode;
  user: { id: string; email?: string } | null;
}

/**
 * FilterActionsProvider component that provides stable filter actions
 * Memoized to prevent unnecessary re-renders when user prop doesn't change
 */
export const FilterActionsProvider: React.FC<FilterActionsProviderProps> = React.memo(
  ({ children, user }) => {
    const saveNavigationContextMutation = useSaveNavigationContext();
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Access filter state and dispatch for computed values and auto-save
    const { filters, isInitialized, dispatch } = useFilterState();

    // State tracking for performance and debugging
    const changeSourceRef = useRef<ChangeSource>('initialization');
    const lastSaveTimeRef = useRef(0);
    const lastSavedFiltersRef = useRef<FilterState | null>(null);
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = React.useState(false);

    // State ref for avoiding stale closures
    const latestStateRef = useRef({
      filters,
      user,
      isInitialized,
      saveNavigationContext: saveNavigationContextMutation.mutate,
    });
    latestStateRef.current = {
      filters,
      user,
      isInitialized,
      saveNavigationContext: saveNavigationContextMutation.mutate,
    };

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

    // Stable filter update functions - these will not change across re-renders
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

    const updateIncludeWishlist = useCallback(
      (include: boolean, source?: ChangeSource) => {
        dispatchWithSource({ type: 'SET_INCLUDE_WISHLIST', payload: include }, source);
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
      if (filters.includeWishlist) count++;
      if (filters.searchTerm) count++;
      if (filters.selectedTags.length > 0) count++;
      return count;
    }, [filters]);

    /**
     * Auto-save filter changes to database
     */
    React.useEffect(() => {
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
          JSON.stringify(filters) !== JSON.stringify(lastSavedFiltersRef.current);
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
            status: filters.activeStatus,
            company: filters.selectedCompany,
            artist: filters.selectedArtist,
            drillShape: filters.selectedDrillShape,
            yearFinished: filters.selectedYearFinished,
            includeMiniKits: filters.includeMiniKits,
            includeDestashed: filters.includeDestashed,
            includeArchived: filters.includeArchived,
            includeWishlist: filters.includeWishlist,
            searchTerm: filters.searchTerm,
            selectedTags: filters.selectedTags,
          },
          sortField: filters.sortField,
          sortDirection: filters.sortDirection,
          currentPage: filters.currentPage,
          pageSize: filters.pageSize,
          preservationContext: {
            scrollPosition: window.scrollY || 0,
            timestamp: Date.now(),
          },
        };

        // Use latestStateRef to avoid stale closures and dependency issues
        latestStateRef.current.saveNavigationContext(
          {
            userId: user.id,
            navigationContext,
          },
          {
            onSuccess: () => {
              logger.info('✅ Filter changes auto-saved successfully');
              lastSavedFiltersRef.current = { ...filters };
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
    }, [filters, isInitialized, user?.id, isAutoSaveEnabled]);

    // Enable auto-save after initialization
    React.useEffect(() => {
      if (isInitialized) {
        const timer = setTimeout(() => {
          setIsAutoSaveEnabled(true);
          logger.info('✅ Auto-save mechanism enabled');
        }, 1500);

        return () => clearTimeout(timer);
      }
    }, [isInitialized]);

    // Stable context value - all functions are memoized and stable
    const contextValue: FilterActionsContextType = useMemo(
      () => ({
        updateStatus,
        updateCompany,
        updateArtist,
        updateDrillShape,
        updateYearFinished,
        updateIncludeMiniKits,
        updateIncludeDestashed,
        updateIncludeArchived,
        updateIncludeWishlist,
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
      }),
      [
        updateStatus,
        updateCompany,
        updateArtist,
        updateDrillShape,
        updateYearFinished,
        updateIncludeMiniKits,
        updateIncludeDestashed,
        updateIncludeArchived,
        updateIncludeWishlist,
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
      ]
    );

    return (
      <FilterActionsContext.Provider value={contextValue}>{children}</FilterActionsContext.Provider>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function - only re-render if user.id changes
    return prevProps.user?.id === nextProps.user?.id;
  }
);

/**
 * Hook to use the FilterActionsContext
 */
export const useFilterActions = (): FilterActionsContextType => {
  const context = useContext(FilterActionsContext);
  if (!context) {
    throw new Error('useFilterActions must be used within a FilterActionsProvider');
  }
  return context;
};
