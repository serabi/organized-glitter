import React, { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSiblingNavigation } from '@/hooks/useSiblingNavigation';
import { useNavigateToProject, createNavigationContext } from '@/hooks/useNavigateToProject';
import { useLocation } from 'react-router-dom';
import { DashboardFiltersContextValue } from '@/contexts/DashboardFiltersContext';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ProjectNavigationArrows');

export interface ProjectNavigationArrowsProps {
  currentProjectId: string;
  userId: string;
  className?: string;
  /** Whether to show text labels alongside arrows */
  showLabels?: boolean;
  /** Size variant for the buttons */
  size?: 'sm' | 'default' | 'lg';
  /** Whether navigation arrows should be disabled */
  disabled?: boolean;
}

/**
 * Navigation arrows component for browsing between sibling projects.
 * 
 * Features:
 * - Maintains dashboard filter/sort context
 * - Keyboard navigation support (ArrowLeft/ArrowRight)
 * - Accessible with proper aria labels
 * - Responsive design
 * - Visual feedback for available navigation
 * 
 * Usage:
 * ```tsx
 * <ProjectNavigationArrows 
 *   currentProjectId="project-123"
 *   userId="user-456"
 *   showLabels={true}
 * />
 * ```
 */
export const ProjectNavigationArrows: React.FC<ProjectNavigationArrowsProps> = ({
  currentProjectId,
  userId,
  className,
  showLabels = false,
  size = 'default',
  disabled = false,
}) => {
  const location = useLocation();
  const navigateToProject = useNavigateToProject();

  // Extract navigation context from location state if available
  const navigationContext = location.state?.navigationContext as DashboardFiltersContextValue | undefined;

  // Get sibling navigation information
  const {
    previousProject,
    nextProject,
    hasPrevious,
    hasNext,
    currentIndex,
    totalProjects,
    isLoading,
  } = useSiblingNavigation({
    currentProjectId,
    userId,
    dashboardContext: navigationContext,
  });

  // Navigation handlers
  const navigateToPrevious = useCallback(async () => {
    if (!previousProject || disabled) {
      logger.debug('Previous navigation not available or disabled');
      return;
    }

    logger.info(`🎯 Navigating to previous project: ${previousProject.id}`);
    
    const navContext = createNavigationContext(navigationContext);
    await navigateToProject(previousProject.id, {
      navigationContext: navContext,
      successMessage: undefined, // Don't show success message for sibling navigation
      showLoadingFeedback: false, // Keep navigation snappy
    });
  }, [previousProject, disabled, navigationContext, navigateToProject]);

  const navigateToNext = useCallback(async () => {
    if (!nextProject || disabled) {
      logger.debug('Next navigation not available or disabled');
      return;
    }

    logger.info(`🎯 Navigating to next project: ${nextProject.id}`);
    
    const navContext = createNavigationContext(navigationContext);
    await navigateToProject(nextProject.id, {
      navigationContext: navContext,
      successMessage: undefined, // Don't show success message for sibling navigation
      showLoadingFeedback: false, // Keep navigation snappy
    });
  }, [nextProject, disabled, navigationContext, navigateToProject]);

  // Keyboard navigation
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard navigation if no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      if (isInputFocused) {
        return;
      }

      // Handle arrow key navigation
      if (event.key === 'ArrowLeft' && hasPrevious) {
        event.preventDefault();
        navigateToPrevious();
      } else if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        navigateToNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled, hasPrevious, hasNext, navigateToPrevious, navigateToNext]);

  // Don't render if no navigation context or loading
  if (isLoading) {
    return null; // Could show skeleton loader here if desired
  }

  // Don't render if no navigation is possible
  if (!hasPrevious && !hasNext) {
    return null;
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-2',
        className
      )}
      role="navigation"
      aria-label="Project navigation"
    >
      {/* Previous button */}
      <Button
        variant="outline"
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
        onClick={navigateToPrevious}
        disabled={!hasPrevious || disabled}
        aria-label={
          previousProject 
            ? `Go to previous project: ${previousProject.title}`
            : 'Go to previous project'
        }
        className={cn(
          'transition-all',
          showLabels ? 'gap-2' : '',
          !hasPrevious && 'opacity-50 cursor-not-allowed'
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        {showLabels && <span className="hidden sm:inline">Previous</span>}
      </Button>

      {/* Position indicator */}
      {currentIndex !== null && totalProjects > 0 && (
        <span 
          className="text-sm text-muted-foreground px-2"
          aria-label={`Project ${currentIndex + 1} of ${totalProjects}`}
        >
          <span className="hidden sm:inline">
            {currentIndex + 1} of {totalProjects}
          </span>
          <span className="sm:hidden">
            {currentIndex + 1}/{totalProjects}
          </span>
        </span>
      )}

      {/* Next button */}
      <Button
        variant="outline"
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
        onClick={navigateToNext}
        disabled={!hasNext || disabled}
        aria-label={
          nextProject 
            ? `Go to next project: ${nextProject.title}`
            : 'Go to next project'
        }
        className={cn(
          'transition-all',
          showLabels ? 'gap-2' : '',
          !hasNext && 'opacity-50 cursor-not-allowed'
        )}
      >
        {showLabels && <span className="hidden sm:inline">Next</span>}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ProjectNavigationArrows;