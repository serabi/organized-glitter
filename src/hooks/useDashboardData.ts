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
import { createLogger } from '@/utils/secureLogger';
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

  const allCompanies = useMemo(() => {
    if (!Array.isArray(companies)) return [];
    return companies;
  }, [companiesSignature]);

  const allArtists = useMemo(() => {
    if (!Array.isArray(artists)) return [];
    return artists;
  }, [artistsSignature]);

  // Stabilize selectedTags array with content-based signature
  const selectedTagsSignature = useMemo(
    () => filters.selectedTags?.sort().join(',') || '',
    [filters.selectedTags]
  );

  // Memoize server filters to prevent unnecessary re-executions
  const serverFilters: ServerFilters = useMemo(
    () => ({
      status: filters.activeStatus,
      company: filters.selectedCompany,
      artist: filters.selectedArtist,
      drillShape: filters.selectedDrillShape,
      yearFinished: filters.selectedYearFinished,
      includeMiniKits: filters.includeMiniKits,
      includeDestashed: filters.includeDestashed,
      includeArchived: filters.includeArchived,
      includeWishlist: filters.includeWishlist,
      searchTerm: debouncedSearchTerm, // Use the debounced version from context
      selectedTags: filters.selectedTags,
    }),
    [
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
    ]
  );

  // Use render guard to track excessive re-renders (lowered threshold after optimizations)
  const { renderCount, isExcessive } = useRenderGuard('useDashboardData', 5);
  const { shouldLog } = useThrottledLogger('useDashboardData', 1000);

  // Only fetch data if user exists and initialization is complete
  const shouldFetchData = Boolean(userId && userId !== 'guest' && isInitialized);

  // Stable logging with minimal dependencies to prevent re-render loops
  useEffect(() => {
    if (shouldLog() && isExcessive) {
      logger.debug('🎯 useDashboardData excessive re-renders detected', {
        renderCount,
        isExcessive,
        isInitialized,
        hasUserId: !!userId,
      });
    }
  }, [isExcessive, shouldLog, renderCount, isInitialized, userId]);

  // Memoize useProjects parameters to prevent unnecessary re-executions
  const projectsParams = useMemo(
    () => ({
      userId,
      filters: serverFilters,
      sortField: filters.sortField,
      sortDirection: filters.sortDirection,
      currentPage: filters.currentPage,
      pageSize: filters.pageSize,
    }),
    [
      userId,
      serverFilters,
      filters.sortField,
      filters.sortDirection,
      filters.currentPage,
      filters.pageSize,
    ]
  );

  // Add enabled flag to prevent execution during initialization
  const projectsParamsWithEnabled = useMemo(
    () => ({
      ...projectsParams,
      enabled: shouldFetchData,
    }),
    [projectsParams, shouldFetchData]
  );

  // Pass metadata to useProjects for consistent query key generation
  const projectsQuery = useProjects(projectsParamsWithEnabled, allCompanies, allArtists);

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
