import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, ProjectsResponse } from '@/types/pocketbase.types';
import { queryKeys } from './queries/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/utils/secureLogger';
import { DashboardFiltersContextValue } from '@/contexts/DashboardFiltersContext';

const logger = createLogger('useNavigateToProject');

export interface NavigationContext {
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
  sortField: string;
  sortDirection: string;
  currentPage: number;
  pageSize: number;
  preservationContext?: {
    scrollPosition: number;
    timestamp: number;
    /** ID of the project being edited for position tracking */
    editedProjectId?: string;
    /** Original position of the project before edit for restoration */
    preEditPosition?: {
      index: number;
      page: number;
      totalItems: number;
    };
    /** Whether this navigation was for editing purposes */
    isEditNavigation?: boolean;
  };
}

interface NavigateToProjectOptions {
  /** Replace current history entry instead of pushing new one */
  replace?: boolean;
  /** Data to pre-warm the cache with before navigation */
  projectData?: ProjectsResponse;
  /** Maximum retry attempts for navigation verification */
  maxRetries?: number;
  /** Custom success message */
  successMessage?: string;
  /** Whether to show loading feedback during verification */
  showLoadingFeedback?: boolean;
  /** Navigation context for sibling navigation and position preservation */
  navigationContext?: NavigationContext | null;
}

interface NavigationResult {
  success: boolean;
  error?: string;
}

/**
 * Universal hook for navigating to project pages with proper React Router integration.
 *
 * This hook replaces window.location.href usage and provides:
 * - Optimistic navigation with React Router
 * - Cache pre-warming for smooth loading
 * - Retry logic for network issues
 * - Proper error handling and fallbacks
 * - Loading state management
 *
 * Usage:
 * ```ts
 * const navigateToProject = useNavigateToProject();
 *
 * // Basic navigation
 * await navigateToProject('project-id');
 *
 * // Navigation with pre-warmed cache
 * await navigateToProject('project-id', {
 *   projectData: newProjectData,
 *   successMessage: 'Project created successfully!'
 * });
 * ```
 */
export const useNavigateToProject = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const navigateToProject = useCallback(
    async (
      projectId: string,
      options: NavigateToProjectOptions = {}
    ): Promise<NavigationResult> => {
      const {
        replace = false,
        projectData,
        maxRetries = 2,
        successMessage,
        showLoadingFeedback = true,
        navigationContext,
      } = options;

      logger.info(`🎯 Starting navigation to project ${projectId}`);

      try {
        // Step 1: Pre-warm cache if project data is provided
        if (projectData) {
          logger.debug('🔥 Pre-warming cache with project data');
          queryClient.setQueryData(queryKeys.projects.detail(projectId), projectData);
        }

        // Step 2: Optimistic navigation using React Router location state
        const targetPath = `/projects/${projectId}`;
        const navigationState = {
          fromNavigation: true,
          projectId,
          timestamp: Date.now(),
          // Include project data in state for immediate rendering
          projectData: projectData || null,
          // Include navigation context for sibling navigation and position preservation
          navigationContext: navigationContext || null,
        };

        logger.debug(`🚀 Initiating React Router navigation to: ${targetPath}`);

        // Navigate using React Router
        navigate(targetPath, {
          replace,
          state: navigationState,
        });

        // Wait for navigation to complete and context to propagate
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify that navigation actually happened
        if (import.meta.env.DEV) {
          const currentBrowserPath = window.location.pathname;
          if (currentBrowserPath === targetPath) {
            logger.info('✅ Browser URL updated correctly to:', currentBrowserPath);
          } else {
            logger.warn('⚠️ Browser URL mismatch:', {
              expected: targetPath,
              actual: currentBrowserPath,
              timestamp: Date.now(),
            });
          }
        }

        // Additional wait for React Router context to fully synchronize
        // This prevents race conditions with cache invalidation operations
        await new Promise(resolve => setTimeout(resolve, 50));

        // Step 3: Background verification (non-blocking)
        // This runs after navigation to ensure data consistency
        const performBackgroundVerification = async (attempt = 1): Promise<void> => {
          try {
            logger.debug(`🔍 Background verification attempt ${attempt}/${maxRetries + 1}`);

            await pb.collection(Collections.Projects).getOne(projectId, {
              requestKey: `bg-verify-${projectId}-${Date.now()}`,
            });

            logger.info('✅ Background verification successful');

            // Show success message if provided
            if (successMessage && showLoadingFeedback) {
              toast({
                title: 'Success',
                description: successMessage,
              });
            }
          } catch (verificationError) {
            logger.warn(
              `❌ Background verification failed (attempt ${attempt}):`,
              verificationError
            );

            if (attempt <= maxRetries) {
              // Retry with exponential backoff, but don't block navigation
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              setTimeout(() => performBackgroundVerification(attempt + 1), delay);
            } else {
              logger.error('❌ Background verification exceeded max retries');

              // Only show error if we're still on the project page
              if (window.location.pathname === targetPath) {
                toast({
                  title: 'Loading Issue',
                  description:
                    'There may be an issue loading the latest project data. Please refresh if needed.',
                  variant: 'default',
                });
              }
            }
          }
        };

        // Start background verification (non-blocking)
        performBackgroundVerification();

        logger.info('✅ Navigation initiated successfully');
        return { success: true };
      } catch (navigationError) {
        logger.error('❌ Navigation failed:', navigationError);

        // Fallback navigation strategies
        try {
          logger.info('🔄 Attempting fallback navigation to dashboard');

          navigate('/dashboard', { replace: true });

          toast({
            title: 'Navigation Issue',
            description: 'Redirected to dashboard. Please try accessing the project from there.',
            variant: 'default',
          });

          return { success: false, error: 'Navigation failed, redirected to dashboard' };
        } catch (fallbackError) {
          logger.error('❌ Fallback navigation also failed:', fallbackError);

          toast({
            title: 'Navigation Error',
            description: 'Unable to navigate. Please refresh the page.',
            variant: 'destructive',
          });

          return { success: false, error: 'All navigation attempts failed' };
        }
      }
    },
    [navigate, queryClient, toast]
  );

  return navigateToProject;
};

/**
 * Hook for navigating to project edit page
 */
export const useNavigateToProjectEdit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const logger = createLogger('useNavigateToProjectEdit');

  const navigateToProjectEdit = useCallback(
    async (
      projectId: string,
      options: Omit<NavigateToProjectOptions, 'projectData'> = {}
    ): Promise<NavigationResult> => {
      const { replace = false, navigationContext } = options;

      try {
        logger.info(`🎯 Navigating to edit project ${projectId}`);

        const targetPath = `/projects/${projectId}/edit`;
        navigate(targetPath, {
          replace,
          state: {
            fromNavigation: true,
            projectId,
            timestamp: Date.now(),
            // Include navigation context for returning to proper position
            navigationContext: navigationContext || null,
          },
        });

        logger.info('✅ Edit navigation successful');
        return { success: true };
      } catch (error) {
        logger.error('❌ Edit navigation failed:', error);

        toast({
          title: 'Navigation Error',
          description: 'Unable to navigate to edit page.',
          variant: 'destructive',
        });

        return { success: false, error: 'Edit navigation failed' };
      }
    },
    [navigate, toast]
  );

  return navigateToProjectEdit;
};

export interface CreateNavigationContextOptions {
  /** ID of the project being edited for position tracking */
  editedProjectId?: string;
  /** Whether this navigation is for editing purposes */
  isEditNavigation?: boolean;
}

/**
 * Helper function to create navigation context from dashboard filters context.
 * This preserves the user's current dashboard state for sibling navigation and edit workflows.
 */
export const createNavigationContext = (
  dashboardContext?: DashboardFiltersContextValue,
  options?: CreateNavigationContextOptions
): NavigationContext | null => {
  if (!dashboardContext) {
    return null;
  }

  // Calculate pre-edit position if editing a project
  let preEditPosition;
  if (options?.editedProjectId && options?.isEditNavigation) {
    const projects = dashboardContext.processedAndPaginatedProjects || [];
    const projectIndex = projects.findIndex(p => p.id === options.editedProjectId);
    
    if (projectIndex !== -1) {
      preEditPosition = {
        index: projectIndex,
        page: dashboardContext.currentPage,
        totalItems: dashboardContext.totalItems,
      };
      logger.debug(`Storing pre-edit position for project ${options.editedProjectId}:`, preEditPosition);
    }
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
      editedProjectId: options?.editedProjectId,
      preEditPosition,
      isEditNavigation: options?.isEditNavigation,
    },
  };
};
