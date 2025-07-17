/**
 * Optimized status counts hook with client-side derivation fallback
 * Provides instant status counts by deriving from cached project data when available
 * @author @serabi
 * @created 2025-07-17
 */

import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { createLogger } from '@/utils/secureLogger';
import { StatusBreakdown } from '@/types/dashboard';
import { Project } from '@/types/project';
import { projectsService } from '@/services/pocketbase/projects.service';

const logger = createLogger('useOptimizedStatusCounts');

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
      const data = query.state.data as any;
      if (data && data.projects && Array.isArray(data.projects)) {
        data.projects.forEach((project: Project) => {
          allCachedProjects.set(project.id, project);
        });

        // Track the highest total items count we've seen
        if (data.totalItems && data.totalItems > maxTotalItems) {
          maxTotalItems = data.totalItems;
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

  // Server query fallback (using existing service)
  const serverQuery = useMemo(() => {
    if (derivedCounts !== null) {
      // We have derived counts, no need for server query
      return { data: null, isLoading: false, error: null };
    }

    // This would integrate with existing server query logic
    // For now, we'll return a placeholder that indicates server query is needed
    logger.debug('Cache derivation not possible, server query needed:', {
      reason: !cacheAnalysis.canDerive ? 'insufficient-cache' : 'forced-query',
      cachedProjectCount: cacheAnalysis.totalCached,
    });

    return { data: null, isLoading: true, error: null };
  }, [derivedCounts, cacheAnalysis]);

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

    if (serverQuery.isLoading) {
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
      statusCounts: serverQuery.data,
      isLoading: false,
      error: null,
      source: 'server-query',
      cacheHitRate,
    };
  }, [derivedCounts, serverQuery, cacheHitRate]);

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
