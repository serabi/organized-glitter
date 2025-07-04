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
 * navigateToProject('project-id');
 *
 * // Navigate with replace mode
 * navigateToProject('project-id', { replace: true });
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

// Simple navigation options
interface NavigateToProjectOptions {
  replace?: boolean;
}

/**
 * Simplified hook for navigating to project pages.
 * No more complex navigation context or arrow navigation support.
 */
export const useNavigateToProject = () => {
  const navigate = useNavigate();

  return useCallback(
    (projectId: string, options: NavigateToProjectOptions = {}) => {
      const { replace = false } = options;

      logger.debug('Navigating to project', { projectId, replace });

      navigate(`/projects/${projectId}`, { replace });
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
