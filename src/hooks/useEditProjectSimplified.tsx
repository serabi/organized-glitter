import { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import { ProjectType, ProjectFormValues } from '@/types/project';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationWithWarning } from '@/hooks/useNavigationWithWarning';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import { useNavigateToProject } from '@/hooks/useNavigateToProject';
// Using PocketBase directly
import { pb } from '@/lib/pocketbase';
import { ProjectsResponse, CompaniesResponse, ArtistsResponse } from '@/types/pocketbase.types';
import { extractDateOnly } from '@/lib/utils';
import { useServiceToast } from '@/utils/toast-adapter';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { createLogger } from '@/utils/secureLogger';
import { Collections } from '@/types/pocketbase.types';
import { TagService } from '@/lib/tags';

const logger = createLogger('useEditProjectSimplified');

interface ProjectWithExpand extends ProjectsResponse {
  expand?: {
    company?: CompaniesResponse;
    artist?: ArtistsResponse;
    user?: ProjectsResponse['user'];
    project_tags_via_project?: Array<{
      id: string;
      tag?: {
        id: string;
        name: string;
      };
    }>;
  };
}

/**
 * Transform PocketBase record to ProjectType
 */
const transformProject = (record: ProjectWithExpand): ProjectType => {
  return {
    id: record.id,
    title: record.title,
    userId: record.user,
    company: record.expand?.company?.name || '',
    artist: record.expand?.artist?.name || '',
    status: record.status as ProjectType['status'],
    kit_category: record.kit_category || undefined,
    drillShape: record.drill_shape || undefined,
    datePurchased: extractDateOnly(record.date_purchased),
    dateStarted: extractDateOnly(record.date_started),
    dateCompleted: extractDateOnly(record.date_completed),
    dateReceived: extractDateOnly(record.date_received),
    width: record.width || undefined,
    height: record.height || undefined,
    totalDiamonds: record.total_diamonds || undefined,
    generalNotes: record.general_notes || '',
    imageUrl: record.image ? pb.files.getURL(record, record.image) : undefined,
    sourceUrl: record.source_url || undefined,
    createdAt: record.created || '',
    updatedAt: record.updated || '',
    progressNotes: [],
    progressImages: [],
    tags: [], // Tags would need to be handled separately if needed
  };
};

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
  const navigateToProject = useNavigateToProject();

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
        const [projectRecord, companiesResponse, artistsResponse] = await Promise.all([
          pb.collection('projects').getOne(projectId, {
            expand: 'company,artist,user,project_tags_via_project.tag',
            requestKey: `fetch-project-${projectId}-${Date.now()}`,
          }),
          pb
            .collection('companies')
            .getList(1, 200, { filter: `user = "${userId}"`, fields: 'name' }),
          pb
            .collection('artists')
            .getList(1, 200, { filter: `user = "${userId}"`, fields: 'name' }),
        ]);

        // Transform and set project
        const transformedProject = transformProject(projectRecord as ProjectWithExpand);
        setProject(transformedProject);

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

        // Resolve company and artist names to IDs if provided
        let companyId = null;
        let artistId = null;

        if (dataToSubmit.company) {
          try {
            const companyRecord = await pb
              .collection('companies')
              .getFirstListItem(pb.filter('name = {:name} && user = {:user}', { 
                name: dataToSubmit.company, 
                user: user?.id 
              }));
            companyId = companyRecord?.id || null;
          } catch (error) {
            logger.warn('Company not found:', dataToSubmit.company);
            companyId = null;
          }
        }

        if (dataToSubmit.artist) {
          try {
            const artistRecord = await pb
              .collection('artists')
              .getFirstListItem(pb.filter('name = {:name} && user = {:user}', { 
                name: dataToSubmit.artist, 
                user: user?.id 
              }));
            artistId = artistRecord?.id || null;
          } catch (error) {
            logger.warn('Artist not found:', dataToSubmit.artist);
            artistId = null;
          }
        }

        // Create FormData for the update (handles image uploads)
        const formData = new FormData();

        // Add all form fields except special ones
        const fieldsToExclude = ['id', 'tags', 'tagIds', 'imageFile', '_imageReplacement', 'company', 'artist'];
        
        Object.entries(dataToSubmit).forEach(([key, value]) => {
          if (!fieldsToExclude.includes(key) && value !== undefined && value !== null && value !== '') {
            formData.append(key, String(value));
          }
        });

        // Add resolved company and artist IDs
        if (companyId) {
          formData.append('company', companyId);
        }
        if (artistId) {
          formData.append('artist', artistId);
        }

        // Handle image upload if present
        if (dataToSubmit.imageFile && dataToSubmit.imageFile instanceof File) {
          formData.append('image', dataToSubmit.imageFile);
        }

        // Update the project in PocketBase
        const updatedProject = await pb.collection(Collections.Projects).update(projectId, formData);
        
        // Handle tag synchronization
        const currentTagIds = tagIds;
        const originalTags = project?.tags || [];
        const originalTagIds = originalTags.map(tag => tag.id);
        
        // Find tags to add and remove
        const tagsToAdd = currentTagIds.filter(tagId => !originalTagIds.includes(tagId));
        const tagsToRemove = originalTagIds.filter(tagId => !currentTagIds.includes(tagId));
        
        // Add new tags
        for (const tagId of tagsToAdd) {
          try {
            await TagService.addTagToProject(projectId, tagId);
          } catch (error) {
            logger.warn('Failed to add tag to project:', { projectId, tagId, error });
            toast({
              title: 'Tag Update Warning',
              description: `Failed to add tag to project. The project was updated but some tags may not be saved properly.`,
              variant: 'destructive',
            });
          }
        }
        
        // Remove old tags
        for (const tagId of tagsToRemove) {
          try {
            await TagService.removeTagFromProject(projectId, tagId);
          } catch (error) {
            logger.warn('Failed to remove tag from project:', { projectId, tagId, error });
            toast({
              title: 'Tag Update Warning',
              description: `Failed to remove tag from project. The project was updated but some tags may not be saved properly.`,
              variant: 'destructive',
            });
          }
        }

        // Transform the response to match expected format
        const transformedProject = transformProject(updatedProject as ProjectWithExpand);
        const response = { data: transformedProject, error: null };

        if (!response?.error && response?.data) {
          // Reset form state after successful update
          setIsDirty(false);
          setHasSelectedNewImage(false);
          setProject(response.data);

          // Show immediate user feedback
          toast({
            title: 'Project Updated',
            description: `"${response.data.title}" has been updated successfully.`,
          });

          // Remove beforeunload listener to prevent navigation confirmation
          removeBeforeUnloadListener();
          
          // Navigate back to project detail page using React Router
          logger.info('🚀 Navigating back to project detail page');
          await navigateToProject(projectId, {
            projectData: response.data as ProjectType,
            replace: true // Replace current history entry since we're coming from edit
          });

          // Defer cache invalidation to happen after navigation
          // Use startTransition to mark cache updates as non-urgent
          startTransition(() => {
            // Invalidate React Query cache to ensure fresh data
            queryClient.invalidateQueries({
              queryKey: queryKeys.projects.detail(projectId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.projects.lists(),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.projects.advanced(user?.id || ''),
            });

            logger.info('Project update cache invalidation completed');
          });
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
    [toast, projectId, queryClient, user?.id, removeBeforeUnloadListener, project, navigateToProject]
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
      
      logger.debug(`Updating project ${projectId} status to archived`);
      await pb.collection('projects').update(projectId, {
        status: 'archived',
      });
      logger.debug(`Project ${projectId} status updated to archived successfully`);

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
      
      logger.debug(`Deleting project ${projectId} with sequential deletion and error recovery`);

      const deletedItems: Array<{type: string, id: string}> = [];

      // Fetch all related records in parallel for better performance
      const [progressNotes, projectTags] = await Promise.all([
        pb.collection('progress_notes').getFullList({
          filter: pb.filter('project = {:projectId}', { projectId }),
          fields: 'id', // Only need IDs for deletion
        }),
        pb.collection('project_tags').getFullList({
          filter: pb.filter('project = {:projectId}', { projectId }),
          fields: 'id', // Only need IDs for deletion
        }),
      ]);

      logger.debug(
        `Found ${progressNotes.length} progress notes and ${projectTags.length} project tags to delete for project ${projectId}`
      );

      try {
        // Step 1: Delete progress notes sequentially
        for (const note of progressNotes) {
          await pb.collection('progress_notes').delete(note.id);
          deletedItems.push({type: 'progress_notes', id: note.id});
          logger.debug(`Deleted progress note ${note.id}`);
        }

        // Step 2: Delete project tags sequentially
        for (const projectTag of projectTags) {
          await pb.collection('project_tags').delete(projectTag.id);
          deletedItems.push({type: 'project_tags', id: projectTag.id});
          logger.debug(`Deleted project tag ${projectTag.id}`);
        }

        // Step 3: Delete the project (final step - no rollback needed after this)
        await pb.collection('projects').delete(projectId);
        deletedItems.push({type: 'projects', id: projectId});

        logger.debug(`Successfully deleted project ${projectId} and ${deletedItems.length - 1} related records`);

        unsafeNavigate('/dashboard');
        
      } catch (deleteError) {
        logger.error('Error during project deletion, partial deletion occurred:', deleteError);
        logger.warn(`Deletion failed after removing ${deletedItems.length} items:`, deletedItems);
        
        // Don't throw here - handle error gracefully like original service
        toast({
          title: 'Error deleting project',
          description: `Failed to delete project: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}. ${deletedItems.length} items were deleted before the error occurred.`,
          variant: 'destructive',
        });
        return;
      }
    } catch (error) {
      logger.error('Error during project deletion:', error);
      toast({
        title: 'Error deleting project',
        description: error instanceof Error ? error.message : 'Failed to delete project and related data',
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
