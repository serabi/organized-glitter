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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProjectType, ProjectFormValues } from '@/types/project';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationWithWarning } from '@/hooks/useNavigationWithWarning';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import { useNavigateToProject } from '@/hooks/useNavigateToProject';
import { useProjectDetailQuery } from '@/hooks/queries/useProjectDetailQuery';
import { useArchiveProjectMutation, useDeleteProjectMutation } from '@/hooks/mutations/useProjectDetailMutations';
import { useUpdateProject } from '@/hooks/mutations/useUpdateProject';
import { useMetadata } from '@/contexts/MetadataContext';
import { extractDateOnly } from '@/lib/utils';
import { useServiceToast } from '@/utils/toast-adapter';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useEditProject');

/**
 * Prepare initial form data from project
 * 
 * @param project - Project data from useProjectDetailQuery
 * @returns Form data prepared for editing
 */
const prepareFormInitialData = (project: ProjectType): ProjectFormValues => {
  return {
    title: project.title || '',
    userId: project.userId,
    company: project.company || '',
    artist: project.artist || '',
    status: project.status || 'wishlist',
    kit_category: project.kit_category || undefined,
    drillShape: project.drillShape || '',
    datePurchased: project.datePurchased || '',
    dateStarted: project.dateStarted || '',
    dateCompleted: project.dateCompleted || '',
    dateReceived: project.dateReceived || '',
    width: project.width?.toString() || '',
    height: project.height?.toString() || '',
    totalDiamonds: project.totalDiamonds || 0,
    generalNotes: project.generalNotes || '',
    sourceUrl: project.sourceUrl || '',
    tags: project.tags || [],
  };
};

/**
 * Enhanced project editing hook using React Query patterns
 * 
 * @param projectId - ID of the project to edit
 * @returns Complete editing state and handlers
 */
export const useEditProject = (projectId: string | undefined) => {
  // Authentication state with proper dependencies
  const { user, isAuthenticated, initialCheckComplete, isLoading: authLoading } = useAuth();
  
  // Data fetching with authentication dependencies - this prevents race conditions
  const { 
    data: project, 
    isLoading: projectLoading, 
    error: projectError,
    refetch: refetchProject 
  } = useProjectDetailQuery(projectId, isAuthenticated, initialCheckComplete);

  // Mutations for project operations
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProjectMutation();
  const archiveProjectMutation = useArchiveProjectMutation();

  // Metadata for dropdowns
  const { companies, artists } = useMetadata();

  // Form state
  const [formData, setFormData] = useState<ProjectFormValues | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Navigation state with proper isDirty check
  const isDirty = Boolean(formData && project && JSON.stringify(formData) !== JSON.stringify(prepareFormInitialData(project)));
  const { ConfirmationDialog: NavigationDialog, confirmUnsavedChanges } = useConfirmationDialog();
  const { navigationState, clearNavigationError } = useNavigationWithWarning({
    isDirty,
    confirmationDialog: { confirmUnsavedChanges }
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
      const initialData = prepareFormInitialData(project);
      setFormData(initialData);
      logger.debug('Form data initialized from project', { projectId: project.id });
    }
  }, [project, formData]);

  // Form change handler (field-by-field)
  const handleFormChange = useCallback((field: keyof ProjectFormValues, value: any) => {
    setFormData(prev => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };
      logger.debug('Form field updated', { field, value });
      return updated;
    });
  }, []);

  // Form data change handler (full data)
  const handleFormDataChange = useCallback((data: ProjectFormValues) => {
    setFormData(data);
    logger.debug('Form data updated', { data });
  }, []);

  // Submit handler with proper error handling
  const handleSubmit = useCallback(async (data: ProjectFormValues) => {
    if (!project || !data) {
      logger.error('Missing project or form data for submit');
      return;
    }

    try {
      setSubmitting(true);
      logger.debug('Starting project update', { projectId: project.id });

      // Convert camelCase to snake_case for PocketBase
      const updateData = {
        id: project.id,
        title: data.title,
        company: data.company,
        artist: data.artist,
        status: data.status,
        kit_category: data.kit_category,
        drill_shape: data.drillShape,
        date_purchased: data.datePurchased || null,
        date_started: data.dateStarted || null,
        date_completed: data.dateCompleted || null,
        date_received: data.dateReceived || null,
        width: data.width ? parseInt(data.width, 10) : null,
        height: data.height ? parseInt(data.height, 10) : null,
        total_diamonds: typeof data.totalDiamonds === 'string' ? parseInt(data.totalDiamonds, 10) : data.totalDiamonds || null,
        general_notes: data.generalNotes,
        source_url: data.sourceUrl,
      };

      await updateProjectMutation.mutateAsync(updateData);

      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });

      // Navigate back to project detail
      navigateToProject(project.id);
      
    } catch (error) {
      logger.error('Error updating project', { error, projectId: project.id });
      toast({
        title: 'Error',
        description: 'Failed to update project',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }, [project, updateProjectMutation, toast, navigateToProject]);

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
    
    // Error state
    error: projectError,
  };
};