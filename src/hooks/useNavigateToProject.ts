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
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useNavigateToProject');

// Simplified navigation context for basic functionality
export interface NavigationContext {
  timestamp: number;
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

  return useCallback(
    (projectId: string, options: NavigateToProjectOptions = {}): NavigationResult => {
      const { replace = false, projectData, successMessage, showLoadingFeedback } = options;

      try {
        logger.debug('Navigating to project', {
          projectId,
          replace,
          hasProjectData: !!projectData,
          hasSuccessMessage: !!successMessage,
          showLoadingFeedback,
        });

        // Show success message if provided
        if (successMessage) {
          logger.info(successMessage);
        }

        // Perform navigation
        navigate(`/projects/${projectId}`, { replace });

        // Return success result
        return {
          success: true,
          projectId,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown navigation error';
        logger.error('❌ Navigation failed:', { projectId, error: errorMessage });

        return {
          success: false,
          error: errorMessage,
          projectId,
        };
      }
    },
    [navigate]
  );
};

// Navigation options interface
interface NavigateToProjectEditOptions {
  replace?: boolean;
  state?: Record<string, unknown>;
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
