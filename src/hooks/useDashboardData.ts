/**
 * Dashboard data fetching hook with consistent metadata integration
 * Provides unified data fetching for Dashboard components with proper query key consistency
 * @author @serabi
 * @created 2025-07-04
 * @updated 2025-07-10
 */

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useProjects, ServerFilters } from '@/hooks/queries/useProjects';
import { FilterState } from '@/contexts/FilterProvider';
import { useMetadata } from '@/contexts/MetadataContext';
import { createLogger, dashboardLogger } from '@/utils/secureLogger';
import { useRenderGuard, useThrottledLogger } from '@/utils/renderGuards';

// Create logger outside component scope to ensure stable reference
const logger = createLogger('useDashboardData');

export const useDashboardData = (
  userId: string,
  filters: FilterState,
  debouncedSearchTerm: string,
  isInitialized: boolean = false
) => {
  // Use the debounced search term passed from context to avoid double debouncing
  // Only fetch data once filter initialization is complete

  // Get metadata for consistent query key generation across all useProjects calls
  const { companies, artists } = useMetadata();

  // Stabilize metadata arrays with optimized ID-based memoization
  const companiesSignature = useMemo(
    () =>
      companies
        ?.map(c => c.id)
        .sort()
        .join(',') || '',
    [companies]
  );

  const artistsSignature = useMemo(
    () =>
      artists
        ?.map(a => a.id)
        .sort()
        .join(',') || '',
    [artists]
  );

  // Pass PocketBase response objects directly to useProjects
  const allCompanies = useMemo(() => {
    if (!Array.isArray(companies)) return [];
    return companies; // Keep as CompaniesResponse[]
  }, [companies]);

  const allArtists = useMemo(() => {
    if (!Array.isArray(artists)) return [];
    return artists; // Keep as ArtistsResponse[]
  }, [artists]);

  // Stabilize selectedTags array with content-based signature
  const selectedTagsSignature = useMemo(
    () => filters.selectedTags?.sort().join(',') || '',
    [filters.selectedTags]
  );

  // Properly memoize server filters with deep equality check
  const serverFilters: ServerFilters = useMemo(() => {
    const filterObj = {
      status: filters.activeStatus,
      company: filters.selectedCompany,
      artist: filters.selectedArtist,
      drillShape: filters.selectedDrillShape,
      yearFinished: filters.selectedYearFinished,
      includeMiniKits: filters.includeMiniKits,
      includeDestashed: filters.includeDestashed,
      includeArchived: filters.includeArchived,
      includeWishlist: filters.includeWishlist,
      searchTerm: debouncedSearchTerm,
      selectedTags: filters.selectedTags,
    };

    // Only return new object if values actually changed
    return filterObj;
  }, [
    filters.activeStatus,
    filters.selectedCompany,
    filters.selectedArtist,
    filters.selectedDrillShape,
    filters.selectedYearFinished,
    filters.includeMiniKits,
    filters.includeDestashed,
    filters.includeArchived,
    filters.includeWishlist,
    debouncedSearchTerm,
    selectedTagsSignature, // Use signature instead of array reference
  ]);

  // Use render guard to track excessive re-renders (lowered threshold after optimizations)
  const { renderCount, isExcessive } = useRenderGuard('useDashboardData', 5);
  const { shouldLog } = useThrottledLogger('useDashboardData', 1000);

  // Only fetch data if user exists and initialization is complete
  const shouldFetchData = Boolean(userId && userId !== 'guest' && isInitialized);

  // Enhanced render monitoring with detailed debugging
  useEffect(() => {
    if (isExcessive) {
      dashboardLogger.logRenderCount('useDashboardData', renderCount, isExcessive);
      if (shouldLog()) {
        logger.debug('🎯 useDashboardData excessive re-renders detected', {
          renderCount,
          isExcessive,
          isInitialized,
          hasUserId: !!userId,
          // Debug info for render triggers
          serverFiltersSignature: JSON.stringify(serverFilters),
          companiesCount: allCompanies?.length || 0,
          artistsCount: allArtists?.length || 0,
          companiesSignature,
          artistsSignature,
          selectedTagsSignature,
          filterActiveStatus: filters.activeStatus,
          filterCurrentPage: filters.currentPage,
        });
      }
    }
  }, [
    isExcessive,
    shouldLog,
    renderCount,
    isInitialized,
    userId,
    // Use signatures instead of full objects to reduce re-renders
    companiesSignature,
    artistsSignature,
    selectedTagsSignature,
    filters.activeStatus,
    filters.currentPage,
  ]);

  // Stabilize all useProjects parameters in a single memoized object
  const projectsParamsWithEnabled = useMemo(() => {
    return {
      userId,
      filters: serverFilters,
      sortField: filters.sortField,
      sortDirection: filters.sortDirection,
      currentPage: filters.currentPage,
      pageSize: filters.pageSize,
      enabled: shouldFetchData,
    };
  }, [
    userId,
    serverFilters,
    filters.sortField,
    filters.sortDirection,
    filters.currentPage,
    filters.pageSize,
    shouldFetchData,
  ]);

  // Pass metadata to useProjects for consistent query key generation
  const projectsQuery = useProjects(projectsParamsWithEnabled, allCompanies, allArtists);

  // Consolidated dashboard performance logging
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    if (projectsQuery.isLoading) {
      logger.info('⏳ [DASHBOARD] Loading projects...', {
        currentPage: filters.currentPage,
        activeStatus: filters.activeStatus,
        sortField: filters.sortField,
        sortDirection: filters.sortDirection,
        hasSearchTerm: !!debouncedSearchTerm,
      });
    } else if (projectsQuery.data && !projectsQuery.isLoading) {
      logger.info('✅ [DASHBOARD] Projects loaded successfully', {
        projectsCount: projectsQuery.data.projects.length,
        totalItems: projectsQuery.data.totalItems,
        totalPages: projectsQuery.data.totalPages,
        hasStatusCounts: !!projectsQuery.data.statusCounts,
        isStale: projectsQuery.isStale,
      });
    }
  }, [
    projectsQuery.isLoading,
    projectsQuery.data,
    projectsQuery.isStale,
    filters.currentPage,
    filters.activeStatus,
    filters.sortField,
    filters.sortDirection,
    debouncedSearchTerm,
  ]);

  return {
    projects: projectsQuery.data?.projects || [],
    totalItems: projectsQuery.data?.totalItems || 0,
    totalPages: projectsQuery.data?.totalPages || 0,
    statusCounts: projectsQuery.data?.statusCounts, // Enhanced status counts from useProjects - single source of truth
    isLoadingProjects: projectsQuery.isLoading,
    errorProjects: projectsQuery.error,
    refetchProjects: projectsQuery.refetch,
  };
};
