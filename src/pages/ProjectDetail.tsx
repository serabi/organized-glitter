import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProjectDetailReactQuery } from '@/hooks/useProjectDetailReactQuery';
import { useNavigateToProjectEdit } from '@/hooks/useNavigateToProject';
import { ProjectType } from '@/types/project';

import LoadingState from '@/components/projects/LoadingState';
import ProjectNotFound from '@/components/projects/ProjectNotFound';
import ProjectDetailView from '@/components/projects/ProjectDetailView';
import { ProjectContentErrorBoundary } from '@/components/error/ComponentErrorBoundaries';

/**
 * ProjectDetail - Project detail page
 *
 * This component uses the project service layer for reliable data fetching.
 * Enhanced with better error handling and auth state tracking
 */
const ProjectDetail = () => {
  console.log('[ProjectDetail] ProjectDetail component mounting!');
  console.log('[ProjectDetail] Current URL:', window.location.href);
  console.log('[ProjectDetail] Current pathname:', window.location.pathname);

  const { id } = useParams<{ id: string }>();
  const projectId = id || '';
  const location = useLocation();
  const navigate = useNavigate();
  const navigateToProjectEdit = useNavigateToProjectEdit();
  const isMobile = useIsMobile();
  const { isAuthenticated, initialCheckComplete, isLoading: authLoading } = useAuth();

  console.log('[ProjectDetail] Extracted project ID from params:', projectId);
  console.log('[ProjectDetail] Auth state:', {
    isAuthenticated,
    initialCheckComplete,
    authLoading,
  });

  // Check for optimistic navigation data in location state
  const navigationState = location.state as {
    fromNavigation?: boolean;
    projectId?: string;
    projectData?: any;
    timestamp?: number;
  } | null;

  if (navigationState?.fromNavigation) {
    console.log('[ProjectDetail] Optimistic navigation detected:', navigationState);
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
  console.log('[ProjectDetail] Project data state:', {
    projectId,
    hasProject: !!project,
    loading,
    error: error ? { message: error.message, status: (error as any)?.status } : null,
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

    await navigateToProjectEdit(projectId);
  };

  // Show loading state while fetching project data or during auth check
  if (loading || authLoading || !initialCheckComplete) {
    console.log('[ProjectDetail] Showing loading state:', {
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
    console.log('[ProjectDetail] Showing ProjectNotFound - confirmed project does not exist');
    return (
      <MainLayout isAuthenticated={true}>
        <ProjectNotFound />
      </MainLayout>
    );
  }

  // If we get here without a project and without proper auth state, show loading
  if (!project) {
    console.log('[ProjectDetail] No project data yet, continuing to show loading...');
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
            onStatusChange={handleUpdateStatus}
            onUpdateNotes={handleUpdateNotes}
            onArchive={handleArchive}
            onDelete={handleDelete}
            navigateToEdit={navigateToEdit}
            isSubmitting={submitting}
          />
        </ProjectContentErrorBoundary>
      </div>
    </MainLayout>
  );
};

export default ProjectDetail;
