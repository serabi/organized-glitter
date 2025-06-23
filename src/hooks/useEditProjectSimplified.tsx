import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProjectType, ProjectFormValues } from '@/types/project';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationWithWarning } from '@/hooks/useNavigationWithWarning';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
// Using PocketBase services directly
import { projectService } from '@/services/pocketbase/projectService';
import { pb } from '@/lib/pocketbase';
import { useServiceToast } from '@/utils/toast-adapter';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/queryKeys';

// Toast adapter utility
const createToastAdapter =
  (
    toast: (options: {
      title: string;
      description?: string;
      variant?: 'default' | 'destructive';
    }) => void
  ) =>
  (options: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success' | 'warning';
  }) => {
    const mappedVariant =
      options.variant === 'success' || options.variant === 'warning'
        ? 'default'
        : (options.variant as 'default' | 'destructive' | undefined);

    toast({
      title: options.title,
      description: options.description,
      variant: mappedVariant,
    });
  };

// Helper function to prepare initial data for the form
const prepareFormInitialData = (project: ProjectType): ProjectFormValues => {
  return {
    title: project.title || '',
    status: project.status || 'wishlist',
    company: project.company || '',
    artist: project.artist || '',
    drillShape: project.drillShape || '',
    totalDiamonds: project.totalDiamonds || 0,
    generalNotes: project.generalNotes || '',
    sourceUrl: project.sourceUrl || '',
    imageUrl: project.imageUrl || '',
    imageFile: null,
    width: project.width?.toString() || '',
    height: project.height?.toString() || '',
    datePurchased: project.datePurchased || '',
    dateReceived: project.dateReceived || '',
    dateStarted: project.dateStarted || '',
    dateCompleted: project.dateCompleted || '',
    tags: project.tags || [],
    userId: project.userId,
    kit_category: project.kit_category || 'full',
  };
};

/**
 * Simplified hook for editing a project - merges data fetching, form state, and operations
 */
export const useEditProjectSimplified = (projectId: string | undefined) => {
  const { toast } = useServiceToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State management
  const [project, setProject] = useState<ProjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState<string[]>([]);
  const [artists, setArtists] = useState<string[]>([]);
  const [formData, setFormData] = useState<ProjectFormValues | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [hasSelectedNewImage, setHasSelectedNewImage] = useState(false);

  // Confirmation dialog hook
  const { ConfirmationDialog, confirmDelete, confirmArchive, confirmUnsavedChanges } =
    useConfirmationDialog();

  // Navigation with unsaved changes warning - now integrated with ConfirmationDialog
  const {
    navigateWithWarning,
    unsafeNavigate,
    navigationState,
    removeBeforeUnloadListener,
    clearNavigationError,
  } = useNavigationWithWarning({
    isDirty,
    message: 'You have unsaved changes. Are you sure you want to leave?',
    confirmationDialog: { confirmUnsavedChanges },
  });

  // Services - stable instances to prevent effect re-runs
  // Using PocketBase project service directly (no need for service instantiation)

  // Create stable toast adapter that doesn't change on every render
  const toastAdapter = useMemo(() => createToastAdapter(toast), [toast]);

  // beforeunload handling is now done in useNavigationWithWarning hook

  // Update form data when project loads
  useEffect(() => {
    if (project && !formData) {
      const initialData = prepareFormInitialData(project);
      setFormData(initialData);
    }
  }, [project, formData]);

  // Load project and metadata in parallel - stable dependencies to prevent reloads
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Use existing user.id instead of re-fetching auth data
        const userId = user.id;

        // Fetch everything in parallel for maximum speed
        const [projectResponse, companiesResponse, artistsResponse] = await Promise.all([
          projectService.fetchProject(projectId),
          pb
            .collection('companies')
            .getList(1, 200, { filter: `user = "${userId}"`, fields: 'name' }),
          pb
            .collection('artists')
            .getList(1, 200, { filter: `user = "${userId}"`, fields: 'name' }),
        ]);

        // Handle project response
        if (projectResponse?.error) {
          toast({
            title: 'Error loading project',
            description:
              projectResponse.error instanceof Error
                ? projectResponse.error.message
                : projectResponse.error || 'Failed to load project',
            variant: 'destructive',
          });
          return;
        }

        if (projectResponse?.data) {
          setProject(projectResponse.data);
        }

        // Handle metadata responses
        if (companiesResponse?.items) {
          setCompanies(companiesResponse.items.map((c: { name: string }) => c.name));
        }
        if (artistsResponse?.items) {
          setArtists(artistsResponse.items.map((a: { name: string }) => a.name));
        }
      } catch (error) {
        console.error('Error loading project data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [projectId, user?.id, toast, toastAdapter]);

  // Form handlers
  const handleFormChange = useCallback((data: ProjectFormValues) => {
    setFormData(prevData => {
      const newData = { ...prevData, ...data };

      if (data.imageFile !== undefined) {
        setHasSelectedNewImage(!!data.imageFile);
      }

      const otherFieldsChanged = Object.keys(data).some(key => {
        if (key === 'imageFile' || key === 'imageUrl' || key === '_imageReplacement') return false;
        const oldValue = prevData?.[key as keyof ProjectFormValues];
        const newValue = data[key as keyof ProjectFormValues];
        return oldValue !== newValue;
      });

      if (otherFieldsChanged || data.imageFile !== undefined) {
        setIsDirty(true);
      }

      return newData;
    });
  }, []);

  const handleSubmit = useCallback(
    async (data: ProjectFormValues) => {
      if (!projectId) {
        toast({
          title: 'Error',
          description: 'No project ID provided',
          variant: 'destructive',
        });
        return;
      }

      try {
        setSubmitting(true);

        // Extract tag IDs for synchronization
        const tagIds = data.tags?.map(tag => tag.id) ?? [];

        const dataToSubmit: ProjectFormValues = {
          ...data,
          totalDiamonds:
            typeof data.totalDiamonds === 'string' && data.totalDiamonds
              ? Number(data.totalDiamonds)
              : data.totalDiamonds,
          // Include current tag IDs for synchronization
          tagIds,
        };

        // Handle any potential promise rejections from updateProject
        const response = await projectService
          .updateProject(projectId, dataToSubmit)
          .catch((error: unknown) => {
            console.error('UpdateProject promise rejected:', error);
            // Return error response instead of throwing
            return { error: error instanceof Error ? error.message : String(error), data: null };
          });

        if (!response?.error && response?.data) {
          // Reset form state after successful update
          setIsDirty(false);
          setHasSelectedNewImage(false);
          setProject(response.data);

          // Invalidate React Query cache to ensure fresh data on navigation
          try {
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: queryKeys.projects.detail(projectId),
              }),
              queryClient.invalidateQueries({
                queryKey: queryKeys.projects.lists(),
              }),
              queryClient.invalidateQueries({
                queryKey: queryKeys.projects.advanced(user?.id || ''),
              }),
            ]);
          } catch (error) {
            console.error('Cache invalidation error:', error);
            // Continue with navigation even if cache invalidation fails
          }

          // Navigate to project detail after successful save
          const targetUrl = `/projects/${projectId}`;
          
          // Remove beforeunload listener to prevent navigation confirmation
          removeBeforeUnloadListener();
          
          // Use simple navigation - the hook now handles this properly
          unsafeNavigate(targetUrl, { replace: true });
        } else {
          if (response?.error) {
            toast({
              title: 'Error updating project',
              description:
                response.error instanceof Error ? response.error.message : response.error,
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        // Only show toast for network errors not handled by service
        console.error('Network error updating project:', error);
        toast({
          title: 'Error updating project',
          description: error instanceof Error ? error.message : 'Network error',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [toast, projectId, queryClient, user?.id, removeBeforeUnloadListener, unsafeNavigate]
  );


  const handleArchive = useCallback(async () => {
    if (!projectId || !project) return;

    // Check for unsaved changes first
    if (isDirty) {
      const confirmed = await confirmUnsavedChanges('archive this project');
      if (!confirmed) return;
    }

    // Confirm archive action
    const confirmed = await confirmArchive(project.title);
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const response = await projectService.updateProjectStatus(projectId, 'archived');

      if (response?.error) {
        toast({
          title: 'Error archiving project',
          description:
            response.error instanceof Error
              ? response.error.message
              : response.error || 'An unknown error occurred',
          variant: 'destructive',
        });
        return;
      }

      unsafeNavigate('/dashboard');
    } catch (error) {
      console.error('Error archiving project:', error);
      toast({
        title: 'Error archiving project',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }, [projectId, project, isDirty, toast, unsafeNavigate, confirmUnsavedChanges, confirmArchive]);

  const handleDelete = useCallback(async () => {
    if (!projectId || !project) return;

    // Check for unsaved changes first
    if (isDirty) {
      const confirmed = await confirmUnsavedChanges('delete this project');
      if (!confirmed) return;
    }

    // Confirm delete action
    const confirmed = await confirmDelete();
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const response = await projectService.deleteProject(projectId);

      if (response?.error) {
        toast({
          title: 'Error deleting project',
          description:
            response.error instanceof Error
              ? response.error.message
              : response.error || 'An unknown error occurred',
          variant: 'destructive',
        });
        return;
      }

      unsafeNavigate('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error deleting project',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }, [projectId, project, isDirty, toast, unsafeNavigate, confirmUnsavedChanges, confirmDelete]);

  const refreshLists = useCallback(async () => {
    // Simplified refresh - just reload metadata using existing user.id
    if (!user?.id) return;

    try {
      const [companiesResponse, artistsResponse] = await Promise.all([
        pb
          .collection('companies')
          .getList(1, 200, { filter: `user = "${user.id}"`, fields: 'name' }),
        pb.collection('artists').getList(1, 200, { filter: `user = "${user.id}"`, fields: 'name' }),
      ]);

      if (companiesResponse?.items) {
        setCompanies(companiesResponse.items.map((c: { name: string }) => c.name));
      }
      if (artistsResponse?.items) {
        setArtists(artistsResponse.items.map((a: { name: string }) => a.name));
      }
    } catch (error) {
      console.error('Error refreshing lists:', error);
    }
  }, [user?.id]);

  return {
    project,
    loading,
    submitting,
    companies,
    artists,
    formData,
    isDirty,
    hasSelectedNewImage,
    navigateWithWarning,
    navigationState,
    clearNavigationError,
    handleFormChange,
    handleSubmit,
    handleArchive,
    handleDelete,
    refreshLists,
    ConfirmationDialog,
  };
};
