/**
 * Dashboard data fetching hook
 * @author @serabi
 * @created 2025-07-04
 */

import { useProjects, ServerFilters } from '@/hooks/queries/useProjects';
import { useDashboardStatsStable } from '@/hooks/queries/useDashboardStatsStable';
import { useAvailableYears } from '@/hooks/queries/useAvailableYears';
import { FilterState } from '@/contexts/FiltersContext';

export const useDashboardData = (
  userId: string,
  filters: FilterState,
  debouncedSearchTerm: string
) => {
  // Use the debounced search term passed from context to avoid double debouncing

  const serverFilters: ServerFilters = {
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
  };

  const projectsQuery = useProjects({
    userId,
    filters: serverFilters,
    sortField: filters.sortField,
    sortDirection: filters.sortDirection,
    currentPage: filters.currentPage,
    pageSize: filters.pageSize,
  });

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
