/**
 * Modern projects data fetching hook using structured service layer
 * Provides unified project queries with optimized performance and type safety
 * @author @serabi
 * @created 2025-01-16
 */

import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/secureLogger';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { SortDirectionType } from '@/contexts/FilterProvider';
import { StatusBreakdown } from '@/types/dashboard';
import { queryKeys, ProjectQueryParams } from './queryKeys';
import { useRenderGuard, useThrottledLogger } from '@/utils/renderGuards';
import { projectsService } from '@/services/pocketbase/projects.service';
import {
  ProjectFilters,
  ProjectQueryOptions,
  ProjectQueryResult,
  ProjectExpandOptions,
} from '@/types/projectFilters';
import { Project, ProjectFilterStatus } from '@/types/project';
import { getStatusCountQueryConfig } from './shared/queryUtils';

// Re-export for backward compatibility
export interface ServerFilters {
  status?: ProjectFilterStatus;
  company?: string;
  artist?: string;
  drillShape?: string;
  yearFinished?: string;
  includeMiniKits?: boolean;
  includeDestashed?: boolean;
  includeArchived?: boolean;
  includeWishlist?: boolean;
  searchTerm?: string;
  selectedTags?: string[];
}

export interface UseProjectsParams {
  userId: string | undefined;
  filters: ServerFilters;
  sortField: DashboardValidSortField;
  sortDirection: SortDirectionType;
  currentPage: number;
  pageSize: number;
  enabled?: boolean;
}

export interface ProjectsResult {
  projects: Project[];
  totalItems: number;
  totalPages: number;
  statusCounts: StatusBreakdown;
}

const logger = createLogger('useProjects');

/**
 * Transform ServerFilters to ProjectFilters for service layer
 */
const transformFilters = (userId: string, serverFilters: ServerFilters): ProjectFilters => {
  return {
    userId,
    status: serverFilters.status,
    company: serverFilters.company,
    artist: serverFilters.artist,
    drillShape: serverFilters.drillShape,
    yearFinished: serverFilters.yearFinished,
    includeMiniKits: serverFilters.includeMiniKits,
    includeDestashed: serverFilters.includeDestashed,
    includeArchived: serverFilters.includeArchived,
    includeWishlist: serverFilters.includeWishlist,
    searchTerm: serverFilters.searchTerm,
    selectedTags: serverFilters.selectedTags,
  };
};

/**
 * Optimized project fetching using service layer
 */
const fetchProjects = async (
  params: ProjectQueryParams & { userId: string },
  availableCompanies?: Array<{ id: string; name: string }>,
  availableArtists?: Array<{ id: string; name: string }>
): Promise<ProjectsResult> => {
  const { userId, filters, sortField, sortDirection, currentPage, pageSize } = params;

  // Enhanced dev logging for Dashboard performance monitoring
  if (import.meta.env.DEV) {
    logger.info('🎯 [DASHBOARD] useProjects: Starting project fetch', {
      userId,
      status: filters.status,
      currentPage,
      pageSize,
      sortField,
      sortDirection,
      hasCompanies: !!availableCompanies?.length,
      hasArtists: !!availableArtists?.length,
    });
  }

  const fetchStartTime = performance.now();

  // Create lookup maps for O(1) performance
  const companyMap = availableCompanies
    ? new Map(availableCompanies.map(c => [c.id, c.name]))
    : undefined;

  const artistMap = availableArtists
    ? new Map(availableArtists.map(a => [a.id, a.name]))
    : undefined;

  // Transform filters and create query options
  const projectFilters = transformFilters(userId, filters);
  const queryOptions: ProjectQueryOptions = {
    filters: projectFilters,
    sort: {
      field: sortField,
      direction: sortDirection,
    },
    page: currentPage,
    pageSize,
    expand: {
      tags: true,
      company: false,
      artist: false,
      user: false,
    },
    includeStatusCounts: true,
  };

  // Use optimized service query
  const result = await projectsService.getProjects(queryOptions, companyMap, artistMap);

  const fetchEndTime = performance.now();
  const fetchDuration = fetchEndTime - fetchStartTime;

  // Enhanced dev logging for Dashboard performance monitoring
  if (import.meta.env.DEV) {
    logger.info('✅ [DASHBOARD] useProjects: Project fetch completed', {
      fetchDuration: `${Math.round(fetchDuration)}ms`,
      projectsReturned: result.projects.length,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      hasStatusCounts: !!result.statusCounts,
      statusCounts: result.statusCounts,
    });
  }

  return {
    projects: result.projects,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    statusCounts: result.statusCounts || {
      wishlist: 0,
      purchased: 0,
      stash: 0,
      progress: 0,
      completed: 0,
      archived: 0,
      destashed: 0,
    },
  };
};

/**
 * Modern React Query hook for fetching projects with optimized performance
 * Uses structured service layer and eliminates expensive fallback patterns
 */
export const useProjects = (
  {
    userId,
    filters,
    sortField,
    sortDirection,
    currentPage,
    pageSize,
    enabled = true,
  }: UseProjectsParams,
  availableCompanies?: Array<{ id: string; name: string }>,
  availableArtists?: Array<{ id: string; name: string }>
) => {
  const queryClient = useQueryClient();

  // Stabilize filters with content-based memoization to prevent unnecessary re-computations
  const stableFilters = useMemo(() => filters, [filters]);

  // Memoize query parameters with stable filter reference
  const queryParams: ProjectQueryParams = useMemo(
    () => ({
      filters: stableFilters,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
    }),
    [stableFilters, sortField, sortDirection, currentPage, pageSize]
  );

  // Use render guard to track excessive re-renders (lowered threshold after optimizations)
  const { renderCount, isExcessive } = useRenderGuard('useProjects', 4);
  const { shouldLog } = useThrottledLogger('useProjects', 1000);

  // Optimized debug logging - only log when excessive renders are detected
  useEffect(() => {
    if (shouldLog() && isExcessive) {
      logger.debug('🔄 useProjects called (modernized)', {
        userId,
        status: stableFilters.status,
        queryKey: queryKeys.projects.list(userId || '', queryParams),
        enabled: !!userId && enabled,
        renderCount,
        isExcessive,
      });
    }
  }, [userId, queryParams, enabled, stableFilters.status, isExcessive, shouldLog, renderCount]);

  // Stabilize metadata signatures for query key
  const companiesSignature = useMemo(
    () =>
      availableCompanies
        ?.map(c => c.id)
        .sort()
        .join(',') || '',
    [availableCompanies]
  );
  const artistsSignature = useMemo(
    () =>
      availableArtists
        ?.map(a => a.id)
        .sort()
        .join(',') || '',
    [availableArtists]
  );

  const query = useQuery({
    queryKey: [
      ...queryKeys.projects.list(userId || '', queryParams),
      companiesSignature,
      artistsSignature,
    ],
    queryFn: () =>
      fetchProjects({ userId: userId!, ...queryParams }, availableCompanies, availableArtists),
    enabled: !!userId && enabled, // Only run when userId is available AND hook is enabled
    ...getStatusCountQueryConfig(), // Use optimized caching with smart invalidation
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Stabilize prefetch dependencies to prevent unnecessary re-renders
  const shouldPrefetch = Boolean(
    userId &&
      query.data?.totalPages &&
      currentPage < query.data.totalPages &&
      !query.isPlaceholderData
  );

  // Prefetch next page for better UX with stabilized dependencies
  useEffect(() => {
    if (shouldPrefetch) {
      const nextPageParams: ProjectQueryParams = {
        ...queryParams,
        currentPage: currentPage + 1,
      };

      queryClient.prefetchQuery({
        queryKey: [
          ...queryKeys.projects.list(userId, nextPageParams),
          companiesSignature,
          artistsSignature,
        ],
        queryFn: () =>
          fetchProjects({ userId, ...nextPageParams }, availableCompanies, availableArtists),
        staleTime: 2 * 60 * 1000, // Same as main query
      });

      logger.debug('🔄 Prefetched next page:', currentPage + 1);
    }
  }, [
    shouldPrefetch,
    queryParams,
    queryClient,
    companiesSignature,
    artistsSignature,
    userId,
    currentPage,
    availableCompanies,
    availableArtists,
  ]);

  return query;
};
