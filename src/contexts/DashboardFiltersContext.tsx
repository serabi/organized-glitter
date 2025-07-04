/**
 * @fileoverview Minimal Dashboard Filters Context - Clean, Simple, TypeSafe
 * 
 * This context provides a clean, minimal implementation of dashboard filtering
 * with database persistence, URL parameter support, and pagination.
 * 
 * Key Features:
 * - Simple useState-based state management
 * - Debounced database saves (300ms)
 * - URL parameter support for navigation
 * - Server-side filtering and pagination
 * - Clean separation of concerns
 * - Stable references to prevent infinite loops
 * 
 * @author serabi
 * @since 2025-07-03
 * @version 1.0.0 - Minimal clean implementation
 */

import React, {
  createContext,
  useContext,
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
import { useProjects, ServerFilters } from '@/hooks/queries/useProjects';
import { useDashboardStats } from '@/hooks/queries/useDashboardStats';
import { useAvailableYearsOptimized } from '@/hooks/queries/useDashboardStats';
import { useSaveNavigationContext, DashboardFilterContext } from '@/hooks/mutations/useSaveNavigationContext';
import { createLogger } from '@/utils/secureLogger';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectFilterStatus, Tag } from '@/types/project';
import { useRealtimeProjectSync } from '@/hooks/useRealtimeProjectSync';
import {
  DashboardValidSortField,
  DATE_SORT_FIELDS,
  SORT_FIELD_TO_PROJECT_KEY,
  SORT_FIELD_TO_FRIENDLY_NAME,
} from '@/features/dashboard/dashboard.constants';

const logger = createLogger('DashboardFilters');

// Recently Edited Context (moved from Dashboard.tsx for proper context stability)
interface RecentlyEditedContextValue {
  recentlyEditedProjectId: string | null;
  setRecentlyEditedProjectId: (id: string | null) => void;
}

const RecentlyEditedContext = createContext<RecentlyEditedContextValue | undefined>(undefined);

export const useRecentlyEdited = () => {
  const context = useContext(RecentlyEditedContext);
  if (context === undefined) {
    throw new Error('useRecentlyEdited must be used within a DashboardFiltersProvider');
  }
  return context;
};

// Types
export type SortDirectionType = 'asc' | 'desc';
export type ViewType = 'grid' | 'list';

export interface FilterState {
  // Server-side filters
  activeStatus: ProjectFilterStatus;
  selectedCompany: string;
  selectedArtist: string;
  selectedDrillShape: string;
  selectedYearFinished: string;
  includeMiniKits: boolean;
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

export interface CountsForTabsType {
  all: number;
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  completed: number;
  destashed: number;
  archived: number;
}

export interface DynamicSeparatorPropsType {
  isCurrentSortDateBased: boolean;
  currentSortDateFriendlyName?: string;
  currentSortDatePropertyKey?: keyof Project;
  countOfItemsWithoutCurrentSortDate: number;
}

export interface DashboardFiltersContextValue {
  // Current filter state
  filters: FilterState;
  
  // Projects data
  projects: Project[];
  isLoadingProjects: boolean;
  errorProjects: Error | null;
  totalItems: number;
  totalPages: number;
  refetchProjects: () => Promise<void>;
  
  // Filter actions
  updateStatus: (status: ProjectFilterStatus) => void;
  updateCompany: (company: string | null) => void;
  updateArtist: (artist: string | null) => void;
  updateDrillShape: (shape: string | null) => void;
  updateYearFinished: (year: string | null) => void;
  updateIncludeMiniKits: (include: boolean) => void;
  updateSearchTerm: (term: string) => void;
  updateTags: (tags: string[]) => void;
  toggleTag: (tagId: string) => void;
  clearAllTags: () => void;
  updateSort: (field: DashboardValidSortField, direction: SortDirectionType) => void;
  updatePage: (page: number) => void;
  updatePageSize: (size: number) => void;
  updateViewType: (type: ViewType) => void;
  resetAllFilters: () => void;
  
  // Computed values
  getActiveFilterCount: () => number;
  getCountsForTabs: () => CountsForTabsType;
  dynamicSeparatorProps: DynamicSeparatorPropsType;
  
  // Available options
  companies: { label: string; value: string }[];
  artists: { label: string; value: string }[];
  drillShapes: string[];
  allTags: Tag[];
  yearFinishedOptions: string[];
  
  // UI state
  searchInputRef: React.RefObject<HTMLInputElement>;
  isSearchPending: boolean;
  isMetadataLoading: boolean;
}

const DashboardFiltersContext = createContext<DashboardFiltersContextValue | undefined>(undefined);

// Default filter state
const getDefaultFilters = (): FilterState => ({
  activeStatus: 'all',
  selectedCompany: 'all',
  selectedArtist: 'all',
  selectedDrillShape: 'all',
  selectedYearFinished: 'all',
  includeMiniKits: true,
  searchTerm: '',
  selectedTags: [],
  sortField: 'last_updated',
  sortDirection: 'desc',
  currentPage: 1,
  pageSize: 25,
  viewType: 'grid',
});

// Validate and sanitize filter state
const validateAndSanitizeFilters = (filters: Partial<FilterState>): FilterState => {
  const defaults = getDefaultFilters();
  
  return {
    activeStatus: filters.activeStatus || defaults.activeStatus,
    selectedCompany: filters.selectedCompany ?? defaults.selectedCompany,
    selectedArtist: filters.selectedArtist ?? defaults.selectedArtist,
    selectedDrillShape: filters.selectedDrillShape ?? defaults.selectedDrillShape,
    selectedYearFinished: filters.selectedYearFinished ?? defaults.selectedYearFinished,
    includeMiniKits: filters.includeMiniKits ?? defaults.includeMiniKits,
    searchTerm: filters.searchTerm ?? defaults.searchTerm,
    selectedTags: Array.isArray(filters.selectedTags) ? filters.selectedTags : defaults.selectedTags,
    sortField: filters.sortField || defaults.sortField,
    sortDirection: filters.sortDirection || defaults.sortDirection,
    currentPage: filters.currentPage || defaults.currentPage,
    pageSize: filters.pageSize || defaults.pageSize,
    viewType: filters.viewType || defaults.viewType,
  };
};

interface DashboardFiltersProviderProps {
  children: ReactNode;
  user: { id: string; email?: string } | null;
}

export const DashboardFiltersProvider: React.FC<DashboardFiltersProviderProps> = ({
  children,
  user,
}) => {
  const userMetadata = useMetadata();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const saveNavigationContext = useSaveNavigationContext();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Enable real-time project synchronization
  const { isConnected: isRealtimeConnected } = useRealtimeProjectSync();
  
  // Recently edited project state (moved from Dashboard for context stability)
  const [recentlyEditedProjectId, setRecentlyEditedProjectId] = useState<string | null>(null);
  
  // Filter state - always start with valid defaults
  const [filters, setFilters] = useState<FilterState>(() => {
    try {
      return getDefaultFilters();
    } catch (error) {
      logger.error('Error initializing default filters:', error);
      // Return minimal safe state
      return {
        activeStatus: 'all',
        selectedCompany: 'all',
        selectedArtist: 'all',
        selectedDrillShape: 'all',
        selectedYearFinished: 'all',
        includeMiniKits: true,
        searchTerm: '',
        selectedTags: [],
        sortField: 'last_updated',
        sortDirection: 'desc',
        currentPage: 1,
        pageSize: 25,
        viewType: 'grid',
      } as FilterState;
    }
  });
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Debounced search for better UX
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);
  const isSearchPending = filters.searchTerm !== debouncedSearchTerm;
  
  // Server filters for useProjects
  const serverFilters = useMemo((): ServerFilters => ({
    status: filters.activeStatus,
    company: filters.selectedCompany,
    artist: filters.selectedArtist,
    drillShape: filters.selectedDrillShape,
    yearFinished: filters.selectedYearFinished,
    includeMiniKits: filters.includeMiniKits,
    searchTerm: debouncedSearchTerm,
    selectedTags: filters.selectedTags,
  }), [
    filters.activeStatus,
    filters.selectedCompany,
    filters.selectedArtist,
    filters.selectedDrillShape,
    filters.selectedYearFinished,
    filters.includeMiniKits,
    debouncedSearchTerm,
    filters.selectedTags,
  ]);
  
  // Projects query
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: queryError,
    refetch: refetchProjects,
  } = useProjects({
    userId: user?.id,
    filters: serverFilters,
    sortField: filters.sortField,
    sortDirection: filters.sortDirection,
    currentPage: filters.currentPage,
    pageSize: filters.pageSize,
  });
  
  // Dashboard stats
  const { stats: dashboardStats } = useDashboardStats();
  
  // Available options - get years from dashboard stats to eliminate redundant query
  const { years: yearFinishedOptionsNumbers } = useAvailableYearsOptimized(user?.id);
  const yearFinishedOptions = yearFinishedOptionsNumbers.map(year => year.toString());
  
  // Extract projects data - rely entirely on server-side filtering
  const projects = useMemo(() => {
    const raw = projectsData?.projects || [];
    logger.debug('📊 Projects loaded from server:', { 
      count: raw.length, 
      activeStatus: filters.activeStatus,
      serverFiltered: true,
      realtimeConnected: isRealtimeConnected,
    });
    return raw;
  }, [projectsData?.projects, filters.activeStatus, isRealtimeConnected]);
  const totalItems = projects.length;
  const totalPages = projectsData?.totalPages || 0;
  const errorProjects = queryError ? (queryError as Error) : null;
  
  // Wrap refetch
  const refetchProjectsAsync = useCallback(async () => {
    await refetchProjects();
  }, [refetchProjects]);
  
  // Use ref to store latest state for save-on-navigation to avoid stale closures
  const latestStateRef = useRef({ filters, user, isInitialized, saveNavigationContext });
  latestStateRef.current = { filters, user, isInitialized, saveNavigationContext };
  
  // Save filters on navigation away from dashboard
  const saveFiltersToDatabase = useCallback(() => {
    const { filters: currentFilters, user: currentUser, isInitialized: currentInitialized, saveNavigationContext: currentSaveNavigationContext } = latestStateRef.current;
    
    if (!currentInitialized || !currentUser?.id) {
      logger.debug('Skipping save - not initialized or no user', { currentInitialized, hasUser: !!currentUser?.id });
      return;
    }
    
    // Defensive check to ensure valid filter state
    if (!currentFilters.activeStatus || !currentFilters.sortField || !currentFilters.sortDirection) {
      logger.warn('Skipping database save due to incomplete filter state', { filters: currentFilters });
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
    
    currentSaveNavigationContext.mutate(
      {
        userId: currentUser.id,
        navigationContext,
      },
      {
        onSuccess: () => {
          logger.info('✅ Saved current filter state on navigation', { 
            userId: currentUser.id, 
            activeStatus: currentFilters.activeStatus,
            searchTerm: currentFilters.searchTerm,
            selectedCompany: currentFilters.selectedCompany
          });
        },
        onError: (error) => {
          logger.error('Failed to save dashboard filters on navigation:', error);
          // Show subtle toast notification for user awareness
          toast({
            title: 'Save Issue',
            description: 'Dashboard preferences may not be saved.',
            variant: 'destructive',
            duration: 3000,
          });
        }
      }
    );
  }, []); // Empty dependency array is safe now since we use ref

  // Save filters when navigating away from dashboard
  useEffect(() => {
    const currentPath = location.pathname;
    
    return () => {
      // Only save if we're currently on dashboard and navigating away
      if (currentPath === '/dashboard' && isInitialized) {
        saveFiltersToDatabase();
      }
    };
  }, [location.pathname, saveFiltersToDatabase, isInitialized]);
  
  // Initialize from database
  useEffect(() => {
    if (!user?.id || isInitialized || userMetadata.isLoading.tags || userMetadata.isLoading.companies || userMetadata.isLoading.artists) {
      return;
    }
    
    const initializeFromDatabase = async () => {
      try {
        const { pb } = await import('@/lib/pocketbase');
        const record = await pb.collection('user_dashboard_settings')
          .getFirstListItem(`user="${user.id}"`);
        
        if (record.navigation_context) {
          const savedContext = record.navigation_context as any;
          const rawSavedFilters = {
            activeStatus: savedContext.filters?.status,
            selectedCompany: savedContext.filters?.company,
            selectedArtist: savedContext.filters?.artist,
            selectedDrillShape: savedContext.filters?.drillShape,
            selectedYearFinished: savedContext.filters?.yearFinished,
            includeMiniKits: savedContext.filters?.includeMiniKits,
            searchTerm: savedContext.filters?.searchTerm,
            selectedTags: savedContext.filters?.selectedTags,
            sortField: savedContext.sortField,
            sortDirection: savedContext.sortDirection,
            currentPage: savedContext.currentPage,
            pageSize: savedContext.pageSize,
            viewType: 'grid', // Always default to grid
          };
          
          // Validate and sanitize the loaded state
          const validatedFilters = validateAndSanitizeFilters(rawSavedFilters);
          setFilters(validatedFilters);
          logger.info('Restored and validated filters from database', { userId: user.id, validatedFilters });
        }
      } catch (error) {
        if (error?.status !== 404) {
          logger.error('Error loading saved filters:', error);
        }
      }
      
      setIsInitialized(true);
    };
    
    initializeFromDatabase();
  }, [user?.id, userMetadata.isLoading.tags, userMetadata.isLoading.companies, userMetadata.isLoading.artists]);
  
  // Handle URL parameters
  useEffect(() => {
    if (!isInitialized) return;
    
    const urlParams = new URLSearchParams(location.search);
    const hasUrlParams = urlParams.toString().length > 0;
    
    if (hasUrlParams) {
      logger.info('Processing URL parameters', { search: location.search });
      
      const newFilters = { ...getDefaultFilters() };
      let hasChanges = false;
      
      // Status filter
      const urlStatus = urlParams.get('status');
      if (urlStatus && ['wishlist', 'purchased', 'stash', 'progress', 'completed', 'destashed', 'archived'].includes(urlStatus)) {
        newFilters.activeStatus = urlStatus as ProjectFilterStatus;
        hasChanges = true;
      }
      
      // Company filter
      const urlCompany = urlParams.get('company');
      if (urlCompany) {
        newFilters.selectedCompany = urlCompany;
        hasChanges = true;
      }
      
      // Artist filter
      const urlArtist = urlParams.get('artist');
      if (urlArtist) {
        newFilters.selectedArtist = urlArtist;
        hasChanges = true;
      }
      
      // Tag filter
      const urlTag = urlParams.get('tag');
      if (urlTag) {
        const matchingTag = userMetadata.tags.find(tag => tag.name === urlTag);
        if (matchingTag) {
          newFilters.selectedTags = [matchingTag.id];
          hasChanges = true;
        }
      }
      
      // Year filter
      const urlYear = urlParams.get('year');
      if (urlYear) {
        newFilters.selectedYearFinished = urlYear;
        hasChanges = true;
      }
      
      // Drill shape filter
      const urlDrillShape = urlParams.get('drillShape');
      if (urlDrillShape) {
        newFilters.selectedDrillShape = urlDrillShape;
        hasChanges = true;
      }
      
      if (hasChanges) {
        setFilters(newFilters);
        
        // Clear URL parameters for clean URLs
        navigate(location.pathname, { replace: true });
        
        logger.info('Applied URL parameters to filters', { newFilters });
      }
    }
  }, [location.search, isInitialized, navigate, location.pathname, userMetadata.tags]);
  
  // Filter update functions
  const updateStatus = useCallback((status: ProjectFilterStatus) => {
    setFilters(prev => ({ ...prev, activeStatus: status, currentPage: 1 }));
  }, []);
  
  const updateCompany = useCallback((company: string | null) => {
    setFilters(prev => ({ ...prev, selectedCompany: company || 'all', currentPage: 1 }));
  }, []);
  
  const updateArtist = useCallback((artist: string | null) => {
    setFilters(prev => ({ ...prev, selectedArtist: artist || 'all', currentPage: 1 }));
  }, []);
  
  const updateDrillShape = useCallback((shape: string | null) => {
    setFilters(prev => ({ ...prev, selectedDrillShape: shape || 'all', currentPage: 1 }));
  }, []);
  
  const updateYearFinished = useCallback((year: string | null) => {
    setFilters(prev => ({ ...prev, selectedYearFinished: year || 'all', currentPage: 1 }));
  }, []);
  
  const updateIncludeMiniKits = useCallback((include: boolean) => {
    setFilters(prev => ({ ...prev, includeMiniKits: include, currentPage: 1 }));
  }, []);
  
  const updateSearchTerm = useCallback((term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term, currentPage: 1 }));
  }, []);
  
  const updateTags = useCallback((tags: string[]) => {
    setFilters(prev => ({ ...prev, selectedTags: tags, currentPage: 1 }));
  }, []);
  
  const toggleTag = useCallback((tagId: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId],
      currentPage: 1,
    }));
  }, []);
  
  const clearAllTags = useCallback(() => {
    setFilters(prev => ({ ...prev, selectedTags: [], currentPage: 1 }));
  }, []);
  
  const updateSort = useCallback((field: DashboardValidSortField, direction: SortDirectionType) => {
    setFilters(prev => ({ ...prev, sortField: field, sortDirection: direction, currentPage: 1 }));
  }, []);
  
  const updatePage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, currentPage: page }));
  }, []);
  
  const updatePageSize = useCallback((size: number) => {
    setFilters(prev => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);
  
  const updateViewType = useCallback((type: ViewType) => {
    setFilters(prev => ({ ...prev, viewType: type }));
  }, []);
  
  const resetAllFilters = useCallback(() => {
    setFilters(getDefaultFilters());
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  }, []);
  
  // Computed values
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.activeStatus !== 'all') count++;
    if (filters.selectedCompany !== 'all') count++;
    if (filters.selectedArtist !== 'all') count++;
    if (filters.selectedDrillShape !== 'all') count++;
    if (filters.selectedYearFinished !== 'all') count++;
    if (!filters.includeMiniKits) count++;
    if (filters.searchTerm) count++;
    if (filters.selectedTags.length > 0) count++;
    return count;
  }, [filters]);
  
  const getCountsForTabs = useCallback((): CountsForTabsType => {
    const statusBreakdown = dashboardStats?.status_breakdown;
    const totalProjects = statusBreakdown 
      ? Object.values(statusBreakdown).reduce((sum: number, count: unknown) => sum + (typeof count === 'number' ? count : 0), 0)
      : 0;
    
    return {
      all: totalProjects,
      wishlist: typeof statusBreakdown?.wishlist === 'number' ? statusBreakdown.wishlist : 0,
      purchased: typeof statusBreakdown?.purchased === 'number' ? statusBreakdown.purchased : 0,
      stash: typeof statusBreakdown?.stash === 'number' ? statusBreakdown.stash : 0,
      progress: typeof statusBreakdown?.progress === 'number' ? statusBreakdown.progress : 0,
      completed: typeof statusBreakdown?.completed === 'number' ? statusBreakdown.completed : 0,
      destashed: typeof statusBreakdown?.destashed === 'number' ? statusBreakdown.destashed : 0,
      archived: typeof statusBreakdown?.archived === 'number' ? statusBreakdown.archived : 0,
    };
  }, [dashboardStats]);
  
  const dynamicSeparatorProps = useMemo((): DynamicSeparatorPropsType => {
    const isCurrentSortDateBased = DATE_SORT_FIELDS.includes(filters.sortField);
    
    if (!isCurrentSortDateBased) {
      return {
        isCurrentSortDateBased: false,
        countOfItemsWithoutCurrentSortDate: 0,
      };
    }
    
    const currentSortDatePropertyKey = SORT_FIELD_TO_PROJECT_KEY[filters.sortField];
    const currentSortDateFriendlyName = SORT_FIELD_TO_FRIENDLY_NAME[filters.sortField];
    
    const countOfItemsWithoutCurrentSortDate = projects.filter(
      project => !project[currentSortDatePropertyKey]
    ).length;
    
    return {
      isCurrentSortDateBased,
      currentSortDateFriendlyName,
      currentSortDatePropertyKey,
      countOfItemsWithoutCurrentSortDate,
    };
  }, [filters.sortField, projects]);
  
  // Available options
  const companies = useMemo(() => 
    userMetadata?.companies?.map(company => ({ 
      label: company.name, 
      value: company.id 
    })) || [], 
    [userMetadata?.companies]
  );
  
  const artists = useMemo(() => 
    userMetadata?.artists?.map(artist => ({ 
      label: artist.name, 
      value: artist.id 
    })) || [], 
    [userMetadata?.artists]
  );
  
  const allTags = useMemo(() => userMetadata?.tags || [], [userMetadata?.tags]);
  
  const drillShapes = useMemo(() => ['round', 'square'], []);
  
  const isMetadataLoading = useMemo(() => Boolean(
    userMetadata?.isLoading?.companies || 
    userMetadata?.isLoading?.artists || 
    userMetadata?.isLoading?.tags
  ), [userMetadata?.isLoading]);
  
  // Context value
  const contextValue: DashboardFiltersContextValue = useMemo(() => ({
    filters,
    projects,
    isLoadingProjects,
    errorProjects,
    totalItems,
    totalPages,
    refetchProjects: refetchProjectsAsync,
    updateStatus,
    updateCompany,
    updateArtist,
    updateDrillShape,
    updateYearFinished,
    updateIncludeMiniKits,
    updateSearchTerm,
    updateTags,
    toggleTag,
    clearAllTags,
    updateSort,
    updatePage,
    updatePageSize,
    updateViewType,
    resetAllFilters,
    getActiveFilterCount,
    getCountsForTabs,
    dynamicSeparatorProps,
    companies,
    artists,
    drillShapes,
    allTags,
    yearFinishedOptions,
    searchInputRef,
    isSearchPending,
    isMetadataLoading,
  }), [
    filters,
    projects,
    isLoadingProjects,
    errorProjects,
    totalItems,
    totalPages,
    refetchProjectsAsync,
    updateStatus,
    updateCompany,
    updateArtist,
    updateDrillShape,
    updateYearFinished,
    updateIncludeMiniKits,
    updateSearchTerm,
    updateTags,
    toggleTag,
    clearAllTags,
    updateSort,
    updatePage,
    updatePageSize,
    updateViewType,
    resetAllFilters,
    getActiveFilterCount,
    getCountsForTabs,
    dynamicSeparatorProps,
    companies,
    artists,
    drillShapes,
    allTags,
    yearFinishedOptions,
    searchInputRef,
    isSearchPending,
    isMetadataLoading,
  ]);
  
  // Prevent children from rendering until provider is fully initialized
  // This prevents context timing issues that cause "useRecentlyEdited must be used within a Provider" errors
  if (!isInitialized || isMetadataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardFiltersContext.Provider value={contextValue}>
      <RecentlyEditedContext.Provider value={{ recentlyEditedProjectId, setRecentlyEditedProjectId }}>
        {children}
      </RecentlyEditedContext.Provider>
    </DashboardFiltersContext.Provider>
  );
};

// Hook to use the context
export const useDashboardFilters = () => {
  const context = useContext(DashboardFiltersContext);
  if (context === undefined) {
    throw new Error('useDashboardFilters must be used within a DashboardFiltersProvider');
  }
  return context;
};