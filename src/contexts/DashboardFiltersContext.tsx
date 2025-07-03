/**
 * @fileoverview Dashboard filters context with navigation auto-save
 * 
 * This context manages all dashboard filtering, sorting, and pagination state
 * with comprehensive React Query integration and automatic navigation context
 * persistence to the database.
 * 
 * Key Features:
 * - Server-side filtering, sorting, and pagination
 * - Real-time auto-save of filter state to database
 * - React Query optimization with deferred values
 * - URL synchronization for deep linking
 * - Navigation context preservation for direct URL access
 * 
 * Navigation Context Auto-Save:
 * - Automatically saves current filter/sort state to PocketBase
 * - 1-second debounce prevents excessive database writes
 * - Enables navigation arrows to work from bookmarked URLs
 * - Fallback system for when React Router state is unavailable
 * 
 * Performance Optimizations:
 * - Deferred search values for non-blocking UI
 * - Memoized filter options and computed values
 * - Server-side processing reduces client-side computation
 * - React Query caching with smart invalidation
 * 
 * @author serabi
 * @since 2025-07-02
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
import { useSearchParams } from 'react-router-dom';
import { Project, ProjectFilterStatus, Tag } from '@/types/project'; // Import ProjectFilterStatus from here
import { useMetadata } from '@/contexts/MetadataContext';
// import useDashboardFilters from '@/hooks/useDashboardFilters'; // This will be re-evaluated
import useUrlFilterSync from '@/hooks/dashboard/useUrlFilterSync';
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
    // const { toast } = useToast(); // Removed as it's unused
    const userId = useMemo(() => user?.id, [user?.id]);
    const [, setSearchParams] = useSearchParams();

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

    // Extract data from React Query result
    const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData?.projects]);
    const totalItems = projectsData?.totalItems || 0;
    const totalPages = projectsData?.totalPages || 0;
    const errorProjects = queryError ? (queryError as Error) : null;

    // Wrap refetch to match expected interface
    const refetchProjectsAsync = useCallback(async () => {
      await refetchProjects();
    }, [refetchProjects]);

    // Auto-save navigation context when filters change (debounced)
    // This creates a database fallback for direct URL access scenarios
    useEffect(() => {
      // Only save if we have a user and this isn't the initial render
      if (!userId) return;
      
      // Create a simplified navigation context with just the essential data
      // This will be used as fallback when users access project URLs directly
      const navigationContext = {
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
      };
      
      // Debounce the save operation to avoid excessive database writes
      // 1-second delay prevents rapid-fire saves during filter adjustments
      const timeoutId = setTimeout(() => {
        saveNavigationContext.mutate({
          userId,
          navigationContext,
        });
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    }, [
      userId,
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
      saveNavigationContext,
    ]);

    // Debug logging removed for performance

    // Note: Refetch is handled automatically by React Query when dependencies change
    // No manual refetch useEffect needed since React Query already handles dependency changes

    // --- Action Implementations ---
    const applyStatusFilter = useCallback(
      (status: ProjectFilterStatus) => {
        setActiveStatus(status);
        setCurrentPage(1); // Reset to first page on filter change

        // Update URL to reflect the new status filter using React Router
        setSearchParams(params => {
          if (status === 'all') {
            params.delete('status');
          } else {
            params.set('status', status);
          }
          return params;
        });
      },
      [setSearchParams]
    );

    const applyCompanyFilter = useCallback((company: string | null) => {
      const normalizedCompany = company ?? 'all';
      setSelectedCompany(normalizedCompany);
      setCurrentPage(1);

      // Update URL to reflect the new company filter using React Router
      setSearchParams(params => {
        if (normalizedCompany === 'all') {
          params.delete('company');
        } else {
          params.set('company', normalizedCompany);
        }
        return params;
      });
    }, [setSearchParams]);

    const applyArtistFilter = useCallback((artist: string | null) => {
      const normalizedArtist = artist ?? 'all';
      setSelectedArtist(normalizedArtist);
      setCurrentPage(1);

      // Update URL to reflect the new artist filter using React Router
      setSearchParams(params => {
        if (normalizedArtist === 'all') {
          params.delete('artist');
        } else {
          params.set('artist', normalizedArtist);
        }
        return params;
      });
    }, [setSearchParams]);

    const applyDrillShapeFilter = useCallback((shape: string | null) => {
      const normalizedShape = shape ?? 'all';
      setSelectedDrillShape(normalizedShape);
      setCurrentPage(1);

      // Update URL to reflect the new drill shape filter using React Router
      setSearchParams(params => {
        if (normalizedShape === 'all') {
          params.delete('drillShape');
        } else {
          params.set('drillShape', normalizedShape);
        }
        return params;
      });
    }, [setSearchParams]);

    const applyYearFinishedFilter = useCallback((year: string | null) => {
      const normalizedYear = year ?? 'all';
      setSelectedYearFinished(normalizedYear);
      setCurrentPage(1);

      // Update URL to reflect the new year finished filter using React Router
      setSearchParams(params => {
        if (normalizedYear === 'all') {
          params.delete('yearFinished');
        } else {
          params.set('yearFinished', normalizedYear);
        }
        return params;
      });
    }, [setSearchParams]);

    const applyIncludeMiniKitsFilter = useCallback((include: boolean) => {
      setIncludeMiniKits(include);
      setCurrentPage(1);

      // Update URL to reflect the new include mini kits filter using React Router
      setSearchParams(params => {
        if (include === true) {
          // Default is true, so remove parameter when true
          params.delete('includeMiniKits');
        } else {
          params.set('includeMiniKits', 'false');
        }
        return params;
      });
    }, [setSearchParams]);

    const applySearchTerm = useCallback((term: string | null) => {
      setSearchTerm(term ?? '');
      setCurrentPage(1); // Reset to first page since this now triggers server-side filtering
    }, []);

    const applyTagFilter = useCallback((tagId: string) => {
      setSelectedTags(prevTags =>
        prevTags.includes(tagId) ? prevTags.filter(t => t !== tagId) : [...prevTags, tagId]
      );
      setCurrentPage(1); // Reset to first page since this now triggers server-side filtering
    }, []);

    const clearTagFilters = useCallback(() => {
      setSelectedTags(EMPTY_TAGS_ARRAY);
    }, []);

    const applySort = useCallback(
      (newSortField: DashboardValidSortField, newSortDirection: SortDirectionType) => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        setCurrentPage(1); // Reset to first page on sort change
      },
      []
    );

    const handleSetCurrentPage = useCallback((page: number) => {
      setCurrentPage(page);
    }, []);

    const handleSetPageSize = useCallback((newPageSize: number) => {
      setPageSize(newPageSize);
      setCurrentPage(1); // Reset to first page on page size change
    }, []);

    const applyViewType = useCallback((type: ViewType) => {
      setViewType(type);
    }, []);

    const resetAllFilters = useCallback(() => {
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
    }, []);

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

    // Simplified - React Query handles caching and deduplication, reducing need for complex memoization

    useUrlFilterSync({
      // Pass setters for server-side filters
      setActiveStatus,
      setSelectedCompany: applyCompanyFilter,
      setSelectedArtist: applyArtistFilter,
      setSelectedDrillShape: applyDrillShapeFilter,
      setSelectedYearFinished: applyYearFinishedFilter,
      setIncludeMiniKits: applyIncludeMiniKitsFilter,
      // Pass setters for client-side filters
      setSearchTerm: applySearchTerm,
      setSelectedTags, // Pass direct setter for string[]
      // Pass setters for sorting and pagination
      setSortField,
      setSortDirection,
      setCurrentPage,
      setPageSize,
      // Pass current values for reading from URL
      activeStatus,
      selectedCompany,
      selectedArtist,
      selectedDrillShape,
      selectedYearFinished,
      includeMiniKits,
      searchTerm,
      selectedTags,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      // Metadata and loading states
      artists: artistsOptions,
      companies: companiesOptions,
      allTagsContext: allTags,
      isMetadataLoading:
        userMetadata.isLoading.companies ||
        userMetadata.isLoading.artists ||
        userMetadata.isLoading.tags,
      isLoadingProjects,
    });

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
