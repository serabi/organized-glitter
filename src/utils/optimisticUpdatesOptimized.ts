/**
 * Simplified optimistic updates
 *
 * - Only updates projects cache (not stats cache)
 * - Stats are automatically recalculated from projects data
 *
 * @author @serabi
 * @created 2025-08-01
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { createLogger } from '@/utils/logger';
import { ProjectForStats } from '@/hooks/queries/useProjectsForStats';

const logger = createLogger('optimisticUpdatesOptimized');

/**
 * Interface for mutation context containing previous cache snapshots
 */
export interface OptimisticProjectsContext {
  previousProjects?: ProjectForStats[];
}

/**
 * Optimistically update a project's status in the projects cache
 *
 * This is dramatically simplified compared to the old approach:
 * - Only updates projects cache (not separate stats cache)
 * - Stats are automatically recalculated via useMemo
 * - No database table updates needed
 * - Immediate UI feedback with eventual consistency
 *
 * @param queryClient - TanStack Query client instance
 * @param userId - User ID for cache key generation
 * @param projectId - ID of the project being updated
 * @param newStatus - New project status
 * @returns Previous projects data for rollback purposes
 */
export const updateProjectStatusOptimistic = (
  queryClient: QueryClient,
  userId: string,
  projectId: string,
  newStatus: string
): ProjectForStats[] | undefined => {
  logger.debug('🚀 [OPTIMIZED] Updating project status optimistically', {
    userId,
    projectId,
    newStatus,
  });

  const cacheKey = queryKeys.projects.forStats(userId);

  // Get previous projects data for rollback
  const previousProjects = queryClient.getQueryData<ProjectForStats[]>(cacheKey);

  if (!previousProjects) {
    logger.debug('No previous projects data found for optimistic update');
    return undefined;
  }

  // Update projects cache optimistically
  queryClient.setQueryData<ProjectForStats[]>(cacheKey, oldProjects => {
    if (!oldProjects) {
      return oldProjects;
    }

    return oldProjects.map(project => {
      if (project.id === projectId) {
        logger.debug(
          `📊 [OPTIMIZED] Updated project ${projectId} status: ${project.status} → ${newStatus}`
        );
        return {
          ...project,
          status: newStatus,
        };
      }
      return project;
    });
  });

  logger.debug('✅ [OPTIMIZED] Optimistic project update completed', {
    userId,
    projectId,
    newStatus,
    performance: 'Stats will be recalculated automatically via useMemo',
  });

  return previousProjects;
};

/**
 * Optimistically add a new project to the projects cache
 *
 * @param queryClient - TanStack Query client instance
 * @param userId - User ID for cache key generation
 * @param project - New project data (minimal fields only)
 * @returns Previous projects data for rollback purposes
 */
export const addProjectOptimistic = (
  queryClient: QueryClient,
  userId: string,
  project: ProjectForStats
): ProjectForStats[] | undefined => {
  logger.debug('🚀 [OPTIMIZED] Adding project optimistically', {
    userId,
    projectId: project.id,
    status: project.status,
  });

  const cacheKey = queryKeys.projects.forStats(userId);

  // Get previous projects data for rollback
  const previousProjects = queryClient.getQueryData<ProjectForStats[]>(cacheKey);

  // Update projects cache optimistically
  queryClient.setQueryData<ProjectForStats[]>(cacheKey, oldProjects => {
    if (!oldProjects) {
      return [project];
    }

    // Add the new project to the beginning of the array
    return [project, ...oldProjects];
  });

  logger.debug('✅ [OPTIMIZED] Optimistic project addition completed', {
    userId,
    projectId: project.id,
    status: project.status,
  });

  return previousProjects;
};

/**
 * Optimistically remove a project from the projects cache
 *
 * @param queryClient - TanStack Query client instance
 * @param userId - User ID for cache key generation
 * @param projectId - ID of the project being deleted
 * @returns Previous projects data for rollback purposes
 */
export const removeProjectOptimistic = (
  queryClient: QueryClient,
  userId: string,
  projectId: string
): ProjectForStats[] | undefined => {
  logger.debug('🚀 [OPTIMIZED] Removing project optimistically', {
    userId,
    projectId,
  });

  const cacheKey = queryKeys.projects.forStats(userId);

  // Get previous projects data for rollback
  const previousProjects = queryClient.getQueryData<ProjectForStats[]>(cacheKey);

  if (!previousProjects) {
    logger.debug('No previous projects data found for optimistic removal');
    return undefined;
  }

  // Update projects cache optimistically
  queryClient.setQueryData<ProjectForStats[]>(cacheKey, oldProjects => {
    if (!oldProjects) {
      return oldProjects;
    }

    const filteredProjects = oldProjects.filter(project => project.id !== projectId);
    logger.debug(`📊 [OPTIMIZED] Removed project ${projectId} from cache`);
    return filteredProjects;
  });

  logger.debug('✅ [OPTIMIZED] Optimistic project removal completed', {
    userId,
    projectId,
  });

  return previousProjects;
};

/**
 * Rollback optimistic projects cache updates when mutation fails
 *
 * @param queryClient - TanStack Query client instance
 * @param userId - User ID for cache key generation
 * @param previousProjects - Previous projects data to restore
 */
export const rollbackProjectsOptimistic = (
  queryClient: QueryClient,
  userId: string,
  previousProjects?: ProjectForStats[]
): void => {
  if (!previousProjects) {
    logger.debug('No previous projects data to rollback', { userId });
    return;
  }

  logger.debug('🔄 [OPTIMIZED] Rolling back optimistic projects cache', { userId });

  const cacheKey = queryKeys.projects.forStats(userId);
  queryClient.setQueryData<ProjectForStats[]>(cacheKey, previousProjects);

  logger.debug('✅ [OPTIMIZED] Projects cache rollback completed', { userId });
};

/**
 * Invalidate projects cache for eventual consistency
 * This is much simpler than the old approach - only one cache to invalidate
 *
 * @param queryClient - TanStack Query client instance
 * @param userId - User ID for cache key generation
 */
export const invalidateProjectsCache = (queryClient: QueryClient, userId: string): void => {
  logger.debug('🔄 [OPTIMIZED] Invalidating projects cache for eventual consistency', { userId });

  const cacheKey = queryKeys.projects.forStats(userId);
  queryClient.invalidateQueries({
    queryKey: cacheKey,
    exact: true,
  });

  logger.debug('✅ [OPTIMIZED] Projects cache invalidation completed', {
    userId,
    performance: 'Stats will be recalculated automatically from fresh data',
  });
};

/**
 * Helper to extract minimal project data from full project object
 * Useful when creating optimistic updates from full project mutations
 */
export const extractProjectForStats = (project: {
  id: string;
  status: string;
  userId?: string;
  user?: string;
}): ProjectForStats => ({
  id: project.id,
  status: project.status,
  user: project.userId || project.user || '',
});

/**
 * Batch update multiple projects optimistically
 * Useful for bulk operations
 */
export const batchUpdateProjectsOptimistic = (
  queryClient: QueryClient,
  userId: string,
  updates: Array<{ projectId: string; newStatus: string }>
): ProjectForStats[] | undefined => {
  logger.debug('🚀 [OPTIMIZED] Batch updating projects optimistically', {
    userId,
    updateCount: updates.length,
    updates,
  });

  const cacheKey = queryKeys.projects.forStats(userId);

  // Get previous projects data for rollback
  const previousProjects = queryClient.getQueryData<ProjectForStats[]>(cacheKey);

  if (!previousProjects) {
    logger.debug('No previous projects data found for optimistic batch update');
    return undefined;
  }

  // Create lookup map for O(1) performance
  const updateMap = new Map(updates.map(u => [u.projectId, u.newStatus]));

  // Update projects cache optimistically
  queryClient.setQueryData<ProjectForStats[]>(cacheKey, oldProjects => {
    if (!oldProjects) {
      return oldProjects;
    }

    return oldProjects.map(project => {
      const newStatus = updateMap.get(project.id);
      if (newStatus) {
        logger.debug(
          `📊 [OPTIMIZED] Batch updated project ${project.id} status: ${project.status} → ${newStatus}`
        );
        return {
          ...project,
          status: newStatus,
        };
      }
      return project;
    });
  });

  logger.debug('✅ [OPTIMIZED] Optimistic batch update completed', {
    userId,
    updateCount: updates.length,
  });

  return previousProjects;
};
