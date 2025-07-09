import { useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Project, ProjectFilterStatus, ProjectStatus } from '@/types/project';
import { createLogger } from '@/utils/secureLogger';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { SortDirectionType } from '@/contexts/FilterProvider';
import { ProjectsResponse } from '@/types/pocketbase.types';
import { queryKeys, ProjectQueryParams } from './queryKeys';

export interface ServerFilters {
  status?: ProjectFilterStatus;
  company?: string;
  artist?: string;
  drillShape?: string;
  yearFinished?: string;
  includeMiniKits?: boolean;
  includeDestashed?: boolean;
  includeArchived?: boolean;
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
}

const POCKETBASE_SORT_MAP: Record<DashboardValidSortField, string> = {
  last_updated: 'updated',
  date_purchased: 'date_purchased',
  date_finished: 'date_completed',
  date_started: 'date_started',
  date_received: 'date_received',
  kit_name: 'title',
};

const logger = createLogger('useProjects');

// Build filter string using PocketBase best practices for secure parameter injection
const buildFilterString = (userId: string, serverFilters: ServerFilters): string => {
  const filterParts: string[] = [];

  // Always filter by user for data isolation - use pb.filter() for security
  if (userId) {
    filterParts.push(pb.filter('user = {:userId}', { userId }));
  }

  if (serverFilters.status && serverFilters.status !== 'all') {
    filterParts.push(pb.filter('status = {:status}', { status: serverFilters.status }));
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
  if (serverFilters.includeMiniKits === false) {
    filterParts.push('kit_category != "mini"'); // Simple literal is fine here
  }

  // Include destashed filtering - exclude destashed projects unless specifically viewing destashed tab
  if (serverFilters.includeDestashed === false && serverFilters.status !== 'destashed') {
    filterParts.push('status != "destashed"');
  }

  // Include archived filtering - exclude archived projects unless specifically viewing archived tab
  if (serverFilters.includeArchived === false && serverFilters.status !== 'archived') {
    filterParts.push('status != "archived"');
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

const fetchProjects = async (
  params: ProjectQueryParams & { userId: string }
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

  // Enhanced debug logging to track query execution
  logger.debug('🚀 fetchProjects execution details:', {
    userId,
    queryParams: { filters, sortField, sortDirection, currentPage, pageSize },
    pbFilter,
    pbSort,
    requestKey,
    caller: new Error().stack?.split('\n')[1]?.trim(), // Get caller info
    timestamp: new Date().toISOString(),
  });

  // Use optimized query with minimal field selection and targeted relation expansion
  // Following PocketBase best practices: https://pocketbase.io/docs/api-records/#query-parameters
  const resultList = await pb.collection('projects').getList(currentPage, pageSize, {
    filter: pbFilter,
    sort: pbSort,
    // Expand relations - PocketBase returns full records, not individual fields
    expand: 'company,artist,project_tags_via_project.tag',
    // Select only essential fields for dashboard display (includes all fields used in transformation)
    fields:
      'id,title,status,user,image,width,height,drill_shape,kit_category,date_purchased,date_received,date_started,date_completed,total_diamonds,general_notes,source_url,updated,created,company,artist',
    // Enable request deduplication for performance
    requestKey,
  });

  const endTime = performance.now();
  logger.debug(
    `Query completed in ${Math.round(endTime - startTime)}ms - ${resultList.items.length} items`
  );

  const projectsData: Project[] = (
    resultList.items as ProjectsResponse<Record<string, unknown>>[]
  ).map(record => {
    const projectRecord = record;
    const recordExpand = record.expand as Record<string, unknown> | undefined;
    const projectTags = recordExpand?.['project_tags_via_project'];
    const tags = Array.isArray(projectTags)
      ? projectTags
          .map((pt: Record<string, unknown>) => {
            const ptExpand = pt.expand as Record<string, unknown>;
            if (ptExpand?.tag) {
              const tag = ptExpand.tag as Record<string, unknown>;
              return {
                id: tag.id as string,
                userId: tag.user as string,
                name: tag.name as string,
                slug: tag.slug as string,
                color: tag.color as string,
                createdAt: tag.created as string,
                updatedAt: tag.updated as string,
              };
            }
            return null;
          })
          .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
      : [];

    return {
      id: projectRecord.id as string,
      userId: projectRecord.user as string,
      title: projectRecord.title as string,
      company:
        typeof recordExpand?.company === 'object' &&
        recordExpand.company &&
        'name' in recordExpand.company
          ? String(recordExpand.company.name)
          : undefined,
      artist:
        typeof recordExpand?.artist === 'object' &&
        recordExpand.artist &&
        'name' in recordExpand.artist
          ? String(recordExpand.artist.name)
          : undefined,
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

  // Log all project statuses returned from server for debugging
  logger.debug(
    '[Debug] Project statuses from server:',
    projectsData.map(p => ({ id: p.id, status: p.status, title: p.title }))
  );

  logger.info(`Projects fetched: ${projectsData.length} of ${resultList.totalItems}`);

  return {
    projects: projectsData,
    totalItems: resultList.totalItems,
    totalPages: resultList.totalPages,
  };
};

export const useProjects = ({
  userId,
  filters,
  sortField,
  sortDirection,
  currentPage,
  pageSize,
  enabled = true,
}: UseProjectsParams) => {
  const queryClient = useQueryClient();

  // Memoize query parameters to prevent unnecessary re-computations
  const queryParams: ProjectQueryParams = useMemo(
    () => ({
      filters,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
    }),
    [filters, sortField, sortDirection, currentPage, pageSize]
  );

  // Debug logging to trace query execution with render counting
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  logger.debug('🔄 useProjects called', {
    userId,
    status: filters.status,
    queryKey: queryKeys.projects.list(userId || '', queryParams),
    enabled: !!userId && enabled,
    initializationGated: !enabled,
    caller: new Error().stack?.split('\n')[1]?.trim(), // Get caller info for debugging
    fullQueryParams: queryParams,
    renderCount: renderCountRef.current,
  });

  // Warn about excessive re-renders
  if (renderCountRef.current > 5) {
    logger.warn('🚨 useProjects excessive re-renders detected:', {
      renderCount: renderCountRef.current,
      userId,
      status: filters.status,
      queryKey: queryKeys.projects.list(userId || '', queryParams),
      caller: new Error().stack?.split('\n')[1]?.trim(),
    });
  }

  const query = useQuery({
    queryKey: queryKeys.projects.list(userId || '', queryParams),
    queryFn: () => fetchProjects({ userId: userId!, ...queryParams }),
    enabled: !!userId && enabled, // Only run when userId is available AND hook is enabled
    staleTime: 2 * 60 * 1000, // 2 minutes (increased from 30 seconds)
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    // Prevent blinking by keeping previous data while fetching new data
    placeholderData: previousData => previousData,
    // Alternative to placeholderData - keeps previous data during refetches
    refetchOnWindowFocus: false, // Reduce unnecessary refetches that cause blinking
    refetchOnReconnect: false, // Reduce blinking on reconnect
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

  // Prefetch next page for better UX
  useEffect(() => {
    if (
      userId &&
      query.data?.totalPages &&
      currentPage < query.data.totalPages &&
      !query.isPlaceholderData
    ) {
      const nextPageParams: ProjectQueryParams = {
        ...queryParams,
        currentPage: currentPage + 1,
      };

      queryClient.prefetchQuery({
        queryKey: queryKeys.projects.list(userId, nextPageParams),
        queryFn: () => fetchProjects({ userId, ...nextPageParams }),
        staleTime: 2 * 60 * 1000, // Same as main query
      });

      logger.debug('🔄 Prefetched next page:', currentPage + 1);
    }
  }, [
    userId,
    query.data?.totalPages,
    currentPage,
    query.isPlaceholderData,
    queryParams,
    queryClient,
  ]);

  return query;
};
