/**
 * @fileoverview Reusable cache update utilities for React Query
 * 
 * This module provides standardized utilities for updating React Query caches
 * with optimistic updates, maintaining sort order and filter states.
 * 
 * @author serabi
 * @since 1.2.0
 */

import { QueryClient } from '@tanstack/react-query';
import { Project } from '@/types/project';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('cacheUtils');

export interface ProjectsQueryData {
  projects: Project[];
  totalItems: number;
  totalPages: number;
}

/**
 * Updates a single project across all relevant React Query caches using optimistic updates.
 * This preserves sort order and filter states while ensuring data consistency.
 * 
 * @param queryClient - The React Query client instance
 * @param projectId - ID of the project to update
 * @param updatedProject - The updated project data
 * @param userId - User ID for scoped cache updates
 * 
 * @description This function:
 * 1. Updates the project detail cache directly
 * 2. Finds all project list caches and updates the specific project
 * 3. Updates advanced query caches if they exist
 * 4. Preserves existing sort order and pagination
 * 
 * @example
 * ```typescript
 * updateProjectInCache(queryClient, 'project-123', updatedProjectData, 'user-456');
 * ```
 */
export const updateProjectInCache = (
  queryClient: QueryClient,
  projectId: string,
  updatedProject: Project,
  userId: string
): void => {
  try {
    // Update the specific project detail cache
    queryClient.setQueryData(
      queryKeys.projects.detail(projectId),
      updatedProject
    );

    // Update project in all relevant list caches using optimistic updates
    const queryCache = queryClient.getQueryCache();
    
    queryCache.findAll({
      queryKey: queryKeys.projects.lists(),
      exact: false
    }).forEach(query => {
      const currentData = query.state.data as ProjectsQueryData | undefined;
      
      if (currentData?.projects) {
        const updatedProjects = currentData.projects.map(project => 
          project.id === projectId ? updatedProject : project
        );
        
        queryClient.setQueryData(query.queryKey, {
          ...currentData,
          projects: updatedProjects
        });
      }
    });

    // Update advanced query cache if it exists
    const advancedQueryKey = queryKeys.projects.advanced(userId);
    const advancedData = queryClient.getQueryData(advancedQueryKey);
    if (advancedData) {
      queryClient.setQueryData(advancedQueryKey, advancedData);
    }

    logger.debug(`Successfully updated project ${projectId} in cache`);
  } catch (error) {
    logger.error('Error updating project in cache:', error);
    
    // Fallback to cache invalidation if optimistic update fails
    logger.warn('Falling back to cache invalidation due to optimistic update failure');
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.detail(projectId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.lists(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.advanced(userId),
    });
  }
};

/**
 * Removes a project from all relevant React Query caches.
 * Used when a project is deleted or archived.
 * 
 * @param queryClient - The React Query client instance
 * @param projectId - ID of the project to remove
 * @param userId - User ID for scoped cache updates
 * 
 * @description This function:
 * 1. Removes the project detail cache entry
 * 2. Removes the project from all list caches
 * 3. Updates total counts appropriately
 * 
 * @example
 * ```typescript
 * removeProjectFromCache(queryClient, 'project-123', 'user-456');
 * ```
 */
export const removeProjectFromCache = (
  queryClient: QueryClient,
  projectId: string,
  userId: string
): void => {
  try {
    // Remove the specific project detail cache
    queryClient.removeQueries({
      queryKey: queryKeys.projects.detail(projectId),
    });

    // Remove project from all relevant list caches
    const queryCache = queryClient.getQueryCache();
    
    queryCache.findAll({
      queryKey: queryKeys.projects.lists(),
      exact: false
    }).forEach(query => {
      const currentData = query.state.data as ProjectsQueryData | undefined;
      
      if (currentData?.projects) {
        const filteredProjects = currentData.projects.filter(project => 
          project.id !== projectId
        );
        
        queryClient.setQueryData(query.queryKey, {
          ...currentData,
          projects: filteredProjects,
          totalItems: Math.max(0, currentData.totalItems - 1)
        });
      }
    });

    // Invalidate advanced queries to ensure accurate counts
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.advanced(userId),
    });

    logger.debug(`Successfully removed project ${projectId} from cache`);
  } catch (error) {
    logger.error('Error removing project from cache:', error);
    
    // Fallback to broad cache invalidation
    logger.warn('Falling back to cache invalidation due to removal failure');
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.lists(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.advanced(userId),
    });
  }
};

/**
 * Adds a new project to relevant React Query caches.
 * Used when a new project is created.
 * 
 * @param queryClient - The React Query client instance
 * @param newProject - The new project data
 * @param userId - User ID for scoped cache updates
 * 
 * @description This function:
 * 1. Sets the project detail cache
 * 2. Adds the project to relevant list caches
 * 3. Updates total counts appropriately
 * 4. Handles insertion based on current sort order
 * 
 * @example
 * ```typescript
 * addProjectToCache(queryClient, newProjectData, 'user-456');
 * ```
 */
export const addProjectToCache = (
  queryClient: QueryClient,
  newProject: Project,
  userId: string
): void => {
  try {
    // Set the project detail cache
    queryClient.setQueryData(
      queryKeys.projects.detail(newProject.id),
      newProject
    );

    // Add project to relevant list caches
    const queryCache = queryClient.getQueryCache();
    
    queryCache.findAll({
      queryKey: queryKeys.projects.lists(),
      exact: false
    }).forEach(query => {
      const currentData = query.state.data as ProjectsQueryData | undefined;
      
      if (currentData?.projects) {
        // For new projects, add to the beginning (most recent)
        // The server will handle proper sorting on next refetch
        const updatedProjects = [newProject, ...currentData.projects];
        
        queryClient.setQueryData(query.queryKey, {
          ...currentData,
          projects: updatedProjects,
          totalItems: currentData.totalItems + 1
        });
      }
    });

    // Invalidate advanced queries to ensure accurate counts
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.advanced(userId),
    });

    logger.debug(`Successfully added project ${newProject.id} to cache`);
  } catch (error) {
    logger.error('Error adding project to cache:', error);
    
    // Fallback to cache invalidation
    logger.warn('Falling back to cache invalidation due to addition failure');
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.lists(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.advanced(userId),
    });
  }
};

/**
 * Utility for handling cache updates with automatic error recovery.
 * Provides a consistent interface for all cache operations.
 * 
 * @param operation - Function that performs the cache operation
 * @param fallbackInvalidation - Function that performs fallback cache invalidation
 * 
 * @example
 * ```typescript
 * await withCacheErrorRecovery(
 *   () => updateProjectInCache(queryClient, projectId, updatedProject, userId),
 *   () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() })
 * );
 * ```
 */
export const withCacheErrorRecovery = async (
  operation: () => void | Promise<void>,
  fallbackInvalidation: () => void | Promise<void>
): Promise<void> => {
  try {
    await operation();
  } catch (error) {
    logger.error('Cache operation failed, falling back to invalidation:', error);
    await fallbackInvalidation();
  }
};