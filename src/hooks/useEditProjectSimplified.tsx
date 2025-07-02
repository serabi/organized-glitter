/**
 * @fileoverview Comprehensive project editing hook with field mapping and state management
 *
 * This hook provides complete project editing functionality including:
 * - Data fetching with expanded relations
 * - Form state management with dirty tracking
 * - Critical field name mapping (camelCase ↔ snake_case)
 * - File upload handling
 * - Tag synchronization
 * - Navigation protection
 * - CRUD operations with confirmations
 *
 * @author Organized Glitter Team
 * @since 1.0.0
 * @version 1.1.0 - Added field mapping fix for date fields
 */

import { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProjectType, ProjectFormValues } from '@/types/project';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationWithWarning } from '@/hooks/useNavigationWithWarning';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import { useNavigateToProject, NavigationContext } from '@/hooks/useNavigateToProject';
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
import { useDeleteProjectMutation } from '@/hooks/mutations/useProjectDetailMutations';

const logger = createLogger('useEditProjectSimplified');

/**
 * Extended project interface with PocketBase expand relations
 *
 * @interface ProjectWithExpand
 * @extends ProjectsResponse
 *
 * @property expand - Optional expanded relations from PocketBase
 * @property expand.company - Expanded company information
 * @property expand.artist - Expanded artist information
 * @property expand.user - Expanded user information
 * @property expand.project_tags_via_project - Expanded tag relationships
 */
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
 * Transform PocketBase record to ProjectType format
 *
 * @param record - PocketBase project record with expanded relations
 * @returns Transformed project data in ProjectType format
 *
 * @description Converts snake_case database fields to camelCase frontend format,
 * handles date field extraction, and properly maps related entities (company, artist)
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

/**
 * Creates a toast adapter that maps extended variant types to supported ones
 *
 * @param toast - Base toast function with limited variant support
 * @returns Enhanced toast function that accepts additional variant types
 *
 * @description Maps 'success' and 'warning' variants to 'default' since the base
 * toast component only supports 'default' and 'destructive' variants
 */
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

/**
 * Prepares initial form data from a project object
 *
 * @param project - Project data to transform into form values
 * @returns Form data structure ready for form initialization
 *
 * @description Converts ProjectType data to ProjectFormValues format,
 * handling type conversions and setting appropriate defaults for form fields
 */
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
 * Comprehensive hook for project editing functionality
 *
 * @param projectId - ID of the project to edit (undefined for new projects)
 * @returns Object containing project data, form handlers, and UI state
 *
 * @description This hook provides a complete project editing solution that includes:
 * - Project data fetching with expanded relations (company, artist, tags)
 * - Form state management with dirty state tracking
 * - Field name mapping between camelCase (frontend) and snake_case (PocketBase)
 * - File upload handling for project images
 * - Tag synchronization between frontend and backend
 * - Navigation protection for unsaved changes
 * - Archive and delete operations with confirmation dialogs
 * - Real-time cache invalidation for optimal UX
 *
 * @example
 * ```tsx
 * const {
 *   project,
 *   formData,
 *   handleSubmit,
 *   isDirty,
 *   ConfirmationDialog
 * } = useEditProjectSimplified(projectId);
 * ```
 *
 * @throws Will show toast notifications for network errors and validation failures
 *
 * @since 1.0.0 - Initial implementation
 * @since 1.1.0 - Added field name mapping fix for date fields
 */
export const useEditProjectSimplified = (projectId: string | undefined) => {
  const { toast } = useServiceToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const navigateToProject = useNavigateToProject();
  const deleteProjectMutation = useDeleteProjectMutation();

  // Extract navigation state from location
  const navigationState = location.state as {
    fromNavigation?: boolean;
    projectId?: string;
    timestamp?: number;
    navigationContext?: NavigationContext;
  } | null;

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

  /**
   * Handles form field changes and dirty state tracking
   *
   * @param data - Partial form data with updated field values
   *
   * @description Updates form state, tracks dirty status, and handles
   * special logic for image file selection
   */
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

  /**
   * Handles form submission with comprehensive project update logic
   *
   * @param data - Complete form data to submit
   *
   * @description Performs a complete project update including:
   * - Field name mapping from camelCase to snake_case for PocketBase compatibility
   * - Company/artist name resolution to database IDs
   * - Image file upload handling
   * - Tag synchronization (add/remove operations)
   * - Cache invalidation and navigation after successful update
   * - Comprehensive error handling with user feedback
   *
   * @throws Shows toast notifications for validation errors and network failures
   */
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
            const companyRecord = await pb.collection('companies').getFirstListItem(
              pb.filter('name = {:name} && user = {:user}', {
                name: dataToSubmit.company,
                user: user?.id,
              })
            );
            companyId = companyRecord?.id || null;
          } catch (error) {
            logger.warn('Company not found:', dataToSubmit.company);
            toast({
              title: 'Company Not Found',
              description: `The company "${dataToSubmit.company}" was not found in your list. The project will be updated without a company association. You can add this company later if needed.`,
              variant: 'destructive',
            });
            companyId = null;
          }
        }

        if (dataToSubmit.artist) {
          try {
            const artistRecord = await pb.collection('artists').getFirstListItem(
              pb.filter('name = {:name} && user = {:user}', {
                name: dataToSubmit.artist,
                user: user?.id,
              })
            );
            artistId = artistRecord?.id || null;
          } catch (error) {
            logger.warn('Artist not found:', dataToSubmit.artist);
            toast({
              title: 'Artist Not Found',
              description: `The artist "${dataToSubmit.artist}" was not found in your list. The project will be updated without an artist association. You can add this artist later if needed.`,
              variant: 'destructive',
            });
            artistId = null;
          }
        }

        // Create FormData for the update (handles image uploads)
        const formData = new FormData();

        // Add all form fields except special ones
        const fieldsToExclude = [
          'id',
          'tags',
          'tagIds',
          'imageFile',
          '_imageReplacement',
          'company',
          'artist',
        ];

        // Date fields that should allow empty strings (to clear the field in PocketBase)
        // Note: These are the camelCase form field names that need conversion to snake_case
        const dateFields = ['datePurchased', 'dateReceived', 'dateStarted', 'dateCompleted'];

        // Map camelCase form fields to snake_case PocketBase fields
        // CRITICAL: This mapping is required because frontend uses camelCase
        // but PocketBase database expects snake_case field names
        const fieldNameMap: Record<string, string> = {
          datePurchased: 'date_purchased',
          dateReceived: 'date_received',
          dateStarted: 'date_started',
          dateCompleted: 'date_completed',
        };

        Object.entries(dataToSubmit).forEach(([key, value]) => {
          if (!fieldsToExclude.includes(key) && value !== undefined && value !== null) {
            // For date fields, allow empty strings (required to clear DateFields in PocketBase)
            // For other fields, skip empty strings to avoid overwriting with empty values
            const shouldInclude = dateFields.includes(key) ? true : value !== '';

            if (shouldInclude) {
              // Convert camelCase field names to snake_case for PocketBase
              const fieldName = fieldNameMap[key] || key;
              formData.append(fieldName, String(value));

              // Log date field updates for debugging
              if (dateFields.includes(key)) {
                logger.debug(`Date field update: ${key} -> ${fieldName} = "${value}"`);
              }
            }
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

        // Log FormData contents for debugging (excluding sensitive data)
        const actualDateFieldsInFormData = Object.values(fieldNameMap).filter(field =>
          formData.has(field)
        );
        logger.debug('Updating project with FormData:', {
          projectId,
          fieldsCount: Array.from(formData.keys()).length,
          dateFields: actualDateFieldsInFormData.map(field => ({
            field,
            value: formData.get(field),
          })),
          allFormDataKeys: Array.from(formData.keys()),
        });

        // Update the project in PocketBase
        const updatedProject = await pb
          .collection(Collections.Projects)
          .update(projectId, formData);

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

          // Check if we should return to dashboard with preserved position
          const shouldReturnToDashboard = navigationState?.navigationContext && 
                                        navigationState.navigationContext.preservationContext?.isEditNavigation;

          if (shouldReturnToDashboard) {
            logger.info('🚀 Returning to dashboard with preserved position after edit');
            
            // Navigate back to dashboard with preserved context
            navigate('/dashboard', {
              replace: true,
              state: {
                fromEdit: true,
                editedProjectId: projectId,
                editedProjectData: response.data,
                timestamp: Date.now(),
                navigationContext: navigationState.navigationContext,
                preservePosition: true,
              }
            });
          } else {
            // Navigate back to project detail page using React Router
            logger.info('🚀 Navigating back to project detail page');
            await navigateToProject(projectId, {
              projectData: response.data,
              replace: true, // Replace current history entry since we're coming from edit
            });
          }

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
        logger.error('Network error updating project:', error);
        toast({
          title: 'Error updating project',
          description: error instanceof Error ? error.message : 'Network error',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [
      toast,
      projectId,
      queryClient,
      user?.id,
      removeBeforeUnloadListener,
      project,
      navigateToProject,
      navigate,
      navigationState,
    ]
  );

  /**
   * Handles project archiving with confirmation and unsaved changes protection
   *
   * @description Archives the current project by setting its status to 'archived'.
   * Includes protection for unsaved changes and requires user confirmation.
   * Navigates to dashboard after successful archiving.
   */
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

  /**
   * Handles project deletion with confirmation and unsaved changes protection
   *
   * @description Permanently deletes the current project using React Query mutation.
   * Includes protection for unsaved changes and requires user confirmation.
   * Navigates to dashboard after successful deletion.
   */
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

      // Use React Query mutation for deletion
      await deleteProjectMutation.mutateAsync({
        projectId,
        title: project.title,
      });

      // Navigation and cache invalidation are handled by the mutation
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
  }, [
    projectId,
    project,
    isDirty,
    toast,
    unsafeNavigate,
    confirmUnsavedChanges,
    confirmDelete,
    deleteProjectMutation,
  ]);

  /**
   * Refreshes company and artist lists from the database
   *
   * @description Reloads the current user's companies and artists lists
   * to ensure form dropdowns have the latest data
   */
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
    // Data
    /** Current project data or null if not loaded */
    project,
    /** Whether initial project data is loading */
    loading,
    /** Whether a submit/update operation is in progress */
    submitting,
    /** Available company names for dropdown */
    companies,
    /** Available artist names for dropdown */
    artists,
    /** Current form data values */
    formData,

    // State
    /** Whether form has unsaved changes */
    isDirty,
    /** Whether user has selected a new image file */
    hasSelectedNewImage,

    // Navigation
    /** Navigation function that warns about unsaved changes */
    navigateWithWarning,
    /** Current navigation state and pending navigation info */
    navigationState,
    /** Clear any navigation errors */
    clearNavigationError,

    // Handlers
    /** Update form data and dirty state */
    handleFormChange,
    /** Submit form data with field mapping and validation */
    handleSubmit,
    /** Archive project with confirmation */
    handleArchive,
    /** Delete project with confirmation */
    handleDelete,
    /** Refresh company and artist lists */
    refreshLists,

    // UI Components
    /** Confirmation dialog component for user interactions */
    ConfirmationDialog,
  };
};
