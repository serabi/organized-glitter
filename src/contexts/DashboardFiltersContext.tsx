/**
 * @fileoverview Dashboard filters context with optimized state management
 * 
 * This context manages all dashboard filtering, sorting, and pagination state
 * with comprehensive React Query integration and immediate database persistence.
 * Uses database as the single source of truth for all filter state with
 * architectural optimizations to prevent infinite loops and improve performance.
 * 
 * Key Features:
 * - Server-side filtering, sorting, and pagination
 * - Immediate auto-save of filter state to database
 * - React Query optimization with deferred values
 * - Database-first state management with URL parameter override support
 * - Two-effect architecture for optimal performance
 * 
 * Architectural Design:
 * - Split initialization and URL handling into separate focused effects
 * - Run-once initialization logic using useRef to prevent infinite loops
 * - Direct database access eliminates redundant useNavigationFallback dependency
 * - Clear separation of concerns between database restoration and URL parameters
 * - Eliminated circular dependencies that caused performance issues
 * 
 * Database State Management:
 * - Automatically saves current filter/sort state to PocketBase immediately
 * - One-time initialization loads saved filter state on component mount
 * - URL parameters take precedence over saved database filters
 * - Enables reliable navigation arrows and state preservation
 * - Single source of truth eliminates race conditions
 * 
 * Performance Optimizations:
 * - Two focused useEffect hooks prevent infinite loops
 * - Deferred search values for non-blocking UI
 * - Memoized filter options and computed values
 * - Server-side processing reduces client-side computation
 * - React Query caching with smart invalidation
 * - Immediate saves prevent state loss
 * - Eliminated redundant hook calls and circular dependencies
 * 
 * URL Parameter Support:
 * - Supports navigation from overview, companies, tags, and artists pages
 * - URL parameters automatically override database filters
 * - Clean URL experience (parameters cleared after application)
 * - Preserves all existing navigation functionality
 * 
 * @author serabi
 * @since 2025-07-02
 * @version 3.0.0 - Optimized two-effect architecture, eliminated infinite loops
 */

import React, {
  createContext,
  useMemo,
  ReactNode,
  useRef,
  useState,
  useCallback,
  useDeferredValue,
  useEffect,
} from 'react';
import { Project, ProjectFilterStatus, Tag } from '@/types/project';
import { useMetadata } from '@/contexts/MetadataContext';
import { useProjects, ServerFilters } from '@/hooks/queries/useProjects';
import {
  DashboardValidSortField,
  DATE_SORT_FIELDS,
  SORT_FIELD_TO_PROJECT_KEY,
  SORT_FIELD_TO_FRIENDLY_NAME,
} from '@/features/dashboard/dashboard.constants';
import useDebounce from '@/hooks/useDebounce'; // For search term
import { useDashboardStats } from '@/hooks/queries/useDashboardStats';
import { useAvailableYearsAsStrings } from '@/hooks/queries/useAvailableYears';
import { useSaveNavigationContext } from '@/hooks/mutations/useSaveNavigationContext';
import { createLogger } from '@/utils/secureLogger';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { pb } from '@/lib/pocketbase';

export type SortDirectionType = 'asc' | 'desc';

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

export type ViewType = 'grid' | 'list';

export interface DashboardFiltersContextValue {
  // Data from server (via useProjects React Query hook)
  projects: Project[]; // Data after server-side filtering/sorting/pagination
  isLoadingProjects: boolean;
  errorProjects: Error | null;
  refetchProjects: () => Promise<void>;
  totalItems: number; // Total items from server for pagination
  totalPages: number; // Total pages from server

  // Server-side filter states
  activeStatus: ProjectFilterStatus;
  selectedCompany: string;
  selectedArtist: string;
  selectedDrillShape: string;
  selectedYearFinished: string;
  includeMiniKits: boolean;

  // Client-side filter states
  searchTerm: string;
  selectedTags: string[]; // Changed from selectedTag to selectedTags for multi-select
  isSearchPending?: boolean; // OG-91: Indicates if search results are being deferred

  // Sorting state (server-side)
  sortField: DashboardValidSortField;
  sortDirection: SortDirectionType;

  // Pagination state (server-side)
  currentPage: number;
  pageSize: number;

  // View type (client-side)
  viewType: ViewType;

  // Available options for filters (derived from raw data or metadata)
  companies: { label: string; value: string }[];
  artists: { label: string; value: string }[];
  drillShapes: string[];
  allTags: Tag[]; // All available tags for the filter dropdown
  yearFinishedOptions: string[];

  // Actions
  applyStatusFilter: (status: ProjectFilterStatus) => void;
  applyCompanyFilter: (company: string | null) => void;
  applyArtistFilter: (artist: string | null) => void;
  applyDrillShapeFilter: (shape: string | null) => void;
  applyYearFinishedFilter: (year: string | null) => void;
  applyIncludeMiniKitsFilter: (include: boolean) => void;
  applySearchTerm: (term: string | null) => void;
  applyTagFilter: (tagId: string) => void; // For toggling a single tag
  clearTagFilters: () => void;
  applySort: (field: DashboardValidSortField, direction: SortDirectionType) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  applyViewType: (type: ViewType) => void;
  resetAllFilters: () => void;

  // Utilities
  getActiveFilterCount: () => number;
  getCountsForTabs: () => CountsForTabsType;
  dynamicSeparatorProps: DynamicSeparatorPropsType;
  searchInputRef: React.RefObject<HTMLInputElement>;

  // Processed projects (after client-side filtering)
  processedAndPaginatedProjects: Project[];
  isMetadataLoading: boolean;
}

export const DashboardFiltersContext = createContext<DashboardFiltersContextValue | undefined>(
  undefined
);

interface DashboardFiltersProviderProps {
  children: ReactNode;
  user: { id: string; email?: string } | null;
}

// Stable empty array to prevent unnecessary re-renders
const EMPTY_TAGS_ARRAY: string[] = [];

export const DashboardFiltersProvider: React.FC<DashboardFiltersProviderProps> = React.memo(
  ({ children, user }) => {
    // Reduced logging for performance
    // console.log('🔄 DashboardFiltersProvider render:', user?.id);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const userMetadata = useMetadata();
    const { toast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const userId = useMemo(() => user?.id, [user?.id]);

    // Server-side filter states
    const [activeStatus, setActiveStatus] = useState<ProjectFilterStatus>('all');
    const [selectedCompany, setSelectedCompany] = useState<string>('all');
    const [selectedArtist, setSelectedArtist] = useState<string>('all');
    const [selectedDrillShape, setSelectedDrillShape] = useState<string>('all');
    const [selectedYearFinished, setSelectedYearFinished] = useState<string>('all');
    const [includeMiniKits, setIncludeMiniKits] = useState<boolean>(true); // Default to include

    // Client-side filter states
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedTags, setSelectedTags] = useState<string[]>(EMPTY_TAGS_ARRAY); // Array of tag IDs

    // Sorting state
    const [sortField, setSortField] = useState<DashboardValidSortField>('last_updated');
    const [sortDirection, setSortDirection] = useState<SortDirectionType>('desc');

    // Pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(25);

    // View type
    const [viewType, setViewType] = useState<ViewType>('grid');

    const debouncedSearchTerm = useDebounce(searchTerm, 150); // Reduced from 300ms for better responsiveness

    // OG-91: Use deferred value for search to keep UI responsive
    const deferredSearchTerm = useDeferredValue(debouncedSearchTerm);

    // OG-91: Detect when search is pending (user typed but results not yet updated)
    const isSearchPending = debouncedSearchTerm !== deferredSearchTerm;

    // Prepare filters for useProjects React Query hook - including search and tags for server-side filtering
    const serverFilters = useMemo(
      (): ServerFilters => ({
        status: activeStatus,
        company: selectedCompany,
        artist: selectedArtist,
        drillShape: selectedDrillShape,
        yearFinished: selectedYearFinished,
        includeMiniKits: includeMiniKits,
        searchTerm: deferredSearchTerm, // OG-91: Use deferred value for non-blocking search
        selectedTags: selectedTags,
      }),
      [
        activeStatus,
        selectedCompany,
        selectedArtist,
        selectedDrillShape,
        selectedYearFinished,
        includeMiniKits,
        deferredSearchTerm,
        selectedTags,
      ]
    );

    const {
      data: projectsData,
      isLoading: isLoadingProjects,
      error: queryError,
      refetch: refetchProjects,
    } = useProjects({
      userId,
      filters: serverFilters,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
    });

    // Get dashboard stats for tab counts (independent of current filters)
    const { stats: dashboardStats } = useDashboardStats();

    // Auto-save navigation context for fallback when accessing via direct URL
    // This enables navigation arrows to work when users bookmark project URLs
    const saveNavigationContext = useSaveNavigationContext();

    // Memoize navigation context to prevent unnecessary saves when data hasn't changed
    const navigationContextToSave = useMemo(() => ({
      filters: {
        status: activeStatus,
        company: selectedCompany,
        artist: selectedArtist,
        drillShape: selectedDrillShape,
        yearFinished: selectedYearFinished,
        includeMiniKits,
        searchTerm: deferredSearchTerm,
        selectedTags,
      },
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      preservationContext: {
        scrollPosition: 0, // Will be set during actual navigation
        timestamp: Date.now(),
      },
    }), [
      activeStatus,
      selectedCompany,
      selectedArtist,
      selectedDrillShape,
      selectedYearFinished,
      includeMiniKits,
      deferredSearchTerm,
      selectedTags,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
    ]);

    // Extract data from React Query result
    const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData?.projects]);
    const totalItems = projectsData?.totalItems || 0;
    const totalPages = projectsData?.totalPages || 0;
    const errorProjects = queryError ? (queryError as Error) : null;

    // Wrap refetch to match expected interface
    const refetchProjectsAsync = useCallback(async () => {
      await refetchProjects();
    }, [refetchProjects]);

    // Note: Auto-save is now handled immediately in each filter action function
    // This eliminates debounce delays and provides instant state persistence

    // Debug logging removed for performance

    // Note: Refetch is handled automatically by React Query when dependencies change
    // No manual refetch useEffect needed since React Query already handles dependency changes

    // Note: Database filter restoration is now handled entirely within the consolidated restoration effect
    // No separate hook needed since DashboardFiltersContext already manages database state

    // Restoration state tracking to prevent infinite loops during filter restoration
    const [isRestoringFromDatabase, setIsRestoringFromDatabase] = useState(false);
    
    // Track if initial database restoration has completed to prevent multiple runs
    const hasInitialized = useRef(false);

    /**
     * Immediately saves current filter state to database
     * This ensures all filter changes are persisted instantly for reliable state management
     */
    const saveCurrentStateToDatabase = useCallback(() => {
      const logger = createLogger('DashboardFiltersContext-Save');
      
      if (!userId || isRestoringFromDatabase) {
        // Don't save during restoration to prevent infinite loops or if no user is logged in
        logger.info('⏭️ Skipping database save', {
          reason: !userId ? 'No user ID' : 'Currently restoring from database',
          userId: !!userId,
          isRestoringFromDatabase
        });
        return;
      }

      logger.info('🔄 Initiating database save for filter state', {
        userId,
        timestamp: Date.now()
      });

      // Use memoized navigation context to prevent unnecessary saves
      // Update timestamp for current save operation
      const navigationContext = {
        ...navigationContextToSave,
        preservationContext: {
          ...navigationContextToSave.preservationContext,
          timestamp: Date.now(),
        },
      };

      // Immediate save without debounce for reliable state persistence
      saveNavigationContext.mutate({
        userId,
        navigationContext,
      });
    }, [
      userId,
      isRestoringFromDatabase,
      navigationContextToSave,
      // Note: saveNavigationContext removed from dependencies as React Query mutations
      // are not stable references and would cause infinite re-renders
    ]);

    // --- Action Implementations ---
    /**
     * Applies status filter and immediately saves state to database
     * @param status - The project status to filter by
     */
    const applyStatusFilter = useCallback(
      (status: ProjectFilterStatus) => {
        setActiveStatus(status);
        setCurrentPage(1); // Reset to first page on filter change
        
        // Immediate database save for reliable state persistence
        saveCurrentStateToDatabase();
      },
      [saveCurrentStateToDatabase]
    );

    /**
     * Applies company filter and immediately saves state to database
     * @param company - The company ID to filter by or null for 'all'
     */
    const applyCompanyFilter = useCallback((company: string | null) => {
      const normalizedCompany = company ?? 'all';
      setSelectedCompany(normalizedCompany);
      setCurrentPage(1);
      
      // Immediate database save for reliable state persistence
      saveCurrentStateToDatabase();
    }, [saveCurrentStateToDatabase]);

    /**
     * Applies artist filter and immediately saves state to database
     * @param artist - The artist ID to filter by or null for 'all'
     */
    const applyArtistFilter = useCallback((artist: string | null) => {
      const normalizedArtist = artist ?? 'all';
      setSelectedArtist(normalizedArtist);
      setCurrentPage(1);
      
      // Immediate database save for reliable state persistence
      saveCurrentStateToDatabase();
    }, [saveCurrentStateToDatabase]);

    /**
     * Applies drill shape filter and immediately saves state to database
     * @param shape - The drill shape to filter by or null for 'all'
     */
    const applyDrillShapeFilter = useCallback((shape: string | null) => {
      const normalizedShape = shape ?? 'all';
      setSelectedDrillShape(normalizedShape);
      setCurrentPage(1);
      
      // Immediate database save for reliable state persistence
      saveCurrentStateToDatabase();
    }, [saveCurrentStateToDatabase]);

    /**
     * Applies year finished filter and immediately saves state to database
     * @param year - The year to filter by or null for 'all'
     */
    const applyYearFinishedFilter = useCallback((year: string | null) => {
      const normalizedYear = year ?? 'all';
      setSelectedYearFinished(normalizedYear);
      setCurrentPage(1);
      
      // Immediate database save for reliable state persistence
      saveCurrentStateToDatabase();
    }, [saveCurrentStateToDatabase]);

    /**
     * Applies include mini kits filter and immediately saves state to database
     * @param include - Whether to include mini kits in results
     */
    const applyIncludeMiniKitsFilter = useCallback((include: boolean) => {
      setIncludeMiniKits(include);
      setCurrentPage(1);
      
      // Immediate database save for reliable state persistence
      saveCurrentStateToDatabase();
    }, [saveCurrentStateToDatabase]);

    /**
     * Applies search term filter and immediately saves state to database
     * @param term - The search term to filter by or null to clear
     */
    const applySearchTerm = useCallback((term: string | null) => {
      setSearchTerm(term ?? '');
      setCurrentPage(1); // Reset to first page since this now triggers server-side filtering
      
      // Immediate database save for reliable state persistence
      saveCurrentStateToDatabase();
    }, [saveCurrentStateToDatabase]);

    /**
     * Toggles a tag filter on/off and immediately saves state to database
     * @param tagId - The tag ID to toggle
     */
    const applyTagFilter = useCallback((tagId: string) => {
      setSelectedTags(prevTags =>
        prevTags.includes(tagId) ? prevTags.filter(t => t !== tagId) : [...prevTags, tagId]
      );
      setCurrentPage(1); // Reset to first page since this now triggers server-side filtering
      
      // Immediate database save for reliable state persistence
      saveCurrentStateToDatabase();
    }, [saveCurrentStateToDatabase]);

    /**
     * Clears all tag filters and immediately saves state to database
     */
    const clearTagFilters = useCallback(() => {
      setSelectedTags(EMPTY_TAGS_ARRAY);
      
      // Immediate database save for reliable state persistence
      saveCurrentStateToDatabase();
    }, [saveCurrentStateToDatabase]);

    /**
     * Applies sort settings and immediately saves state to database
     * @param newSortField - The field to sort by
     * @param newSortDirection - The sort direction (asc/desc)
     */
    const applySort = useCallback(
      (newSortField: DashboardValidSortField, newSortDirection: SortDirectionType) => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        setCurrentPage(1); // Reset to first page on sort change
        
        // Immediate database save for reliable state persistence
        saveCurrentStateToDatabase();
      },
      [saveCurrentStateToDatabase]
    );

    /**
     * Sets current page and immediately saves state to database
     * @param page - The page number to navigate to
     */
    const handleSetCurrentPage = useCallback((page: number) => {
      setCurrentPage(page);
      
      // Immediate database save for reliable state persistence
      saveCurrentStateToDatabase();
    }, [saveCurrentStateToDatabase]);

    /**
     * Sets page size and immediately saves state to database
     * @param newPageSize - The new page size
     */
    const handleSetPageSize = useCallback((newPageSize: number) => {
      setPageSize(newPageSize);
      setCurrentPage(1); // Reset to first page on page size change
      
      // Immediate database save for reliable state persistence
      saveCurrentStateToDatabase();
    }, [saveCurrentStateToDatabase]);

    const applyViewType = useCallback((type: ViewType) => {
      setViewType(type);
    }, []);

    /**
     * Resets all filters to default values and immediately saves state to database
     * @param skipDatabaseSave - If true, doesn't save to database (used during URL override)
     */
    const resetAllFilters = useCallback((skipDatabaseSave = false) => {
      setActiveStatus('all');
      setSelectedCompany('all');
      setSelectedArtist('all');
      setSelectedDrillShape('all');
      setSelectedYearFinished('all');
      setIncludeMiniKits(true);
      setSearchTerm('');
      setSelectedTags(EMPTY_TAGS_ARRAY);
      setSortField('last_updated');
      setSortDirection('desc');
      setCurrentPage(1);
      // setPageSize(25); // Optionally reset page size
      if (searchInputRef.current) {
        searchInputRef.current.value = '';
      }
      
      // Immediate database save for reliable state persistence (unless skipped)
      if (!skipDatabaseSave) {
        saveCurrentStateToDatabase();
      }
    }, [saveCurrentStateToDatabase]);

    /**
     * Applies URL parameters to filter state without saving to database
     * Used during URL override to set filters based on navigation URLs
     */
    const applyUrlParameters = useCallback((searchParams: URLSearchParams) => {
      const logger = createLogger('DashboardFiltersContext-URLOverride');
      
      // Apply status filter from URL
      const urlStatus = searchParams.get('status');
      if (urlStatus && ['wishlist', 'purchased', 'stash', 'progress', 'completed', 'destashed', 'archived'].includes(urlStatus)) {
        logger.info('📌 Applying status from URL', { status: urlStatus });
        setActiveStatus(urlStatus as ProjectFilterStatus);
      }
      
      // Apply company filter from URL
      const urlCompany = searchParams.get('company');
      if (urlCompany) {
        logger.info('📌 Applying company from URL', { company: urlCompany });
        setSelectedCompany(urlCompany);
      }
      
      // Apply artist filter from URL
      const urlArtist = searchParams.get('artist');
      if (urlArtist) {
        logger.info('📌 Applying artist from URL', { artist: urlArtist });
        setSelectedArtist(urlArtist);
      }
      
      // Apply tag filter from URL
      const urlTag = searchParams.get('tag');
      if (urlTag) {
        logger.info('📌 Applying tag from URL', { tag: urlTag });
        // Find tag by name in metadata and use its ID
        const matchingTag = userMetadata.tags.find(tag => tag.name === urlTag);
        if (matchingTag) {
          setSelectedTags([matchingTag.id]);
        }
      }
      
      // Apply year filter from URL
      const urlYear = searchParams.get('year');
      if (urlYear) {
        logger.info('📌 Applying year from URL', { year: urlYear });
        setSelectedYearFinished(urlYear);
      }
      
      // Apply drill shape filter from URL
      const urlDrillShape = searchParams.get('drillShape');
      if (urlDrillShape) {
        logger.info('📌 Applying drill shape from URL', { drillShape: urlDrillShape });
        setSelectedDrillShape(urlDrillShape);
      }
      
      // Reset page to 1 when applying URL filters
      setCurrentPage(1);
    }, [userMetadata.tags]);

    // --- Optimized: Server-Side Filtering ---
    // Since filtering is now server-side, we don't need client-side filtering
    // This significantly improves performance by reducing processing on large datasets
    const processedAndPaginatedProjects = useMemo(() => rawProjects || [], [rawProjects]);

    // --- Utilities ---
    const getActiveFilterCount = useCallback(() => {
      let count = 0;
      if (activeStatus !== 'all') count++;
      if (selectedCompany !== 'all') count++;
      if (selectedArtist !== 'all') count++;
      if (selectedDrillShape !== 'all') count++;
      if (selectedYearFinished !== 'all') count++;
      if (!includeMiniKits) count++; // Counts if "Include Mini Kits" is unchecked
      if (searchTerm) count++;
      if (selectedTags.length > 0) count++;
      return count;
    }, [
      activeStatus,
      selectedCompany,
      selectedArtist,
      selectedDrillShape,
      selectedYearFinished,
      includeMiniKits,
      searchTerm,
      selectedTags,
    ]);

    const getCountsForTabs = useMemo(
      () => () => {
        // Use dashboard stats for accurate counts across all projects (ignoring current filters)
        // This ensures tab counts remain consistent regardless of which tab is selected
        const counts: CountsForTabsType = {
          all: 0,
          wishlist: 0,
          purchased: 0,
          stash: 0,
          progress: 0,
          completed: 0,
          destashed: 0,
          archived: 0,
        };

        if (dashboardStats?.status_breakdown) {
          // Use status breakdown from dashboard stats for accurate counts
          const breakdown = dashboardStats.status_breakdown;
          counts.wishlist = breakdown.wishlist ?? 0;
          counts.purchased = breakdown.purchased ?? 0;
          counts.stash = breakdown.stash ?? 0;
          counts.progress = breakdown.progress ?? 0;
          counts.completed = breakdown.completed ?? 0;
          counts.destashed = breakdown.destashed ?? 0;
          counts.archived = breakdown.archived ?? 0;

          // Calculate 'all' as sum of all individual status counts
          counts.all =
            counts.wishlist +
            counts.purchased +
            counts.stash +
            counts.progress +
            counts.completed +
            counts.destashed +
            counts.archived;
        } else {
          // Fallback to current behavior if dashboard stats not available
          rawProjects.forEach((project: Project) => {
            if (project.status in counts) {
              counts[project.status as keyof CountsForTabsType]++;
            }
          });
          counts.all = totalItems;
        }

        return counts;
      },
      [dashboardStats?.status_breakdown, rawProjects, totalItems]
    );

    const dynamicSeparatorProps = useMemo((): DynamicSeparatorPropsType => {
      // This logic might need adjustment if client-side filtering changes the set of projects
      // before this calculation. It should ideally operate on the data *after* server-side sorting
      // but *before* client-side filtering if the separator is based on the server sort.
      // For now, using `clientFilteredProjects` which might not be ideal for date separator logic.
      // Let's use `rawProjects` for this, as it reflects server sort order.
      const projectsForSeparator = rawProjects || [];
      const isDateSort = sortField && DATE_SORT_FIELDS.includes(sortField);
      if (!isDateSort || !sortField) {
        return { isCurrentSortDateBased: false, countOfItemsWithoutCurrentSortDate: 0 };
      }
      const currentSortField = sortField as DashboardValidSortField;
      const projectKey = SORT_FIELD_TO_PROJECT_KEY[currentSortField];
      const friendlyName = SORT_FIELD_TO_FRIENDLY_NAME[currentSortField];
      if (!projectKey || !friendlyName) {
        return { isCurrentSortDateBased: true, countOfItemsWithoutCurrentSortDate: 0 };
      }
      let count = 0;
      for (const project of projectsForSeparator) {
        const dateValue = project[projectKey];
        if (!dateValue || (typeof dateValue === 'string' && dateValue.trim() === '')) {
          count++;
        }
      }
      return {
        isCurrentSortDateBased: true,
        currentSortDatePropertyKey: projectKey,
        currentSortDateFriendlyName: friendlyName,
        countOfItemsWithoutCurrentSortDate: count,
      };
    }, [sortField, rawProjects]);

    // Use all tags from metadata instead of deriving from current projects
    // This prevents circular dependency where tag filtering depends on tags derived from filtered projects
    const allTags = useMemo(() => {
      return userMetadata.tags.slice().sort((a, b) => a.name.localeCompare(b.name));
    }, [userMetadata.tags]);

    // Derive unique companies, artists, drill shapes, year finished options from rawProjects
    // This should ideally come from `rawProjects` to reflect what's available in the current server-filtered dataset,
    // or from `userMetadata` if those are meant to be exhaustive lists.
    // For now, let's use userMetadata for companies/artists and derive others from rawProjects.
    const drillShapes = useMemo(
      () =>
        [
          ...new Set(
            rawProjects
              .map(p => p.drillShape)
              .filter(Boolean)
              .sort()
          ),
        ] as string[],
      [rawProjects]
    );
    // Use modern hook for available years instead of deriving from current page results
    // This fixes the issue where years were missing if projects were on other pages
    const { years: yearFinishedOptions, isLoading: isLoadingYears } = useAvailableYearsAsStrings({ 
      userId: user?.id 
    });

    // Memoize artists and companies mappings to prevent unnecessary re-renders
    const artistsOptions = useMemo(
      () => userMetadata.artists.map(artist => ({ label: artist.name, value: artist.id })),
      [userMetadata.artists]
    );
    const companiesOptions = useMemo(
      () => userMetadata.companies.map(company => ({ label: company.name, value: company.id })),
      [userMetadata.companies]
    );

    // EFFECT 1: Initialize filters from database (runs once on mount)
    useEffect(() => {
      const logger = createLogger('DashboardFiltersContext-Init');
      
      // Only run once when user becomes available and metadata is loaded
      if (!user?.id || hasInitialized.current || userMetadata.isLoading.tags || userMetadata.isLoading.companies || userMetadata.isLoading.artists) {
        return;
      }
      
      logger.info('🔄 Initializing dashboard filters from database', {
        userId: user.id,
        timestamp: Date.now()
      });
      
      hasInitialized.current = true;
      setIsRestoringFromDatabase(true);
      
      // Fetch saved filters directly from database
      const fetchSavedFilters = async () => {
        try {
          const record = await pb.collection('user_dashboard_settings')
            .getFirstListItem(`user="${user.id}"`);
          
          if (record.navigation_context) {
            logger.info('💾 Restoring saved filters from database', {
              filters: record.navigation_context.filters,
              sortField: record.navigation_context.sortField,
              sortDirection: record.navigation_context.sortDirection,
              currentPage: record.navigation_context.currentPage,
              pageSize: record.navigation_context.pageSize
            });
            
            const savedFilters = record.navigation_context as any; // Type cast needed for database record
            
            // Apply saved filter state (type-safe conversions)
            setActiveStatus((savedFilters.filters.status as ProjectFilterStatus) || 'all');
            setSelectedCompany(savedFilters.filters.company || 'all');
            setSelectedArtist(savedFilters.filters.artist || 'all');
            setSelectedDrillShape(savedFilters.filters.drillShape || 'all');
            setSelectedYearFinished(savedFilters.filters.yearFinished || 'all');
            setIncludeMiniKits(savedFilters.filters.includeMiniKits ?? true);
            setSearchTerm(savedFilters.filters.searchTerm || '');
            setSelectedTags(savedFilters.filters.selectedTags || []);
            setSortField((savedFilters.sortField as DashboardValidSortField) || 'last_updated');
            setSortDirection((savedFilters.sortDirection as SortDirectionType) || 'desc');
            setCurrentPage(savedFilters.currentPage || 1);
            setPageSize(savedFilters.pageSize || 25);
            
            // Show user feedback for successful restoration (only in development to avoid spam)
            if (import.meta.env.DEV) {
              toast({
                title: 'Filters Restored',
                description: 'Your previous dashboard filters have been restored.',
                duration: 2000,
              });
            }
          } else {
            logger.info('🏠 No saved filters found, using defaults');
          }
        } catch (error) {
          // If no record exists (404), that's okay - use defaults
          if (error?.status === 404) {
            logger.info('🏠 No dashboard settings record found, using defaults');
          } else {
            logger.error('Error fetching saved filters:', error);
          }
        }
        
        // Clear restoration flag after completion (success or failure)
        setIsRestoringFromDatabase(false);
        logger.info('✅ Database filter initialization completed');
      };
      
      fetchSavedFilters();
    }, [user?.id, userMetadata.isLoading.tags, userMetadata.isLoading.companies, userMetadata.isLoading.artists, toast]);

    // EFFECT 2: Handle URL parameters (runs when URL changes)
    useEffect(() => {
      const logger = createLogger('DashboardFiltersContext-URLParams');
      
      // Only proceed if user is available and we've completed initialization
      if (!user?.id || !hasInitialized.current) {
        return;
      }
      
      const searchParams = new URLSearchParams(location.search);
      const hasUrlParams = searchParams.size > 0;
      
      // Only process URL parameters if they exist
      if (!hasUrlParams) {
        return;
      }
      
      logger.info('🎯 Processing URL parameters', {
        search: location.search,
        params: Object.fromEntries(searchParams.entries()),
        timestamp: Date.now()
      });
      
      setIsRestoringFromDatabase(true);
      
      // Reset all filters to defaults first (without saving to database)
      resetAllFilters(true);
      
      // Apply URL parameters to override defaults
      applyUrlParameters(searchParams);
      
      // Clear restoration flag and save new state to database
      setTimeout(() => {
        setIsRestoringFromDatabase(false);
        
        // Save the new filter state to database
        saveCurrentStateToDatabase();
        
        // Clear URL parameters for clean browsing experience
        navigate(location.pathname, { replace: true });
        
        logger.info('✅ URL parameters applied and state saved to database');
        
        // Show user feedback for URL override (only in development to avoid spam)
        if (import.meta.env.DEV) {
          toast({
            title: 'Filters Applied',
            description: 'Dashboard filters have been set based on your navigation.',
            duration: 2000,
          });
        }
      }, 0);
    }, [location.search, user?.id, resetAllFilters, applyUrlParameters, saveCurrentStateToDatabase, navigate, toast]);

    const contextValue = useMemo(
      (): DashboardFiltersContextValue => ({
        projects: rawProjects, // Data from server
        isLoadingProjects,
        errorProjects,
        refetchProjects: refetchProjectsAsync,
        totalItems,
        totalPages,

        // Filter states
        activeStatus,
        selectedCompany,
        selectedArtist,
        selectedDrillShape,
        selectedYearFinished,
        includeMiniKits,
        searchTerm,
        selectedTags,
        isSearchPending, // OG-91: Add pending state
        sortField,
        sortDirection,
        currentPage,
        pageSize,
        viewType,

        // Metadata
        companies: companiesOptions,
        artists: artistsOptions,
        drillShapes,
        allTags,
        yearFinishedOptions,

        // Actions
        applyStatusFilter,
        applyCompanyFilter,
        applyArtistFilter,
        applyDrillShapeFilter,
        applyYearFinishedFilter,
        applyIncludeMiniKitsFilter,
        applySearchTerm,
        applyTagFilter,
        clearTagFilters,
        applySort,
        setCurrentPage: handleSetCurrentPage,
        setPageSize: handleSetPageSize,
        applyViewType,
        resetAllFilters,

        // Utilities
        getActiveFilterCount,
        getCountsForTabs,
        dynamicSeparatorProps,
        searchInputRef,
        processedAndPaginatedProjects, // Use this for rendering
        isMetadataLoading:
          userMetadata.isLoading.companies ||
          userMetadata.isLoading.artists ||
          userMetadata.isLoading.tags ||
          isLoadingYears,
      }),
      [
        // Core data
        rawProjects,
        isLoadingProjects,
        errorProjects,
        refetchProjectsAsync,
        totalItems,
        totalPages,
        // Filter states
        activeStatus,
        selectedCompany,
        selectedArtist,
        selectedDrillShape,
        selectedYearFinished,
        includeMiniKits,
        searchTerm,
        selectedTags,
        isSearchPending,
        sortField,
        sortDirection,
        currentPage,
        pageSize,
        viewType,
        // Metadata and derived data
        companiesOptions,
        artistsOptions,
        userMetadata.isLoading.companies,
        userMetadata.isLoading.artists,
        userMetadata.isLoading.tags,
        isLoadingYears,
        drillShapes,
        allTags,
        yearFinishedOptions,
        // Functions (stable due to useCallback)
        applyStatusFilter,
        applyCompanyFilter,
        applyArtistFilter,
        applyDrillShapeFilter,
        applyYearFinishedFilter,
        applyIncludeMiniKitsFilter,
        applySearchTerm,
        applyTagFilter,
        clearTagFilters,
        applySort,
        handleSetCurrentPage,
        handleSetPageSize,
        applyViewType,
        resetAllFilters,
        getActiveFilterCount,
        getCountsForTabs,
        dynamicSeparatorProps,
        processedAndPaginatedProjects,
      ]
    );

    return (
      <DashboardFiltersContext.Provider value={contextValue}>
        {children}
      </DashboardFiltersContext.Provider>
    );
  }
);
