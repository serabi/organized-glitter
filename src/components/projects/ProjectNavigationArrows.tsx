import React, { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigateToProject } from '@/hooks/useNavigateToProject';
import { UnifiedNavigationContext, SiblingNavigationResult } from '@/hooks/useUnifiedNavigationContext';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ProjectNavigationArrows');

export interface ProjectNavigationArrowsProps {
  currentProjectId: string;
  userId: string;
  /** Unified navigation context from useUnifiedNavigationContext */
  context: UnifiedNavigationContext;
  /** Sibling navigation data from useUnifiedNavigationContext */
  sibling: SiblingNavigationResult;
  className?: string;
  /** Whether to show text labels alongside arrows */
  showLabels?: boolean;
  /** Visual variant - 'buttons' for prominent buttons, 'discrete' for subtle links */
  variant?: 'buttons' | 'discrete';
  /** Size variant for the buttons (only applies to 'buttons' variant) */
  size?: 'sm' | 'default' | 'lg';
  /** Whether navigation arrows should be disabled */
  disabled?: boolean;
}

/**
 * Modern navigation arrows component using unified navigation context.
 * 
 * This component now uses the unified navigation context pattern from
 * useUnifiedNavigationContext, eliminating the need for separate location
 * state management and sibling navigation analysis.
 * 
 * Features:
 * - Unified navigation context with database fallback support
 * - Pre-computed sibling navigation data for optimal performance
 * - Keyboard navigation support (ArrowLeft/ArrowRight)
 * - Accessible with proper aria labels
 * - Responsive design with mobile optimizations
 * - Visual feedback for available navigation
 * - Works with direct URL access via database fallback
 * 
 * Modern Usage:
 * ```tsx
 * const { navigationContext, sibling } = useUnifiedNavigationContext({
 *   currentProjectId: project.id,
 *   userId: user?.id,
 * });
 * 
 * // Discrete variant for subtle navigation
 * <ProjectNavigationArrows 
 *   currentProjectId={project.id}
 *   userId={user.id}
 *   context={navigationContext}
 *   sibling={sibling}
 *   variant="discrete"
 *   showLabels={false}
 * />
 * 
 * // Button variant for prominent navigation
 * <ProjectNavigationArrows 
 *   currentProjectId={project.id}
 *   userId={user.id}
 *   context={navigationContext}
 *   sibling={sibling}
 *   variant="buttons"
 *   showLabels={true}
 * />
 * ```
 */
export const ProjectNavigationArrows: React.FC<ProjectNavigationArrowsProps> = ({
  currentProjectId,
  userId,
  context,
  sibling,
  className,
  showLabels = false,
  variant = 'buttons',
  size = 'default',
  disabled = false,
}) => {
  const navigateToProject = useNavigateToProject();

  // Extract sibling navigation data from unified context
  const {
    previousProject,
    nextProject,
    hasPrevious,
    hasNext,
    currentIndex,
    totalProjects,
    isLoading,
  } = sibling;

  // Convert unified context to NavigationContext format
  const createNavigationContextFromUnified = useCallback((unifiedContext: UnifiedNavigationContext) => {
    return {
      filters: unifiedContext.filters,
      sortField: unifiedContext.sortField,
      sortDirection: unifiedContext.sortDirection,
      currentPage: unifiedContext.currentPage,
      pageSize: unifiedContext.pageSize,
      preservationContext: unifiedContext.preservationContext || {
        scrollPosition: window.scrollY,
        timestamp: Date.now(),
      },
    };
  }, []);

  // Navigation handlers
  const navigateToPrevious = useCallback(async () => {
    if (!previousProject || disabled) {
      logger.debug('Previous navigation not available or disabled');
      return;
    }

    logger.info(`🎯 Navigating to previous project: ${previousProject.id}`);
    
    const navContext = createNavigationContextFromUnified(context);
    await navigateToProject(previousProject.id, {
      navigationContext: navContext,
      successMessage: undefined, // Don't show success message for sibling navigation
      showLoadingFeedback: false, // Keep navigation snappy
    });
  }, [previousProject, disabled, context, navigateToProject, createNavigationContextFromUnified]);

  const navigateToNext = useCallback(async () => {
    if (!nextProject || disabled) {
      logger.debug('Next navigation not available or disabled');
      return;
    }

    logger.info(`🎯 Navigating to next project: ${nextProject.id}`);
    
    const navContext = createNavigationContextFromUnified(context);
    await navigateToProject(nextProject.id, {
      navigationContext: navContext,
      successMessage: undefined, // Don't show success message for sibling navigation
      showLoadingFeedback: false, // Keep navigation snappy
    });
  }, [nextProject, disabled, context, navigateToProject, createNavigationContextFromUnified]);

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

  // Render discrete variant with subtle link styling
  if (variant === 'discrete') {
    return (
      <div 
        className={cn(
          'flex items-center gap-3 text-sm',
          className
        )}
        role="navigation"
        aria-label="Project navigation"
      >
        {/* Previous link */}
        <button
          onClick={navigateToPrevious}
          disabled={!hasPrevious || disabled}
          aria-label={
            previousProject 
              ? `Go to previous project: ${previousProject.title}`
              : 'Go to previous project'
          }
          className={cn(
            'flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors',
            (!hasPrevious || disabled) && 'opacity-50 cursor-not-allowed hover:text-muted-foreground'
          )}
        >
          <ChevronLeft className="h-3 w-3" />
          <span className="text-xs">Prev</span>
        </button>

        {/* Position indicator */}
        {currentIndex !== null && totalProjects > 0 && (
          <span 
            className="text-xs text-muted-foreground px-1"
            aria-label={`Project ${currentIndex + 1} of ${totalProjects}`}
          >
            {currentIndex + 1} of {totalProjects}
          </span>
        )}

        {/* Next link */}
        <button
          onClick={navigateToNext}
          disabled={!hasNext || disabled}
          aria-label={
            nextProject 
              ? `Go to next project: ${nextProject.title}`
              : 'Go to next project'
          }
          className={cn(
            'flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors',
            (!hasNext || disabled) && 'opacity-50 cursor-not-allowed hover:text-muted-foreground'
          )}
        >
          <span className="text-xs">Next</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // Render button variant (original styling)
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