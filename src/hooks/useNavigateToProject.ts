/**
 * @fileoverview Simplified Project Navigation Hooks
 *
 * This module provides streamlined navigation utilities for moving between
 * project-related pages. The hooks handle routing to project detail and edit
 * pages with optional navigation options and logging.
 *
 * Key Features:
 * - Simple project detail navigation
 * - Project edit page navigation
 * - Optional replace navigation mode
 * - Debug logging for navigation tracking
 * - Backward compatibility with legacy navigation context
 *
 * Navigation Hooks:
 * - useNavigateToProject: Navigate to project detail page
 * - useNavigateToProjectEdit: Navigate to project edit page
 * - createNavigationContext: Create minimal context for compatibility
 *
 * Usage Examples:
 * ```typescript
 * const navigateToProject = useNavigateToProject();
 * const navigateToEdit = useNavigateToProjectEdit();
 *
 * // Navigate to project detail
 * const result = navigateToProject('project-id');
 * if (!result.success) {
 *   console.error('Navigation failed:', result.error);
 * }
 *
 * // Navigate with replace mode and success message
 * const result = navigateToProject('project-id', {
 *   replace: true,
 *   successMessage: 'Project loaded successfully!'
 * });
 *
 * // Navigate to edit page
 * navigateToEdit('project-id');
 * ```
 *
 * @author serabi
 * @since 2025-07-03
 * @version 1.0.0 - Simplified navigation system
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useNavigateToProject');

// Simplified navigation context for basic functionality
export interface NavigationContext {
  timestamp: number;
  preservationContext?: {
    scrollPosition?: number;
    timestamp?: number;
    editedProjectId?: string;
    isEditNavigation?: boolean;
    preEditPosition?: {
      index: number;
      page: number;
      totalItems: number;
    };
  };
  currentPage?: number;
}

// Navigation result interface
export interface NavigationResult {
  success: boolean;
  error?: string;
  projectId?: string;
}

// Enhanced navigation options to support all expected properties
interface NavigateToProjectOptions {
  replace?: boolean;
  projectData?: Record<string, unknown>;
  successMessage?: string;
  showLoadingFeedback?: boolean;
}

/**
 * Hook for navigating to project pages with proper result handling.
 * Returns NavigationResult to support error handling and success tracking.
 */
export const useNavigateToProject = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  return useCallback(
    (projectId: string, options: NavigateToProjectOptions = {}): NavigationResult => {
      const { replace = false, projectData, successMessage, showLoadingFeedback } = options;

      try {
        logger.debug('🧭 Navigating to project', {
          projectId,
          replace,
          hasProjectData: !!projectData,
          hasSuccessMessage: !!successMessage,
          showLoadingFeedback,
        });

        // Show success message if provided
        if (successMessage) {
          logger.info('📢 Showing success message:', successMessage);
          toast({
            title: 'Success',
            description: successMessage,
            variant: 'default',
          });
        }

        // Create navigation state with optimistic data
        const navigationState = {
          fromNavigation: true,
          projectId,
          projectData,
          timestamp: Date.now(),
        };

        // Perform navigation with optimistic state
        logger.debug('🚀 Executing navigation to project detail', {
          path: `/projects/${projectId}`,
          replace,
          hasOptimisticData: !!projectData,
          currentLocation: window.location.pathname,
        });

        // Log the current URL before navigation for debugging
        const beforeNavigation = {
          currentUrl: window.location.href,
          currentPathname: window.location.pathname,
          targetPath: `/projects/${projectId}`,
          timestamp: Date.now(),
        };

        logger.debug('Navigation context before execute:', beforeNavigation);

        // Force navigation by using window.location if replace is true and we're coming from /projects/new
        if (replace && window.location.pathname === '/projects/new') {
          logger.debug('🔄 Using window.location.replace for reliable navigation from form');
          window.location.replace(`/projects/${projectId}`);
          // Return immediately since window.location.replace will reload the page
          return {
            success: true,
            projectId,
          };
        } else {
          logger.debug('🧭 Using React Router navigate function');
          navigate(`/projects/${projectId}`, {
            replace,
            state: navigationState,
          });
        }

        // Add verification to check if navigation actually happened
        setTimeout(() => {
          const afterNavigation = {
            currentUrl: window.location.href,
            currentPathname: window.location.pathname,
            expectedPath: `/projects/${projectId}`,
            navigationSuccess: window.location.pathname === `/projects/${projectId}`,
            timestamp: Date.now(),
          };

          logger.debug('Navigation verification:', afterNavigation);

          if (!afterNavigation.navigationSuccess) {
            logger.error('❌ Navigation verification failed - URL did not change as expected', {
              expected: `/projects/${projectId}`,
              actual: window.location.pathname,
              beforeNavigation,
              afterNavigation,
              userAgent: navigator.userAgent,
              browserInfo: {
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                language: navigator.language,
              },
            });

            // Attempt a fallback navigation
            logger.debug('Attempting fallback navigation via window.location');
            try {
              window.location.href = `/projects/${projectId}`;
            } catch (fallbackError) {
              logger.error('❌ Fallback navigation failed:', fallbackError);
            }
          } else {
            logger.info('✅ Navigation verification successful - URL changed as expected');
          }
        }, 150); // Slightly longer delay for verification

        logger.info('✅ Navigation executed successfully', {
          projectId,
          path: `/projects/${projectId}`,
        });

        // Return success result
        return {
          success: true,
          projectId,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown navigation error';
        logger.error('❌ Navigation failed:', { projectId, error: errorMessage });

        // Show error toast for navigation failures
        toast({
          title: 'Navigation Error',
          description: 'Unable to navigate to project. Please try again.',
          variant: 'destructive',
        });

        return {
          success: false,
          error: errorMessage,
          projectId,
        };
      }
    },
    [navigate, toast]
  );
};

// Navigation options interface
interface NavigateToProjectEditOptions {
  replace?: boolean;
  state?: Record<string, unknown>;
  navigationContext?: NavigationContext;
}

// Simple navigation to project edit page
export const useNavigateToProjectEdit = () => {
  const navigate = useNavigate();

  return useCallback(
    (projectId: string, options: NavigateToProjectEditOptions = {}) => {
      const { replace = false, state } = options;

      logger.debug('Navigating to project edit', { projectId, replace, state });

      navigate(`/projects/${projectId}/edit`, { replace, state });
    },
    [navigate]
  );
};

// Simple helper for backward compatibility (no longer creates complex context)
export const createNavigationContext = (): NavigationContext => ({
  timestamp: Date.now(),
});
