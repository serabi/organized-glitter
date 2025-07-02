/**
 * @fileoverview Unified navigation context hook with modern React Query patterns
 * 
 * This hook provides a single source of truth for all navigation context resolution,
 * combining router state, database fallback, and sibling navigation analysis into
 * one unified interface. It follows React Query v5 best practices including:
 * 
 * - Custom hook composition pattern
 * - Select pattern for data transformation
 * - Smart memoization with useCallback
 * - Structural sharing for performance
 * - Context isolation for clean data sharing
 * 
 * Key Features:
 * - Zero code duplication between components
 * - Type-safe unified interface
 * - Automatic fallback resolution (router → database → default)
 * - Integrated sibling navigation analysis
 * - Performance optimized with React Query patterns
 * 
 * @author serabi
 * @since 2025-07-02
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigationFallback } from './queries/useNavigationFallback';
import { queryKeys, ProjectQueryParams } from './queries/queryKeys';
import { Project } from '@/types/project';
import { NavigationContext } from './useNavigateToProject';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { SortDirectionType } from '@/contexts/DashboardFiltersContext';
import { ServerFilters } from './queries/useProjects';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useUnifiedNavigationContext');

/**
 * Parameters for the unified navigation context hook
 */
export interface UseUnifiedNavigationContextParams {
  currentProjectId: string;
  userId: string | undefined;
}

/**
 * Unified navigation context interface that works for all components
 */
export interface UnifiedNavigationContext {
  filters: {
    status: string;
    company: string;
    artist: string;
    drillShape: string;
    yearFinished: string;
    includeMiniKits: boolean;
    searchTerm: string;
    selectedTags: string[];
  };
  sortField: DashboardValidSortField;
  sortDirection: SortDirectionType;
  currentPage: number;
  pageSize: number;
  preservationContext?: {
    scrollPosition: number;
    timestamp: number;
  };
}

/**
 * Sibling navigation result with project data
 */
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
 * Complete unified navigation context result
 */
export interface UnifiedNavigationContextResult {
  /** Resolved navigation context */
  navigationContext: UnifiedNavigationContext | null;
  /** Source of the navigation context */
  source: 'router' | 'database' | 'default';
  /** Sibling navigation data */
  sibling: SiblingNavigationResult;
  /** Whether fallback data is loading */
  isLoadingFallback: boolean;
  /** Fallback error if any */
  fallbackError: Error | null;
}

/**
 * Transforms NavigationContext (database format) to UnifiedNavigationContext
 */
const transformNavigationContext = (context: NavigationContext): UnifiedNavigationContext => {
  return {
    filters: {
      status: context.filters?.status || 'all',
      company: context.filters?.company || 'all',
      artist: context.filters?.artist || 'all',
      drillShape: context.filters?.drillShape || 'all',
      yearFinished: context.filters?.yearFinished || 'all',
      includeMiniKits: context.filters?.includeMiniKits ?? true,
      searchTerm: context.filters?.searchTerm || '',
      selectedTags: context.filters?.selectedTags || [],
    },
    sortField: (context.sortField || 'last_updated') as DashboardValidSortField,
    sortDirection: (context.sortDirection || 'desc') as SortDirectionType,
    currentPage: context.currentPage || 1,
    pageSize: context.pageSize || 25,
    preservationContext: context.preservationContext,
  };
};

/**
 * Creates default navigation context when none is available
 */
const createDefaultNavigationContext = (): UnifiedNavigationContext => {
  return {
    filters: {
      status: 'all',
      company: 'all',
      artist: 'all',
      drillShape: 'all',
      yearFinished: 'all',
      includeMiniKits: true,
      searchTerm: '',
      selectedTags: [],
    },
    sortField: 'last_updated',
    sortDirection: 'desc',
    currentPage: 1,
    pageSize: 25,
    preservationContext: {
      scrollPosition: 0,
      timestamp: Date.now(),
    },
  };
};

/**
 * Unified navigation context hook with modern React Query patterns
 * 
 * This hook provides complete navigation context resolution and sibling analysis
 * in a single, optimized interface. It follows React Query v5 best practices:
 * 
 * Resolution Priority:
 * 1. React Router state (normal dashboard navigation)
 * 2. Database fallback (direct URL access) 
 * 3. Default context (fallback for new users)
 * 
 * Features:
 * - Unified interface eliminates component-level data transformation
 * - Smart memoization prevents unnecessary re-computations
 * - Integrated sibling navigation reduces separate hook calls
 * - Type-safe with comprehensive error handling
 * - Performance optimized with structural sharing
 * 
 * @param params - Hook parameters
 * @returns Complete navigation context with sibling data
 * 
 * @example
 * ```tsx
 * const { navigationContext, sibling, source } = useUnifiedNavigationContext({
 *   currentProjectId: project.id,
 *   userId: user?.id,
 * });
 * 
 * // Navigation arrows condition becomes simple
 * {navigationContext && (
 *   <ProjectNavigationArrows
 *     currentProjectId={project.id}
 *     context={navigationContext}
 *     sibling={sibling}
 *   />
 * )}
 * 
 * // Debug info
 * console.log(`Navigation context from: ${source}`);
 * ```
 */
export const useUnifiedNavigationContext = ({
  currentProjectId,
  userId,
}: UseUnifiedNavigationContextParams): UnifiedNavigationContextResult => {
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Get database fallback with select transformation
  const { 
    navigationContext: fallbackContext, 
    isLoading: isLoadingFallback,
    error: fallbackError 
  } = useNavigationFallback({ 
    userId,
  });

  // Resolve navigation context with clear priority using useMemo for performance
  const resolvedContext = useMemo(() => {
    // Priority 1: React Router state (normal dashboard navigation)
    const routerContext = location.state?.navigationContext as NavigationContext | undefined;
    if (routerContext) {
      logger.debug('Using navigation context from React Router state');
      return {
        navigationContext: transformNavigationContext(routerContext),
        source: 'router' as const,
      };
    }
    
    // Priority 2: Database fallback (direct URL access)
    if (fallbackContext) {
      logger.debug('Using navigation context from database fallback');
      return {
        navigationContext: transformNavigationContext(fallbackContext),
        source: 'database' as const,
      };
    }
    
    // Priority 3: Default context (new users, no saved preferences)
    logger.debug('Using default navigation context');
    return {
      navigationContext: createDefaultNavigationContext(),
      source: 'default' as const,
    };
  }, [location.state?.navigationContext, fallbackContext]);

  // Convert unified context to query parameters for cache lookup
  const queryParams = useMemo((): ProjectQueryParams => {
    const context = resolvedContext.navigationContext;
    return {
      filters: {
        status: context.filters.status,
        company: context.filters.company,
        artist: context.filters.artist,
        drillShape: context.filters.drillShape,
        yearFinished: context.filters.yearFinished,
        includeMiniKits: context.filters.includeMiniKits,
        searchTerm: context.filters.searchTerm,
        selectedTags: context.filters.selectedTags,
      } as ServerFilters,
      sortField: context.sortField,
      sortDirection: context.sortDirection,
      currentPage: context.currentPage,
      pageSize: context.pageSize,
    };
  }, [resolvedContext.navigationContext]);

  // Analyze sibling navigation from cached data using React Query patterns
  const siblingAnalysis = useMemo((): SiblingNavigationResult => {
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
      // Get cached data using the same query key structure as useProjects
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
      const context = resolvedContext.navigationContext;
      
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
      const hasPrevious = previousProject !== null || (context.currentPage > 1);
      const hasNext = nextProject !== null || 
        (context.currentPage < Math.ceil(totalItems / context.pageSize));

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
  }, [userId, currentProjectId, queryParams, queryClient, resolvedContext.navigationContext]);

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Unified navigation context resolved:`, {
      source: resolvedContext.source,
      hasRouterState: !!location.state?.navigationContext,
      hasFallbackContext: !!fallbackContext,
      isLoadingFallback,
      fallbackError: fallbackError?.message,
      siblingNavigation: {
        hasPrevious: siblingAnalysis.hasPrevious,
        hasNext: siblingAnalysis.hasNext,
        currentIndex: siblingAnalysis.currentIndex,
        totalProjects: siblingAnalysis.totalProjects,
      },
    });
  }

  return {
    navigationContext: resolvedContext.navigationContext,
    source: resolvedContext.source,
    sibling: siblingAnalysis,
    isLoadingFallback,
    fallbackError,
  };
};