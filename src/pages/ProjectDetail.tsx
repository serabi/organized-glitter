/**
 * @fileoverview Project Detail Page Component
 *
 * Main page component for displaying individual project details. Handles authentication,
 * navigation state management, and project data fetching with comprehensive error handling.
 * Integrates with the simplified navigation system for smooth user experience.
 *
 * Key Features:
 * - URL parameter-based project identification
 * - Authentication state verification
 * - Optimistic navigation data handling
 * - Comprehensive error boundary protection
 * - Mobile-responsive layout integration
 * - Navigation context preservation for edit workflows
 *
 * Navigation Integration:
 * - Handles navigation state from dashboard
 * - Preserves context for edit page transitions
 * - Supports optimistic navigation with cached data
 * - Back navigation with position restoration
 *
 * Error Handling:
 * - Project not found scenarios
 * - Authentication failures
 * - Network and loading errors
 * - Graceful degradation with user feedback
 *
 * @author serabi
 * @since 2025-07-03
 * @version 1.0.0 - Simplified navigation integration
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProjectDetailReactQuery } from '@/hooks/useProjectDetailReactQuery';
import { useNavigateToProjectEdit, NavigationContext } from '@/hooks/useNavigateToProject';
import { ProjectType } from '@/types/project';
import { createLogger } from '@/utils/secureLogger';

import LoadingState from '@/components/projects/LoadingState';
import ProjectNotFound from '@/components/projects/ProjectNotFound';
import ProjectDetailView from '@/components/projects/ProjectDetailView';
import { ProjectContentErrorBoundary } from '@/components/error/ComponentErrorBoundaries';

const logger = createLogger('ProjectDetail');

/**
 * ProjectDetail Component
 *
 * Main component for rendering individual project detail pages. Orchestrates
 * authentication checks, project data fetching, navigation state handling,
 * and error boundaries for a robust user experience.
 *
 * Features:
 * - Automatic authentication verification with redirects
 * - Project data fetching with React Query integration
 * - Navigation state preservation for edit workflows
 * - Comprehensive error handling and loading states
 * - Mobile-responsive layout integration
 *
 * @returns JSX.Element The complete project detail page
 */
const ProjectDetail = () => {
  logger.debug('ProjectDetail component mounting');
  logger.debug('Current URL:', window.location.href);
  logger.debug('Current pathname:', window.location.pathname);

  const { id } = useParams<{ id: string }>();
  const projectId = id || '';
  const location = useLocation();
  const navigate = useNavigate();
  const navigateToProjectEdit = useNavigateToProjectEdit();
  const isMobile = useIsMobile();
  const { user, isAuthenticated, initialCheckComplete, isLoading: authLoading } = useAuth();

  logger.debug('Extracted project ID from params:', projectId);
  logger.debug('Auth state:', {
    isAuthenticated,
    initialCheckComplete,
    authLoading,
  });

  // Check for optimistic navigation data in location state
  const navigationState = location.state as {
    fromNavigation?: boolean;
    projectId?: string;
    projectData?: ProjectType;
    timestamp?: number;
    navigationContext?: NavigationContext;
    from?: string;
    randomizerState?: {
      selectedProjects: string[];
      shareUrl: string;
    };
  } | null;

  if (navigationState?.fromNavigation) {
    logger.debug('Optimistic navigation detected:', navigationState);
  }

  // Use our project detail hook with the service layer
  const {
    project,
    loading,
    submitting,
    error,
    handleUpdateStatus,
    handleUpdateNotes,
    handleArchive,
    handleDelete,
  } = useProjectDetailReactQuery(projectId);

  // Enhanced logging for debugging the 404 issue
  logger.debug('Project data state:', {
    projectId,
    hasProject: !!project,
    loading,
    error: error
      ? {
          message: error.message,
          status:
            error && typeof error === 'object' && 'status' in error
              ? (error as { status: unknown }).status
              : undefined,
        }
      : null,
    isAuthenticated,
    initialCheckComplete,
    authLoading,
  });

  // Track project detail page visits
  useEffect(() => {
    // addBreadcrumb removed
  }, [projectId, isMobile]);

  // Track when project data is loaded
  useEffect(() => {
    if (project && !loading) {
      // addBreadcrumb removed
    }
  }, [project, loading, projectId, isMobile]);

  // Track when project is not found
  useEffect(() => {
    if (!loading && !project) {
      // addBreadcrumb removed
    }
  }, [loading, project, projectId, isMobile]);

  const navigateToEdit = async () => {
    // Track navigation to edit page
    // addBreadcrumb removed

    // Create enhanced navigation context with edit tracking
    let enhancedNavigationContext = navigationState?.navigationContext;

    if (enhancedNavigationContext) {
      // Enhance existing context with edit tracking information
      enhancedNavigationContext = {
        ...enhancedNavigationContext,
        preservationContext: {
          ...enhancedNavigationContext.preservationContext,
          scrollPosition: window.scrollY,
          timestamp: Date.now(),
          editedProjectId: projectId,
          isEditNavigation: true,
          // Keep existing preEditPosition if it exists, or set current position
          preEditPosition: enhancedNavigationContext.preservationContext?.preEditPosition || {
            index: 0, // Will be calculated properly when we have the context
            page: enhancedNavigationContext.currentPage,
            totalItems: 0, // Will be calculated properly when we have the context
          },
        },
      };

      logger.debug('Enhanced navigation context for edit:', enhancedNavigationContext);
    }

    await navigateToProjectEdit(projectId, {
      navigationContext: enhancedNavigationContext,
    });
  };

  // Show loading state while fetching project data or during auth check
  if (loading || authLoading || !initialCheckComplete) {
    logger.debug('Showing loading state:', {
      loading,
      authLoading,
      initialCheckComplete,
    });
    return (
      <MainLayout isAuthenticated={true}>
        <LoadingState />
      </MainLayout>
    );
  }

  // Show not found state if project doesn't exist (but only after auth is confirmed)
  if (!project && !loading && isAuthenticated && initialCheckComplete) {
    logger.debug('Showing ProjectNotFound - confirmed project does not exist');
    return (
      <MainLayout isAuthenticated={true}>
        <ProjectNotFound />
      </MainLayout>
    );
  }

  // If we get here without a project and without proper auth state, show loading
  if (!project) {
    logger.debug('No project data yet, continuing to show loading...');
    return (
      <MainLayout isAuthenticated={true}>
        <LoadingState />
      </MainLayout>
    );
  }

  // Cast project to ProjectType to ensure type safety
  const typedProject: ProjectType = project;

  return (
    <MainLayout isAuthenticated={true}>
      <div className="bg-background text-foreground">
        <ProjectContentErrorBoundary projectId={projectId}>
          <ProjectDetailView
            project={typedProject}
            isMobile={isMobile}
            navigationState={navigationState ? {
              from: navigationState.from,
              randomizerState: navigationState.randomizerState
            } : undefined}
            onStatusChange={handleUpdateStatus}
            onUpdateNotes={handleUpdateNotes}
            onArchive={handleArchive}
            onDelete={handleDelete}
            navigateToEdit={navigateToEdit}
            isSubmitting={submitting}
            user={user}
          />
        </ProjectContentErrorBoundary>
      </div>
    </MainLayout>
  );
};

export default ProjectDetail;
