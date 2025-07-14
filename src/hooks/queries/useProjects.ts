/**
 * Projects data fetching hook with consistent metadata integration
 * Provides unified project queries with proper ID-to-name resolution for companies and artists
 * Fixed infinite loop issues by standardizing query key generation across all components
 * @author @serabi
 * @created 2025-07-04
 * @updated 2025-07-10
 */

import { useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Project, ProjectFilterStatus, ProjectStatus } from '@/types/project';
import { createLogger } from '@/utils/secureLogger';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { SortDirectionType } from '@/contexts/FilterProvider';
import { ProjectsResponse } from '@/types/pocketbase.types';
import { StatusBreakdown } from '@/types/dashboard';
import { queryKeys, ProjectQueryParams } from './queryKeys';
import { useRenderGuard, useThrottledLogger } from '@/utils/renderGuards';

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

const POCKETBASE_SORT_MAP: Record<DashboardValidSortField, string> = {
  last_updated: 'updated',
  date_purchased: 'date_purchased',
  date_finished: 'date_completed',
  date_started: 'date_started',
  date_received: 'date_received',
  kit_name: 'title',
  company: 'company',
  artist: 'artist',
  status: 'status',
  width: 'width',
  height: 'height',
  kit_category: 'kit_category',
  drill_shape: 'drill_shape',
};

const logger = createLogger('useProjects');

// Build filter string using PocketBase best practices for secure parameter injection
// Unified function that handles both main queries and status counting with smart exclusions
const buildFilterString = (
  userId: string,
  serverFilters: ServerFilters,
  excludeStatus?: string,
  skipCheckboxFilters?: boolean
): string => {
  const filterParts: string[] = [];

  // Always filter by user for data isolation - use pb.filter() for security
  if (userId) {
    filterParts.push(pb.filter('user = {:userId}', { userId }));
  }

  // Use excludeStatus for status counting, otherwise use serverFilters.status for main queries
  const statusToFilter = excludeStatus || serverFilters.status;
  if (statusToFilter && statusToFilter !== 'all') {
    filterParts.push(pb.filter('status = {:status}', { status: statusToFilter }));
  }
  if (serverFilters.company && serverFilters.company !== 'all') {
    // Company filter should use the company ID directly, not company.name
    filterParts.push(pb.filter('company = {:company}', { company: serverFilters.company }));
  }
  if (serverFilters.artist && serverFilters.artist !== 'all') {
    // Artist filter should use the artist ID directly, not artist.name
    filterParts.push(pb.filter('artist = {:artist}', { artist: serverFilters.artist }));
  }
  if (serverFilters.drillShape && serverFilters.drillShape !== 'all') {
    filterParts.push(
      pb.filter('drill_shape = {:drillShape}', { drillShape: serverFilters.drillShape })
    );
  }
  if (serverFilters.yearFinished && serverFilters.yearFinished !== 'all') {
    const year = parseInt(serverFilters.yearFinished, 10);
    if (!isNaN(year)) {
      // Filter by completion date only - matches "Year Finished" semantic meaning
      // Only includes projects that were actually completed in the selected year
      filterParts.push(
        pb.filter('date_completed >= {:startDate} && date_completed <= {:endDate}', {
          startDate: `${year}-01-01 00:00:00`,
          endDate: `${year}-12-31 23:59:59`,
        })
      );
    }
  }
  // Apply kit category filter
  if (serverFilters.includeMiniKits === false) {
    filterParts.push('kit_category != "mini"');
  }

  // Smart Boolean filter application - for main queries use status filter, for counting use excludeStatus parameter
  // Skip checkbox filters when counting individual status tabs to show true counts
  if (!skipCheckboxFilters) {
    const currentStatus = serverFilters.status || excludeStatus;

    // Include destashed filtering - exclude destashed projects unless specifically viewing/counting destashed
    if (serverFilters.includeDestashed === false && currentStatus !== 'destashed') {
      filterParts.push('status != "destashed"');
    }

    // Include archived filtering - exclude archived projects unless specifically viewing/counting archived
    if (serverFilters.includeArchived === false && currentStatus !== 'archived') {
      filterParts.push('status != "archived"');
    }

    // Include wishlist filtering - exclude wishlist projects unless specifically viewing/counting wishlist
    if (serverFilters.includeWishlist === false && currentStatus !== 'wishlist') {
      filterParts.push('status != "wishlist"');
    }
  }

  // Add search term filtering using secure pb.filter() method
  if (serverFilters.searchTerm && serverFilters.searchTerm.trim()) {
    const searchTerm = serverFilters.searchTerm.trim();

    // Use pb.filter() for secure parameter injection - no manual escaping needed
    // Note: Cannot search by company.name or artist.name directly in PocketBase
    const searchFilter = pb.filter('(title ~ {:term} || general_notes ~ {:term})', {
      term: searchTerm,
    });
    filterParts.push(searchFilter);
  }

  // Add tag filtering using secure parameter injection
  if (serverFilters.selectedTags && serverFilters.selectedTags.length > 0) {
    const tagFilters = serverFilters.selectedTags.map((tagId, index) =>
      pb.filter(`project_tags_via_project.tag ?= {:tagId${index}}`, { [`tagId${index}`]: tagId })
    );
    filterParts.push(`(${tagFilters.join(' || ')})`);
  }

  return filterParts.join(' && ');
};

/**
 * Fetches projects from PocketBase with server-side filtering, sorting, and pagination
 * Performs ID-to-name resolution for companies and artists using Map lookups for O(1) performance
 * @author @serabi
 * @param params Query parameters including filters, sorting, and pagination
 * @param availableCompanies Array of company metadata for ID-to-name resolution
 * @param availableArtists Array of artist metadata for ID-to-name resolution
 * @returns Promise resolving to ProjectsResult with projects, totalItems, and totalPages
 */
const fetchProjects = async (
  params: ProjectQueryParams & { userId: string },
  availableCompanies?: Array<{ id: string; name: string }>,
  availableArtists?: Array<{ id: string; name: string }>
): Promise<ProjectsResult> => {
  const { userId, filters, sortField, sortDirection, currentPage, pageSize } = params;

  if (!userId) {
    throw new Error('User ID is required');
  }

  logger.debug(`Fetching projects for user ${userId} with filters:`, filters);

  const pbFilter = buildFilterString(userId, filters);
  const pbSortField = POCKETBASE_SORT_MAP[sortField as DashboardValidSortField] || 'updated';
  const pbSort = `${sortDirection === 'desc' ? '-' : '+'}${pbSortField}`;

  const startTime = performance.now();
  const requestKey = `dashboard-projects-${userId}-page${currentPage}-size${pageSize}-sort${pbSort}-filter${pbFilter}`;

  logger.debug('Fetching projects:', { userId, currentPage, pageSize });

  const requestParams = {
    filter: pbFilter,
    sort: pbSort,
    expand: 'project_tags_via_project.tag', // Expand junction table tags (removed fields to include expand data)
    // Removed fields parameter to allow expand data to be included (matches working pattern in useProjectExport)
    requestKey,
  };

  // Use query with junction table expand - removed fields parameter to include expand data
  // Following working pattern from useProjectExport.ts for successful tag expansion
  let resultList;

  try {
    // Try the full expand query first
    resultList = await pb.collection('projects').getList(currentPage, pageSize, requestParams);
  } catch (error) {
    // If expand fails, try without expand to get basic project data
    logger.warn('Tags expand failed, trying without expand:', error);

    const fallbackParams = {
      filter: pbFilter,
      sort: pbSort,
      requestKey: `${requestParams.requestKey}-fallback`,
      // No expand for fallback to get basic data only
    };

    resultList = await pb.collection('projects').getList(currentPage, pageSize, fallbackParams);

    // Try to add tags data separately for each project
    if (resultList.items.length > 0) {
      logger.debug('Attempting to fetch tags separately for projects');

      const projectsWithTags = await Promise.allSettled(
        resultList.items.map(async (project: ProjectsResponse) => {
          try {
            const projectWithTags = (await pb.collection('projects').getOne(project.id, {
              expand: 'project_tags_via_project.tag',
              requestKey: `project-tags-fallback-${project.id}`,
            })) as ProjectsResponse<Record<string, unknown>>;

            return {
              ...project,
              expand: projectWithTags.expand,
            } as ProjectsResponse<Record<string, unknown>>;
          } catch (tagError) {
            logger.warn(`Failed to fetch tags for project ${project.id}:`, tagError);
            return project as ProjectsResponse<Record<string, unknown>>; // Return project without tags if tag fetch fails
          }
        })
      );

      // Update resultList with projects that successfully got their tags
      resultList.items = projectsWithTags.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          logger.warn(`Tag fetch failed for project at index ${index}:`, result.reason);
          return resultList.items[index]; // Fallback to original project data
        }
      });

      logger.info(
        `Successfully fetched tags for ${projectsWithTags.filter(r => r.status === 'fulfilled').length} of ${resultList.items.length} projects`
      );
    }
  }

  const endTime = performance.now();
  logger.debug(
    `Query completed in ${Math.round(endTime - startTime)}ms - ${resultList.items.length} items`
  );

  logger.debug('Query results:', {
    totalItems: resultList.totalItems,
    itemsReturned: resultList.items.length,
  });

  // Enhanced logging for expand data analysis
  logger.debug('Raw expand data analysis:', {
    sampleProjectIds: resultList.items.slice(0, 3).map((item: ProjectsResponse) => item.id),
    sampleExpands: resultList.items.slice(0, 3).map((item: ProjectsResponse) => ({
      projectId: item.id,
      hasExpand: !!item.expand,
      expandKeys: item.expand ? Object.keys(item.expand) : [],
      projectTagsViaProject: item.expand?.['project_tags_via_project'],
    })),
    allProjectsWithTags: resultList.items.filter(
      (item: ProjectsResponse) => item.expand?.['project_tags_via_project']
    ).length,
  });

  // Create lookup maps for O(1) performance instead of O(n) Array.find()
  const companyMap = availableCompanies
    ? new Map(availableCompanies.map(c => [c.id, c.name]))
    : new Map<string, string>();

  const artistMap = availableArtists
    ? new Map(availableArtists.map(a => [a.id, a.name]))
    : new Map<string, string>();

  const projectsData: Project[] = (
    resultList.items as ProjectsResponse<Record<string, unknown>>[]
  ).map(record => {
    const projectRecord = record;
    const recordExpand = record.expand as Record<string, unknown> | undefined;
    const projectTags = recordExpand?.['project_tags_via_project'];

    // Enhanced debug logging for tag processing
    logger.debug(`Processing tags for project ${projectRecord.id}:`, {
      hasExpand: !!recordExpand,
      expandKeys: recordExpand ? Object.keys(recordExpand) : [],
      hasProjectTags: !!projectTags,
      projectTagsType: Array.isArray(projectTags) ? 'array' : typeof projectTags,
      projectTagsLength: Array.isArray(projectTags) ? projectTags.length : 'N/A',
      rawProjectTags: projectTags,
    });

    const tags = Array.isArray(projectTags)
      ? projectTags
          .map((pt: Record<string, unknown>, index: number) => {
            const ptExpand = pt.expand as Record<string, unknown>;

            logger.debug(`Processing project tag ${index} for project ${projectRecord.id}:`, {
              hasExpand: !!ptExpand,
              expandKeys: ptExpand ? Object.keys(ptExpand) : [],
              hasTag: !!ptExpand?.tag,
              rawPt: pt,
              rawTag: ptExpand?.tag,
            });

            if (ptExpand?.tag) {
              const tag = ptExpand.tag as Record<string, unknown>;
              const processedTag = {
                id: tag.id as string,
                userId: tag.user as string,
                name: tag.name as string,
                slug: tag.slug as string,
                color: tag.color as string,
                createdAt: tag.created as string,
                updatedAt: tag.updated as string,
              };

              logger.debug(
                `Successfully processed tag for project ${projectRecord.id}:`,
                processedTag
              );
              return processedTag;
            } else {
              logger.warn(
                `Failed to process tag ${index} for project ${projectRecord.id} - missing tag data`
              );
              return null;
            }
          })
          .filter((tag): tag is NonNullable<typeof tag> => {
            const isValid = tag !== null;
            if (!isValid) {
              logger.warn(`Filtered out null tag for project ${projectRecord.id}`);
            }
            return isValid;
          })
      : [];

    logger.debug(`Final processed tags for project ${projectRecord.id}:`, {
      tagCount: tags.length,
      tagNames: tags.map(t => t.name),
      tags: tags,
    });

    return {
      id: projectRecord.id as string,
      userId: projectRecord.user as string,
      title: projectRecord.title as string,
      company: (() => {
        const companyId = projectRecord.company;
        if (!companyId) return undefined;

        return companyMap.get(companyId);
      })(),
      artist: (() => {
        const artistId = projectRecord.artist;
        if (!artistId) return undefined;

        return artistMap.get(artistId);
      })(),
      status: (projectRecord.status as ProjectStatus) || 'wishlist',
      kit_category: projectRecord.kit_category || undefined,
      drillShape: projectRecord.drill_shape || undefined,
      datePurchased: projectRecord.date_purchased || undefined,
      dateReceived: projectRecord.date_received || undefined,
      dateStarted: projectRecord.date_started || undefined,
      dateCompleted: projectRecord.date_completed || undefined,
      width: projectRecord.width || undefined,
      height: projectRecord.height || undefined,
      totalDiamonds: projectRecord.total_diamonds || undefined,
      generalNotes: projectRecord.general_notes || '',
      imageUrl: projectRecord.image
        ? pb.files.getURL({ ...record, collectionName: 'projects' }, projectRecord.image, {
            thumb: '300x200f',
          })
        : undefined,
      sourceUrl: projectRecord.source_url || undefined,
      tags: tags,
      createdAt: projectRecord.created || '',
      updatedAt: projectRecord.updated || '',
    };
  });

  logger.info(`Projects fetched: ${projectsData.length} of ${resultList.totalItems}`);

  // Helper function to build safe filter strings for status counts
  // Skip checkbox filters for individual status counts to show true totals
  const buildStatusCountFilter = (status: string): string => {
    return buildFilterString(userId, filters, status, true);
  };

  // Calculate status counts using the unified filter logic
  const statusCountPromises = [
    pb
      .collection('projects')
      .getList(1, 1, {
        filter: buildStatusCountFilter('wishlist'),
        skipTotal: false,
      })
      .then(result => ({ status: 'wishlist', count: result.totalItems })),

    pb
      .collection('projects')
      .getList(1, 1, {
        filter: buildStatusCountFilter('purchased'),
        skipTotal: false,
      })
      .then(result => ({ status: 'purchased', count: result.totalItems })),

    pb
      .collection('projects')
      .getList(1, 1, {
        filter: buildStatusCountFilter('stash'),
        skipTotal: false,
      })
      .then(result => ({ status: 'stash', count: result.totalItems })),

    pb
      .collection('projects')
      .getList(1, 1, {
        filter: buildStatusCountFilter('progress'),
        skipTotal: false,
      })
      .then(result => ({ status: 'progress', count: result.totalItems })),

    pb
      .collection('projects')
      .getList(1, 1, {
        filter: buildStatusCountFilter('completed'),
        skipTotal: false,
      })
      .then(result => ({ status: 'completed', count: result.totalItems })),

    pb
      .collection('projects')
      .getList(1, 1, {
        filter: buildStatusCountFilter('archived'),
        skipTotal: false,
      })
      .then(result => ({ status: 'archived', count: result.totalItems })),

    pb
      .collection('projects')
      .getList(1, 1, {
        filter: buildStatusCountFilter('destashed'),
        skipTotal: false,
      })
      .then(result => ({ status: 'destashed', count: result.totalItems })),
  ];

  const statusCountResults = await Promise.all(statusCountPromises);

  const statusCounts: StatusBreakdown = {
    wishlist: 0,
    purchased: 0,
    stash: 0,
    progress: 0,
    completed: 0,
    archived: 0,
    destashed: 0,
  };

  for (const { status, count } of statusCountResults) {
    statusCounts[status as keyof StatusBreakdown] = count;
  }

  return {
    projects: projectsData,
    totalItems: resultList.totalItems,
    totalPages: resultList.totalPages,
    statusCounts,
  };
};

/**
 * React Query hook for fetching projects with filtering, sorting, and pagination
 * Ensures consistent query key generation across all components to prevent cache issues
 * Performs automatic ID-to-name resolution for companies and artists
 *
 * @param params Object containing userId, filters, sorting, and pagination options
 * @param availableCompanies Array of company metadata for consistent query keys and name resolution
 * @param availableArtists Array of artist metadata for consistent query keys and name resolution
 * @returns React Query result with projects data, loading state, and error handling
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
      logger.debug('🔄 useProjects called', {
        userId,
        status: stableFilters.status,
        queryKey: queryKeys.projects.list(userId || '', queryParams),
        enabled: !!userId && enabled,
        initializationGated: !enabled,
        fullQueryParams: queryParams,
        renderCount,
        isExcessive,
      });
    }
  }, [userId, queryParams, enabled, stableFilters.status, isExcessive, shouldLog]);

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
    staleTime: 5 * 60 * 1000, // 5 minutes (increased for better performance)
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    // Prevent blinking by keeping previous data while fetching new data
    placeholderData: previousData => previousData,
    // Alternative to placeholderData - keeps previous data during refetches
    refetchOnWindowFocus: false, // Reduce unnecessary refetches that cause blinking
    refetchOnReconnect: false, // Reduce blinking on reconnect
    // Optimize re-renders by only notifying on specific prop changes
    notifyOnChangeProps: ['data', 'error', 'isLoading', 'isError'],
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      const errorMessage = error?.message || '';
      const isClientError =
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');

      if (isClientError) {
        return false;
      }

      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
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
  ]);

  return query;
};
