import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// Using PocketBase project service directly
import { projectService, ToastHandlers } from '@/services/pocketbase/projectService';
import { ProjectStatus, ProjectFormValues } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// PocketBase project service is imported directly

// We can now use the ServiceToastOptions from our toast-adapter utility instead of defining our own

/**
 * Hook for using the ProjectService to manage projects
 *
 * This hook provides functions for fetching, creating, updating, and deleting projects,
 * as well as managing loading states and error handling.
 */
export const useProjectService = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  // Create toast handlers that match the PocketBase service interface
  const toastHandlers: ToastHandlers = useMemo(
    () => ({
      showSuccess: (message: string) =>
        toast({
          title: 'Success',
          description: message,
          variant: 'default',
        }),
      showError: (message: string) =>
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        }),
    }),
    [toast]
  );

  /**
   * Fetch a single project by ID
   */
  const fetchProject = useCallback(
    async (projectId: string) => {
      if (!projectId) {
        toast({
          title: 'Error',
          description: 'Project ID is required',
          variant: 'destructive',
        });
        return null;
      }

      setLoading(true);
      try {
        const { data, error } = await projectService.fetchProject(projectId, toastHandlers);

        if (error) {
          console.error('Error fetching project:', error);
          return null;
        }

        return data || null;
      } finally {
        setLoading(false);
      }
    },
    [toast, toastHandlers]
  );

  /**
   * Fetch all projects for the current user, with optional status filter
   */
  const fetchProjects = useCallback(
    async (status?: ProjectStatus | 'all') => {
      setLoading(true);
      try {
        const { data, error } = await projectService.fetchProjects(status);

        if (error) {
          console.error('Error fetching projects:', error);
          toast({
            title: 'Error',
            description: 'Failed to load projects',
            variant: 'destructive',
          });
          return [];
        }

        return data || [];
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Create a new project
   */
  const createProject = useCallback(
    async (formData: ProjectFormValues) => {
      setLoading(true);
      try {
        const { data, error } = await projectService.createProject(
          formData,
          undefined,
          toastHandlers
        );

        if (error) {
          console.error('Error creating project:', error);
          return null;
        }

        if (data) {
          navigate(`/projects/${data.id}`);
        }

        return data || null;
      } finally {
        setLoading(false);
      }
    },
    [navigate, toastHandlers]
  );

  /**
   * Update an existing project
   */
  const updateProject = useCallback(
    async (projectId: string, formData: ProjectFormValues) => {
      if (!projectId) {
        toast({
          title: 'Error',
          description: 'Project ID is required',
          variant: 'destructive',
        });
        return null;
      }

      setLoading(true);
      try {
        const { data, error } = await projectService.updateProject(
          projectId,
          formData,
          toastHandlers
        );

        if (error) {
          console.error('Error updating project:', error);
          return null;
        }

        return data || null;
      } finally {
        setLoading(false);
      }
    },
    [toast, toastHandlers]
  );

  /**
   * Update a project's status
   */
  const updateProjectStatus = useCallback(
    async (projectId: string, newStatus: ProjectStatus) => {
      if (!projectId) {
        toast({
          title: 'Error',
          description: 'Project ID is required',
          variant: 'destructive',
        });
        return false;
      }

      setLoading(true);
      try {
        const { data, error } = await projectService.updateProjectStatus(
          projectId,
          newStatus,
          toastHandlers
        );
        return !error && !!data;
      } catch (error) {
        console.error('Error updating project status:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast, toastHandlers]
  );

  /**
   * Delete a project
   */
  const deleteProject = useCallback(
    async (projectId: string, redirectTo?: string) => {
      if (!projectId) {
        toast({
          title: 'Error',
          description: 'Project ID is required',
          variant: 'destructive',
        });
        return false;
      }

      setLoading(true);
      try {
        const { data, error } = await projectService.deleteProject(projectId, toastHandlers);

        if (error) {
          console.error('Error deleting project:', error);
          return false;
        }

        if (redirectTo) {
          navigate(redirectTo);
        }

        return !!data;
      } finally {
        setLoading(false);
      }
    },
    [navigate, toastHandlers, toast]
  );

  /**
   * Fetch available company names
   */
  const fetchCompanyNames = useCallback(async () => {
    try {
      const { data, error } = await projectService.fetchCompanyNames();

      if (error) {
        console.error('Error fetching company names:', error);
        toast({
          title: 'Error',
          description: 'Failed to load companies',
          variant: 'destructive',
        });
        return [];
      }

      // Map the data to just the names
      return data?.map((company: { name: string }) => company.name) || [];
    } catch (error) {
      console.error('Unexpected error fetching company names:', error);
      return [];
    }
  }, [toast]);

  /**
   * Fetch available artist names
   */
  const fetchArtistNames = useCallback(async () => {
    try {
      const { data, error } = await projectService.fetchArtistNames();

      if (error) {
        console.error('Error fetching artist names:', error);
        toast({
          title: 'Error',
          description: 'Failed to load artists',
          variant: 'destructive',
        });
        return [];
      }

      // Map the data to just the names
      return data?.map((artist: { name: string }) => artist.name) || [];
    } catch (error) {
      console.error('Unexpected error fetching artist names:', error);
      return [];
    }
  }, [toast]);

  return {
    loading,
    fetchProject,
    fetchProjects,
    createProject,
    updateProject,
    updateProjectStatus,
    deleteProject,
    fetchCompanyNames,
    fetchArtistNames,
  };
};
