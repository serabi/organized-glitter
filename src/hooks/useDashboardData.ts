/**
 * Dashboard data fetching hook with consistent metadata integration
 * Provides unified data fetching for Dashboard components with proper query key consistency
 * @author @serabi
 * @created 2025-07-04
 * @updated 2025-07-10
 */

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useProjects, ServerFilters } from '@/hooks/queries/useProjects';
import { useDashboardStatsStable } from '@/hooks/queries/useDashboardStatsStable';
import { useAvailableYears } from '@/hooks/queries/useAvailableYears';
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

  // Memoize metadata arrays to prevent unnecessary re-renders
  const allCompanies = useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);
  const allArtists = useMemo(() => (Array.isArray(artists) ? artists : []), [artists]);

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
      debouncedSearchTerm,
      filters.selectedTags,
    ]
  );

  // Use render guard to track excessive re-renders
  const { renderCount, isExcessive } = useRenderGuard('useDashboardData', 8);
  const { shouldLog } = useThrottledLogger('useDashboardData', 1000);

  // Only fetch data if user exists and initialization is complete
  const shouldFetchData = Boolean(userId && userId !== 'guest' && isInitialized);

  // Optimized debug logging - only log significant changes and throttle excessive logs
  useEffect(() => {
    if (shouldLog()) {
      logger.debug('🎯 useDashboardData called', {
        userId,
        serverFilters,
        sortField: filters.sortField,
        sortDirection: filters.sortDirection,
        currentPage: filters.currentPage,
        pageSize: filters.pageSize,
        isInitialized,
        shouldFetchData,
        caller: new Error().stack?.split('\n')[1]?.trim(),
        timestamp: new Date().toISOString(),
        renderCount,
        isExcessive,
      });
    }
  }, [
    userId,
    serverFilters,
    filters.sortField,
    filters.sortDirection,
    filters.currentPage,
    filters.pageSize,
    isInitialized,
    shouldFetchData,
    renderCount,
    isExcessive,
    shouldLog,
  ]);

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

  const statsQuery = useDashboardStatsStable();
  const yearsQuery = useAvailableYears();

  return {
    projects: projectsQuery.data?.projects || [],
    totalItems: projectsQuery.data?.totalItems || 0,
    totalPages: projectsQuery.data?.totalPages || 0,
    isLoadingProjects: projectsQuery.isLoading,
    errorProjects: projectsQuery.error,
    refetchProjects: projectsQuery.refetch,
    dashboardStats: statsQuery.stats,
    isLoadingStats: statsQuery.isLoading,
    errorStats: statsQuery.error,
    availableYears: yearsQuery.data || [],
  };
};
