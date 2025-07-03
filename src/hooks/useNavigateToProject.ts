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

// Simple navigation to project edit page
export const useNavigateToProjectEdit = () => {
  const navigate = useNavigate();
  
  return useCallback(
    (projectId: string, options: any = {}) => {
      logger.debug('Navigating to project edit', { projectId });
      
      navigate(`/projects/${projectId}/edit`);
    },
    [navigate]
  );
};

// Simple helper for backward compatibility (no longer creates complex context)
export const createNavigationContext = (): NavigationContext => ({
  timestamp: Date.now(),
});