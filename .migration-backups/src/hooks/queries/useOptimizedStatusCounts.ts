/**
 * Optimized status counts hook with client-side derivation fallback
 * Provides instant status counts by deriving from cached project data when available
 * @author @serabi
 * @created 2025-07-17
 */

import { useMemo, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { createLogger } from '@/utils/secureLogger';
import { StatusBreakdown } from '@/types/dashboard';
import { Project } from '@/types/project';
import { projectsService } from '@/services/pocketbase/projects.service';
import { ProjectFilters } from '@/types/projectFilters';

const logger = createLogger('useOptimizedStatusCounts');

/**
 * Result from extracting projects from various data structures
 */
interface ExtractedProjectData {
  projects: Project[];
  totalItems: number;
}

/**
 * Extract projects and metadata from various cached query data structures
 */
const extractProjectsFromQueryData = (data: unknown): ExtractedProjectData => {
  // Handle null/undefined
  if (!data) {
    return { projects: [], totalItems: 0 };
  }

  // Case 1: Plain array of projects
  if (Array.isArray(data)) {
    logger.debug('Detected plain Project[] array structure');
    return { projects: data, totalItems: data.length };
  }

  // Type guard for object with projects
  const hasProjects = (obj: unknown): obj is { projects: Project[]; totalItems?: number } => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'projects' in obj &&
      Array.isArray((obj as Record<string, unknown>).projects)
    );
  };

  // Type guard for object with items
  const hasItems = (obj: unknown): obj is { items: Project[]; totalItems?: number } => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'items' in obj &&
      Array.isArray((obj as Record<string, unknown>).items)
    );
  };

  // Type guard for object with data
  const hasData = (obj: unknown): obj is { data: Project[]; totalItems?: number } => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'data' in obj &&
      Array.isArray((obj as Record<string, unknown>).data)
    );
  };

  // Case 2: Object with 'projects' property (current pattern)
  if (hasProjects(data)) {
    logger.debug('Detected {projects: Project[]} structure');
    return {
      projects: data.projects,
      totalItems: data.totalItems || data.projects.length,
    };
  }

  // Case 3: Object with 'items' property
  if (hasItems(data)) {
    logger.debug('Detected {items: Project[]} structure');
    return {
      projects: data.items,
      totalItems: data.totalItems || data.items.length,
    };
  }

  // Case 4: Object with 'data' property
  if (hasData(data)) {
    logger.debug('Detected {data: Project[]} structure');
    return {
      projects: data.data,
      totalItems: data.totalItems || data.data.length,
    };
  }

  // Fallback: log structure and return empty
  logger.warn('Unrecognized query data structure:', {
    dataType: typeof data,
    isArray: Array.isArray(data),
    keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'not-object',
    hasProjects: typeof data === 'object' && data !== null && 'projects' in data,
    hasItems: typeof data === 'object' && data !== null && 'items' in data,
    hasData: typeof data === 'object' && data !== null && 'data' in data,
  });

  return { projects: [], totalItems: 0 };
};

export interface OptimizedStatusCountsResult {
  statusCounts: StatusBreakdown | null;
  isLoading: boolean;
  error: Error | null;
  source: 'cache-derived' | 'server-query' | 'loading';
  cacheHitRate: number;
}

/**
 * Derive status counts from cached project data
 */
const deriveStatusCountsFromCache = (projects: Project[]): StatusBreakdown => {
  const counts: StatusBreakdown = {
    wishlist: 0,
    purchased: 0,
    stash: 0,
    progress: 0,
    completed: 0,
    archived: 0,
    destashed: 0,
  };

  projects.forEach(project => {
    const status = project.status as keyof StatusBreakdown;
    if (status && Object.prototype.hasOwnProperty.call(counts, status)) {
      counts[status]++;
    }
  });

  return counts;
};

/**
 * Check if we have sufficient cached project data to derive accurate counts
 */
const canDeriveFromCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string
): { canDerive: boolean; cachedProjects: Project[]; totalCached: number } => {
  try {
    // Look for any cached project list queries for this user
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    // Find project list queries for this user
    const projectQueries = queries.filter(
      query =>
        query.queryKey.includes('projects') &&
        query.queryKey.includes('list') &&
        query.queryKey.includes(userId) &&
        query.state.data
    );

    if (projectQueries.length === 0) {
      return { canDerive: false, cachedProjects: [], totalCached: 0 };
    }

    // Aggregate all cached projects (avoiding duplicates)
    const allCachedProjects = new Map<string, Project>();
    let maxTotalItems = 0;

    projectQueries.forEach(query => {
      const data = query.state.data as unknown;
      const extracted = extractProjectsFromQueryData(data);

      if (extracted.projects.length > 0) {
        extracted.projects.forEach((project: Project) => {
          allCachedProjects.set(project.id, project);
        });

        // Track the highest total items count we've seen
        if (extracted.totalItems > maxTotalItems) {
          maxTotalItems = extracted.totalItems;
        }
      }
    });

    const cachedProjects = Array.from(allCachedProjects.values());
    const cacheCompleteness = cachedProjects.length / Math.max(maxTotalItems, 1);

    // We can derive if we have at least 80% of the total projects cached
    // This provides reasonable accuracy while avoiding unnecessary server queries
    const canDerive = cacheCompleteness >= 0.8 && cachedProjects.length > 50;

    logger.debug('Cache derivation analysis:', {
      cachedProjectCount: cachedProjects.length,
      estimatedTotal: maxTotalItems,
      cacheCompleteness: `${Math.round(cacheCompleteness * 100)}%`,
      canDerive,
      queryCount: projectQueries.length,
    });

    return {
      canDerive,
      cachedProjects,
      totalCached: cachedProjects.length,
    };
  } catch (error) {
    logger.error('Error analyzing cache for derivation:', error);
    return { canDerive: false, cachedProjects: [], totalCached: 0 };
  }
};

/**
 * Optimized status counts hook that uses client-side derivation when possible
 */
export const useOptimizedStatusCounts = (
  userId: string,
  forceServerQuery: boolean = false
): OptimizedStatusCountsResult => {
  const queryClient = useQueryClient();

  // Analyze cache for derivation potential
  const cacheAnalysis = useMemo(() => {
    if (forceServerQuery || !userId) {
      return { canDerive: false, cachedProjects: [], totalCached: 0 };
    }
    return canDeriveFromCache(queryClient, userId);
  }, [queryClient, userId, forceServerQuery]);

  // Derive counts from cache if possible
  const derivedCounts = useMemo(() => {
    if (!cacheAnalysis.canDerive) {
      return null;
    }

    const startTime = performance.now();
    const counts = deriveStatusCountsFromCache(cacheAnalysis.cachedProjects);
    const derivationTime = performance.now() - startTime;

    logger.info('✅ Status counts derived from cache', {
      derivationTime: `${Math.round(derivationTime)}ms`,
      projectsAnalyzed: cacheAnalysis.cachedProjects.length,
      statusBreakdown: counts,
      source: 'cache-derived',
      performance: derivationTime < 10 ? 'excellent' : 'good',
    });

    return counts;
  }, [cacheAnalysis]);

  // Server query fallback using React Query
  const serverQuery = useQuery({
    queryKey: queryKeys.stats.overview(userId),
    queryFn: async () => {
      logger.debug('🌐 Executing server query for status counts', {
        reason: !cacheAnalysis.canDerive ? 'insufficient-cache' : 'forced-query',
        cachedProjectCount: cacheAnalysis.totalCached,
      });

      const filters: ProjectFilters = { userId };
      const result = await projectsService.getOptimizedStatusCounts(filters);

      logger.info('✅ Server status counts fetched successfully', {
        counts: result.counts,
        total: result.total,
        queryDuration: result.queryDuration,
        source: 'server-query',
      });

      return result.counts;
    },
    enabled: derivedCounts === null && !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - reasonable for status counts
    gcTime: 5 * 60 * 1000, // 5 minutes cache retention
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Calculate cache hit rate for monitoring
  const cacheHitRate = useMemo(() => {
    return derivedCounts !== null ? 1.0 : 0.0;
  }, [derivedCounts]);

  // Determine result source and loading state
  const result: OptimizedStatusCountsResult = useMemo(() => {
    if (derivedCounts !== null) {
      return {
        statusCounts: derivedCounts,
        isLoading: false,
        error: null,
        source: 'cache-derived',
        cacheHitRate,
      };
    }

    if (serverQuery.isLoading || serverQuery.isFetching) {
      return {
        statusCounts: null,
        isLoading: true,
        error: null,
        source: 'loading',
        cacheHitRate,
      };
    }

    if (serverQuery.error) {
      return {
        statusCounts: null,
        isLoading: false,
        error: serverQuery.error as Error,
        source: 'server-query',
        cacheHitRate,
      };
    }

    return {
      statusCounts: serverQuery.data || null,
      isLoading: false,
      error: null,
      source: 'server-query',
      cacheHitRate,
    };
  }, [
    derivedCounts,
    serverQuery.isLoading,
    serverQuery.isFetching,
    serverQuery.error,
    serverQuery.data,
    cacheHitRate,
  ]);

  return result;
};

/**
 * Force refresh of status counts (bypasses cache derivation)
 */
export const useForceRefreshStatusCounts = () => {
  const queryClient = useQueryClient();

  return useCallback(
    async (userId: string) => {
      logger.info('🔄 Force refreshing status counts, bypassing cache derivation');

      // Invalidate all status count related queries
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats.overview(userId),
      });

      // Also invalidate project lists to ensure fresh data
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });
    },
    [queryClient]
  );
};
