import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectType, ProjectFormValues } from '@/types/project';
import { useAuth } from '@/hooks/useAuth';
// Define interface for company and artist data
// We'll use 'any' type for database responses to avoid complex Supabase typing issues
// Using PocketBase services directly
import { projectService } from '@/services/pocketbase/projectService';
import { pb } from '@/lib/pocketbase';
import { useServiceToast } from '@/utils/toast-adapter';
import { analytics } from '@/services/analytics';

interface UpdateProjectOptions {
  skipNavigation?: boolean;
  onSuccess?: () => void;
}

/**
 * Hook for editing a project using the project service
 *
 * This hook handles fetching and updating project data
 */
export const useEditProject = (projectId: string | undefined) => {
  const navigate = useNavigate();
  const { toast } = useServiceToast();

  const { user } = useAuth();
  const [project, setProject] = useState<ProjectType | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<string[]>([]);
  const [artists, setArtists] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Use PocketBase services directly

  // Simple schema check function (minimal version for production)
  const debugSchema = useCallback(async () => {
    try {
      // In production code, this is just a placeholder that returns true
      // The full debugging version is in the project-database-debug branch
      return true;
    } catch (error) {
      console.error('Error in schema check:', error);
      return false;
    }
  }, []);

  // Function to refresh company and artist lists
  const refreshMetadata = useCallback(async () => {
    try {
      console.log('Refreshing companies and artists lists');

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const userId = user.id;

      // Fetch companies and artists filtered by user
      const [companiesResponse, artistsResponse] = await Promise.all([
        pb
          .collection('companies')
          .getList(1, 200, { filter: `user = "${userId}"`, fields: 'name' }),
        pb.collection('artists').getList(1, 200, { filter: `user = "${userId}"`, fields: 'name' }),
      ]);

      // Extract the company names from the response
      const companyNames = (companiesResponse.items || []).map(
        (company: { name: string }) => company.name
      );
      console.log('Updated companies list:', companyNames);
      setCompanies(companyNames);

      // Extract the artist names from the response
      const artistNames = (artistsResponse.items || []).map(
        (artist: { name: string }) => artist.name
      );
      console.log('Updated artists list:', artistNames);
      setArtists(artistNames);
    } catch (error) {
      console.error('Error refreshing companies or artists:', error);
      toast({
        title: 'Dropdown Data Issue',
        description: 'Could not refresh dropdown options',
        variant: 'destructive',
      });
    }
  }, [toast, user?.id]);

  useEffect(() => {
    const loadProject = async () => {
      // Skip if already loaded or no projectId/user
      if ((initialLoadComplete && project) || !projectId || !user) {
        if (!projectId) {
          console.error('No project ID provided');
          toast({
            title: 'Missing Project ID',
            description: 'No project ID was provided to edit',
            variant: 'destructive',
          });
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching project for editing, ID:', projectId);

        // Fetch the project using PocketBase service directly
        const response = await projectService.fetchProject(projectId);

        if (response.error || !response.data) {
          console.error('Error fetching project:', response.error);
          toast({
            title: 'Error loading project',
            description: `Failed to load project: ${response.error || 'Unknown error'}`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { data } = response;

        console.log('Project data loaded for editing:', data);

        // Check for potential data issues
        if (!data.title) {
          console.warn('Project has no title - this might indicate data mapping issues');
          toast({
            title: 'Warning',
            description: 'Project data may be incomplete. Some fields might be missing.',
            variant: 'destructive',
          });
        }

        setProject(data);
        setInitialLoadComplete(true);

        // Fetch the initial companies and artists lists
        await refreshMetadata();
      } catch (error) {
        console.error('Error loading project details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, navigate, toast, user, initialLoadComplete, refreshMetadata, project]);

  const handleArchiveProject = async () => {
    if (!projectId || !project || !user) {
      toast({
        title: 'Cannot archive project',
        description: !user
          ? 'You need to be logged in to archive a project'
          : 'Missing project information',
        variant: 'destructive',
      });
      return;
    }

    // addBreadcrumb removed

    try {
      setSubmitting(true);
      console.log('Archiving project:', projectId);

      // Create toast adapter

      // Use PocketBase service to archive the project
      const response = await projectService.updateProjectStatus(projectId, 'archived');

      if (response.error) {
        console.error('Error archiving project:', response.error);

        toast({
          title: 'Error archiving project',
          description: response.error instanceof Error ? response.error.message : response.error,
          variant: 'destructive',
        });
        return;
      }

      // Track project archiving analytics
      analytics.project.statusChanged(projectId, project.status || 'unknown', 'archived');

      // addBreadcrumb removed

      // Navigate to dashboard after successful archive
      // addBreadcrumb removed
      navigate('/dashboard');
    } catch (error) {
      console.error('Error archiving project:', error);
      // addBreadcrumb removed
      toast({
        title: 'Error archiving project',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId || !project || !user) {
      toast({
        title: 'Cannot delete project',
        description: !user
          ? 'You need to be logged in to delete a project'
          : 'Missing project information',
        variant: 'destructive',
      });
      return;
    }

    // addBreadcrumb removed

    try {
      setSubmitting(true);
      console.log('Deleting project:', projectId);

      // Create toast adapter

      // Use PocketBase service to delete the project
      const response = await projectService.deleteProject(projectId);

      if (response.error) {
        console.error('Error deleting project:', response.error);

        toast({
          title: 'Error deleting project',
          description: response.error instanceof Error ? response.error.message : response.error,
          variant: 'destructive',
        });
        return;
      }

      // Track project deletion analytics
      analytics.project.deleted(projectId, project.status);

      // addBreadcrumb removed

      // Navigate to dashboard after successful deletion
      // addBreadcrumb removed
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
      // addBreadcrumb removed
      toast({
        title: 'Error deleting project',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProject = async (
    data: ProjectFormValues,
    options: UpdateProjectOptions = {}
  ) => {
    if (!projectId || !project || !user) {
      toast({
        title: 'Cannot update project',
        description: !user
          ? 'You need to be logged in to update a project'
          : 'Missing project information',
        variant: 'destructive',
      });
      return;
    }

    // addBreadcrumb removed

    try {
      setSubmitting(true);
      console.log('Updating project with data:', data);
      console.log('Update options:', options);

      // Schema debugging removed in production version
      // Create an adapter for the toast function to match the ToastHandlers interface

      // Use PocketBase service to update the project
      const response = await projectService.updateProject(projectId, data);

      console.log('Update project response:', response);

      // Handle error case
      if (response.error) {
        console.error('Error updating project:', response.error);
        toast({
          title: 'Error updating project',
          description: response.error instanceof Error ? response.error.message : response.error,
          variant: 'destructive',
        });
        return;
      }

      if (response.data) {
        // Track project update analytics
        const changes = data as unknown as Record<string, unknown>;
        analytics.project.updated(projectId, changes);

        // Track status change if status was updated
        if (data.status && project.status !== data.status) {
          analytics.project.statusChanged(projectId, project.status || 'unknown', data.status);
        }

        setProject(response.data);

        // Call success callback to reset form state before navigation
        if (options.onSuccess) {
          console.log('Calling success callback to reset form state');
          options.onSuccess();
        }

        // Navigate to project detail page after successful update
        if (options.skipNavigation !== true) {
          console.log('Navigating to project detail page:', `/projects/${projectId}`);
          navigate(`/projects/${projectId}`);
        }
        // addBreadcrumb removed
      }
    } catch (error) {
      console.error('Error updating project:', error);
      // addBreadcrumb removed
      toast({
        title: 'Error updating project',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Function to trigger a refresh of the companies and artists lists
  const refreshLists = async () => {
    await refreshMetadata();
    // Force a re-render by updating the project reference
    setProject(prev => (prev ? { ...prev } : null));
  };

  return {
    project,
    loading,
    submitting,
    companies,
    artists,
    handleUpdateProject,
    handleArchiveProject,
    handleDeleteProject,
    debugSchema,
    refreshLists,
  };
};
