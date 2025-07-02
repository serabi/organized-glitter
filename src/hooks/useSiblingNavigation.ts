import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Project } from '@/types/project';
import { queryKeys, ProjectQueryParams } from './queries/queryKeys';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { SortDirectionType, DashboardFiltersContextValue } from '@/contexts/DashboardFiltersContext';
import { ServerFilters } from './queries/useProjects';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useSiblingNavigation');

export interface SiblingNavigationOptions {
  currentProjectId: string;
  userId: string;
  dashboardContext?: DashboardFiltersContextValue;
}

export interface SiblingNavigationResult {
  previousProject: Project | null;
  nextProject: Project | null;
  hasPrevious: boolean;
  hasNext: boolean;
  currentIndex: number | null;
  totalProjects: number;
  isLoading: boolean;
}

/**
 * Hook for navigating between sibling projects while maintaining dashboard context.
 * 
 * This hook analyzes the current dashboard filter/sort context to determine
 * which projects come before and after the current project in the user's view.
 * 
 * Features:
 * - Maintains sort order from dashboard
 * - Preserves filter context 
 * - Uses cached data when available
 * - Handles edge cases (first/last project)
 * 
 * Usage:
 * ```ts
 * const { previousProject, nextProject, hasPrevious, hasNext } = useSiblingNavigation({
 *   currentProjectId: 'project-123',
 *   userId: 'user-456',
 *   dashboardContext
 * });
 * ```
 */
export const useSiblingNavigation = ({
  currentProjectId,
  userId,
  dashboardContext,
}: SiblingNavigationOptions): SiblingNavigationResult => {
  const queryClient = useQueryClient();

  // Extract filter context from dashboard or use defaults
  const filterContext = useMemo(() => {
    if (!dashboardContext) {
      // Default context when no dashboard filters available
      return {
        filters: {
          status: 'all' as const,
          company: 'all',
          artist: 'all',
          drillShape: 'all',
          yearFinished: 'all',
          includeMiniKits: true,
          searchTerm: '',
          selectedTags: [],
        } as ServerFilters,
        sortField: 'last_updated' as DashboardValidSortField,
        sortDirection: 'desc' as SortDirectionType,
        currentPage: 1,
        pageSize: 25,
      };
    }

    return {
      filters: {
        status: dashboardContext.activeStatus,
        company: dashboardContext.selectedCompany,
        artist: dashboardContext.selectedArtist,
        drillShape: dashboardContext.selectedDrillShape,
        yearFinished: dashboardContext.selectedYearFinished,
        includeMiniKits: dashboardContext.includeMiniKits,
        searchTerm: dashboardContext.searchTerm,
        selectedTags: dashboardContext.selectedTags,
      } as ServerFilters,
      sortField: dashboardContext.sortField,
      sortDirection: dashboardContext.sortDirection,
      currentPage: dashboardContext.currentPage,
      pageSize: dashboardContext.pageSize,
    };
  }, [dashboardContext]);

  // Memoize query parameters to match the cache key structure
  const queryParams: ProjectQueryParams = useMemo(
    () => ({
      filters: filterContext.filters,
      sortField: filterContext.sortField,
      sortDirection: filterContext.sortDirection,
      currentPage: filterContext.currentPage,
      pageSize: filterContext.pageSize,
    }),
    [filterContext]
  );

  // Analyze sibling projects from cached data
  const siblingAnalysis = useMemo(() => {
    if (!userId || !currentProjectId) {
      return {
        previousProject: null,
        nextProject: null,
        hasPrevious: false,
        hasNext: false,
        currentIndex: null,
        totalProjects: 0,
        isLoading: false,
      };
    }

    try {
      // Try to get data from cache using the same query key structure as useProjects
      const queryKey = queryKeys.projects.list(userId, queryParams);
      const cachedData = queryClient.getQueryData(queryKey) as {
        projects: Project[];
        totalItems: number;
        totalPages: number;
      } | undefined;

      if (!cachedData || !cachedData.projects) {
        logger.debug('No cached project data available for sibling navigation');
        return {
          previousProject: null,
          nextProject: null,
          hasPrevious: false,
          hasNext: false,
          currentIndex: null,
          totalProjects: 0,
          isLoading: true, // Indicate we're waiting for data
        };
      }

      const { projects, totalItems } = cachedData;
      
      // Find current project index in the filtered/sorted list
      const currentIndex = projects.findIndex(p => p.id === currentProjectId);
      
      if (currentIndex === -1) {
        logger.warn(`Current project ${currentProjectId} not found in cached project list`);
        return {
          previousProject: null,
          nextProject: null,
          hasPrevious: false,
          hasNext: false,
          currentIndex: null,
          totalProjects: totalItems,
          isLoading: false,
        };
      }

      // Determine previous and next projects
      const previousProject = currentIndex > 0 ? projects[currentIndex - 1] : null;
      const nextProject = currentIndex < projects.length - 1 ? projects[currentIndex + 1] : null;

      // Check if there are more projects beyond current page
      const hasPrevious = previousProject !== null || 
        (filterContext.currentPage > 1); // More projects on previous pages
      const hasNext = nextProject !== null || 
        (filterContext.currentPage < Math.ceil(totalItems / filterContext.pageSize)); // More projects on next pages

      logger.debug(`Sibling navigation analysis:`, {
        currentIndex,
        totalInPage: projects.length,
        totalItems,
        hasPrevious,
        hasNext,
        previousProjectId: previousProject?.id,
        nextProjectId: nextProject?.id,
      });

      return {
        previousProject,
        nextProject,
        hasPrevious,
        hasNext,
        currentIndex,
        totalProjects: totalItems,
        isLoading: false,
      };
    } catch (error) {
      logger.error('Error analyzing sibling projects:', error);
      return {
        previousProject: null,
        nextProject: null,
        hasPrevious: false,
        hasNext: false,
        currentIndex: null,
        totalProjects: 0,
        isLoading: false,
      };
    }
  }, [userId, currentProjectId, queryParams, queryClient, filterContext]);

  return siblingAnalysis;
};

/**
 * Hook for getting navigation context that can be passed to project detail pages
 * via location state. This preserves the user's dashboard context for sibling navigation.
 */
export const useNavigationContext = (dashboardContext?: DashboardFiltersContextValue) => {
  return useCallback(() => {
    if (!dashboardContext) {
      return null;
    }

    return {
      filters: {
        status: dashboardContext.activeStatus,
        company: dashboardContext.selectedCompany,
        artist: dashboardContext.selectedArtist,
        drillShape: dashboardContext.selectedDrillShape,
        yearFinished: dashboardContext.selectedYearFinished,
        includeMiniKits: dashboardContext.includeMiniKits,
        searchTerm: dashboardContext.searchTerm,
        selectedTags: dashboardContext.selectedTags,
      },
      sortField: dashboardContext.sortField,
      sortDirection: dashboardContext.sortDirection,
      currentPage: dashboardContext.currentPage,
      pageSize: dashboardContext.pageSize,
      preservationContext: {
        scrollPosition: window.scrollY,
        timestamp: Date.now(),
      },
    };
  }, [dashboardContext]);
};