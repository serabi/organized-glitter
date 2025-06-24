import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProjectDetailReactQuery } from '@/hooks/useProjectDetailReactQuery';
import { ProjectType } from '@/types/project';

import LoadingState from '@/components/projects/LoadingState';
import ProjectNotFound from '@/components/projects/ProjectNotFound';
import ProjectDetailView from '@/components/projects/ProjectDetailView';
import { ProjectContentErrorBoundary } from '@/components/error/ComponentErrorBoundaries';

/**
 * ProjectDetail - Project detail page
 *
 * This component uses the project service layer for reliable data fetching.
 */
const ProjectDetail = () => {
  console.log('[ProjectDetail] 🎯 ProjectDetail component mounting!');
  console.log('[ProjectDetail] Current URL:', window.location.href);
  console.log('[ProjectDetail] Current pathname:', window.location.pathname);
  
  const { id } = useParams<{ id: string }>();
  const projectId = id || '';
  
  console.log('[ProjectDetail] Extracted project ID from params:', projectId);
  
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  useAuth(); // Keep the auth check for authentication status

  // Use our project detail hook with the service layer
  const {
    project,
    loading,
    submitting,
    handleUpdateStatus,
    handleUpdateNotes,
    handleArchive,
    handleDelete,
  } = useProjectDetailReactQuery(projectId);

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

  const navigateToEdit = () => {
    // Track navigation to edit page
    // addBreadcrumb removed

    navigate(`/projects/${projectId}/edit`);
  };

  // Show loading state while fetching project data
  if (loading) {
    return (
      <MainLayout isAuthenticated={true}>
        <LoadingState />
      </MainLayout>
    );
  }

  // Show not found state if project doesn't exist
  if (!project) {
    return (
      <MainLayout isAuthenticated={true}>
        <ProjectNotFound />
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
