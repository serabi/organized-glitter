/**
 * @fileoverview React Query-based project editing hook with proper authentication dependencies
 *
 * This hook provides complete project editing functionality using React Query patterns:
 * - Proper authentication state dependencies to prevent race conditions
 * - Consistent data fetching with useProjectDetailQuery
 * - Form state management with dirty tracking
 * - Field name mapping (camelCase ↔ snake_case)
 * - File upload handling
 * - Tag synchronization
 * - Navigation protection
 * - CRUD operations with confirmations
 *
 * @author Organized Glitter Team
 * @since 2.0.0 - Migrated to React Query patterns to fix 404 authentication race conditions
 */

import { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProjectType, ProjectFormValues } from '@/types/project';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationWithWarning } from '@/hooks/useNavigationWithWarning';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import { useNavigateToProject, NavigationContext } from '@/hooks/useNavigateToProject';
import { useProjectDetailQuery } from '@/hooks/queries/useProjectDetailQuery';
import {
  useArchiveProjectMutation,
  useDeleteProjectMutation,
} from '@/hooks/mutations/useProjectDetailMutations';
import { useMetadata } from '@/contexts/MetadataContext';
import { useServiceToast } from '@/utils/toast-adapter';
import { useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { updateProjectInCache } from '@/utils/cacheUtils';
import { createLogger } from '@/utils/secureLogger';
import { prepareProjectFormData, getChangedFields, transformProjectFromPocketBase } from '@/utils/projectTransformers';
import { buildProjectFormData } from '@/utils/field-mapping';
import { useTagSync } from '@/hooks/useTagSync';
import type { ProjectWithExpand } from '@/utils/projectTransformers';

const logger = createLogger('useEditProject');

/**
 * Enhanced project editing hook using React Query patterns
 *
 * @param projectId - ID of the project to edit
 * @returns Complete editing state and handlers
 */
export const useEditProject = (projectId: string | undefined) => {
  // Authentication state
  const { user, isAuthenticated, initialCheckComplete, isLoading: authLoading } = useAuth();

  // Data fetching
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useProjectDetailQuery(projectId, isAuthenticated, initialCheckComplete);

  // Mutations for project operations
  const deleteProjectMutation = useDeleteProjectMutation();
  const archiveProjectMutation = useArchiveProjectMutation();

  // Metadata for dropdowns
  const { companies, artists } = useMetadata();

  // Form state
  const [formData, setFormData] = useState<ProjectFormValues | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasSelectedNewImage, setHasSelectedNewImage] = useState(false);

  // Tag synchronization
  const { syncProjectTags } = useTagSync();

  // Navigation and routing
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Extract navigation state from location
  const locationState = location.state as {
    fromNavigation?: boolean;
    projectId?: string;
    timestamp?: number;
    navigationContext?: NavigationContext;
  } | null;

  // Navigation state with proper isDirty check using modular utility
  const isDirty = Boolean(
    formData &&
      project &&
      getChangedFields(prepareProjectFormData(project), formData).length > 0
  );
  const { ConfirmationDialog: NavigationDialog, confirmUnsavedChanges } = useConfirmationDialog();
  const { navigationState, clearNavigationError } = useNavigationWithWarning({
    isDirty,
    confirmationDialog: { confirmUnsavedChanges },
  });
  const navigateToProject = useNavigateToProject();
  const { toast } = useServiceToast();

  // Confirmation dialogs
  const { ConfirmationDialog, confirmDelete, confirmArchive } = useConfirmationDialog();

  // Combined loading state
  const loading = authLoading || projectLoading;

  // Prepare companies and artists arrays
  const companiesList = useMemo(() => {
    return Array.isArray(companies) ? companies.map(c => c.name) : [];
  }, [companies]);

  const artistsList = useMemo(() => {
    return Array.isArray(artists) ? artists.map(a => a.name) : [];
  }, [artists]);

  // Initialize form data when project loads
  useEffect(() => {
    if (project && !formData) {
      const initialData = prepareProjectFormData(project);
      setFormData(initialData);
      logger.debug('Form data initialized from project', { projectId: project.id });
    }
  }, [project, formData]);

  // Form change handler (field-by-field)
  const handleFormChange = useCallback(
    (field: keyof ProjectFormValues, value: ProjectFormValues[keyof ProjectFormValues]) => {
      setFormData(prev => {
        if (!prev) return null;
        const updated = { ...prev, [field]: value };
        logger.debug('Form field updated', { field, value });
        return updated;
      });
    },
    []
  );

  // Form data change handler (full data) - enhanced with image tracking
  const handleFormDataChange = useCallback((data: ProjectFormValues) => {
    setFormData(prevData => {
      const newData = { ...prevData, ...data };

      // Track image file selection
      if (data.imageFile !== undefined) {
        setHasSelectedNewImage(!!data.imageFile);
      }

      logger.debug('Form data updated', {
        fieldsChanged: Object.keys(data),
        hasImageFile: !!data.imageFile,
      });
      return newData;
    });
  }, []);

  // Enhanced submit handler with modular utilities
  const handleSubmit = useCallback(
    async (data: ProjectFormValues) => {
      if (!project || !data) {
        logger.error('Missing project or form data for submit');
        return;
      }

      try {
        setSubmitting(true);
        logger.debug('Starting enhanced project update', { projectId: project.id });

        // Prepare data for submission with proper typing
        const dataToSubmit: ProjectFormValues = {
          ...data,
          totalDiamonds:
            typeof data.totalDiamonds === 'string' && data.totalDiamonds
              ? Number(data.totalDiamonds)
              : data.totalDiamonds,
          tagIds: data.tags?.map(tag => tag.id) ?? [],
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
              description: `The company "${dataToSubmit.company}" was not found. The project will be updated without a company association.`,
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
              description: `The artist "${dataToSubmit.artist}" was not found. The project will be updated without an artist association.`,
              variant: 'destructive',
            });
            artistId = null;
          }
        }

        // Build FormData using modular utility
        const formData = buildProjectFormData(dataToSubmit, {
          companyId,
          artistId,
          userTimezone: user?.timezone,
        });

        // Update the project in PocketBase with field mapping
        const updatedProjectRecord = await pb
          .collection(Collections.Projects)
          .update(project.id, formData);

        // Transform the updated project record to ProjectType format
        const transformedProject = transformProjectFromPocketBase(updatedProjectRecord as ProjectWithExpand);

        // Handle tag synchronization using modular utility
        const currentTags = data.tags || [];
        const originalTags = project?.tags || [];
        
        const syncResult = await syncProjectTags(project.id, originalTags, currentTags);
        
        // Log sync result for debugging
        logger.debug('Tag synchronization result', {
          projectId: project.id,
          success: syncResult.success,
          added: syncResult.addedCount,
          removed: syncResult.removedCount,
          errors: syncResult.errors.length,
        });

        // Success feedback
        toast({
          title: 'Project Updated',
          description: `"${project.title}" has been updated successfully.`,
        });

        // Reset form state
        setHasSelectedNewImage(false);

        // Check if we should return to dashboard with preserved position
        const shouldReturnToDashboard = locationState?.navigationContext;

        if (shouldReturnToDashboard) {
          logger.info('Returning to dashboard with preserved position after edit');
          navigate('/dashboard', {
            replace: true,
            state: {
              fromEdit: true,
              editedProjectId: project.id,
              editedProjectData: transformedProject,
              timestamp: Date.now(),
              navigationContext: locationState.navigationContext,
              preservePosition: true,
            },
          });
        } else {
          // Navigate back to project detail
          logger.info('Navigating back to project detail page');
          navigateToProject(project.id, { replace: true });
        }

        // Use optimistic updates to preserve sort order
        startTransition(() => {
          updateProjectInCache(queryClient, project.id, transformedProject, user?.id || '');
          logger.info('Project update optimistic cache updates completed');
        });
      } catch (error) {
        logger.error('Error updating project', { error, projectId: project.id });
        toast({
          title: 'Error updating project',
          description: error instanceof Error ? error.message : 'Network error',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [project, user, toast, navigate, navigateToProject, locationState, queryClient]
  );

  // Archive handler
  const handleArchive = useCallback(async () => {
    if (!project) return;

    const confirmed = await confirmArchive(
      'Archive Project',
      'Are you sure you want to archive this project?'
    );

    if (confirmed) {
      try {
        await archiveProjectMutation.mutateAsync({ projectId: project.id });
        toast({
          title: 'Success',
          description: 'Project archived successfully',
        });
        navigateToProject(project.id);
      } catch (error) {
        logger.error('Error archiving project', { error, projectId: project.id });
        toast({
          title: 'Error',
          description: 'Failed to archive project',
          variant: 'destructive',
        });
      }
    }
  }, [project, archiveProjectMutation, confirmArchive, toast, navigateToProject]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!project) return;

    const confirmed = await confirmDelete(
      'Are you sure you want to delete this project? This action cannot be undone.'
    );

    if (confirmed) {
      try {
        await deleteProjectMutation.mutateAsync({ projectId: project.id, title: project.title });
        toast({
          title: 'Success',
          description: 'Project deleted successfully',
        });
        // Navigate to dashboard after deletion
        window.location.href = '/dashboard';
      } catch (error) {
        logger.error('Error deleting project', { error, projectId: project.id });
        toast({
          title: 'Error',
          description: 'Failed to delete project',
          variant: 'destructive',
        });
      }
    }
  }, [project, deleteProjectMutation, confirmDelete, toast]);

  return {
    // Data
    project,
    loading,
    submitting,
    companies: companiesList,
    artists: artistsList,
    formData,

    // State
    navigationState,
    isDirty,
    hasSelectedNewImage,

    // Handlers
    handleFormChange,
    handleFormDataChange,
    handleSubmit,
    handleArchive,
    handleDelete,
    clearNavigationError,
    refetchProject,

    // Components
    ConfirmationDialog,
    NavigationDialog,

    // Error state
    error: projectError,
  };
};
