import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useDeleteProject } from '@/hooks/mutations/useDeleteProject';
import { useUpdateProject } from '@/hooks/mutations/useUpdateProject';
import { ProjectType } from '@/types/project';
import { UseAdvancedEditSelectionReturn } from './useAdvancedEditSelection';
import { logger } from '@/utils/logger';

interface UseAdvancedEditActionsReturn {
  handleBulkDelete: () => Promise<void>;
  handleProjectUpdate: (projectId: string, updates: Partial<ProjectType>) => Promise<void>;
  navigateToNewProject: () => void;
  navigateToCompanies: () => void;
  navigateToArtists: () => void;
  navigateToTags: () => void;
  isDeleting: boolean;
  isUpdating: boolean;
}

/**
 * Custom hook for handling bulk operations and navigation in Advanced Edit
 *
 * @param selection - Selection state from useAdvancedEditSelection
 * @param allFilteredProjects - All filtered projects for title lookup
 * @returns Action handlers and loading states
 */
export const useAdvancedEditActions = (
  selection: UseAdvancedEditSelectionReturn,
  allFilteredProjects: ProjectType[]
): UseAdvancedEditActionsReturn => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const deleteProjectMutation = useDeleteProject();
  const updateProjectMutation = useUpdateProject();

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    const selectedProjectIds = Array.from(selection.selectedProjects);
    const failedDeletions: string[] = [];
    let successCount = 0;

    // Clear selection immediately to prevent stale UI state
    selection.clearSelection();

    // Delete all selected projects sequentially, tracking failures
    for (const projectId of selectedProjectIds) {
      try {
        const project = allFilteredProjects.find(p => p.id === projectId);
        await deleteProjectMutation.mutateAsync({
          id: projectId,
          title: project?.title,
        });
        successCount++;
      } catch (error) {
        logger.error(`Delete failed for project ${projectId}:`, error);
        failedDeletions.push(projectId);
      }
    }

    // If there were failures, repopulate selection with failed IDs
    if (failedDeletions.length > 0) {
      failedDeletions.forEach(id => selection.selectProject(id));

      toast({
        title: 'Partial Delete Failure',
        description: `${successCount} project${successCount !== 1 ? 's' : ''} deleted successfully. ${failedDeletions.length} project${failedDeletions.length !== 1 ? 's' : ''} could not be deleted.`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Projects Deleted',
        description: `Successfully deleted ${selectedProjectIds.length} project${selectedProjectIds.length !== 1 ? 's' : ''}.`,
      });
    }
  }, [selection, allFilteredProjects, deleteProjectMutation, toast]);

  // Project update handler
  const handleProjectUpdate = useCallback(
    async (projectId: string, updates: Partial<ProjectType>) => {
      try {
        // Log the update for debugging
        logger.log('Updating project:', projectId, 'with updates:', updates);

        await updateProjectMutation.mutateAsync({
          id: projectId,
          ...updates,
        });

        toast({
          title: 'Project Updated',
          description: 'Project has been updated successfully.',
        });
      } catch (error) {
        logger.error('Project update failed:', error);
        logger.error('Update payload was:', { id: projectId, ...updates });

        // Extract more specific error information
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isValidationError =
          errorMessage.includes('validation') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('required');

        const isForeignKeyError =
          errorMessage.includes('foreign key') ||
          errorMessage.includes('artist') ||
          errorMessage.includes('company') ||
          errorMessage.includes('relation');

        let description = 'Failed to update project. Please try again.';

        if (isForeignKeyError) {
          description =
            'Invalid artist or company selection. Please try selecting from the dropdown again.';
        } else if (isValidationError) {
          description = 'Invalid data provided. Please check your input and try again.';
        }

        toast({
          title: 'Update Failed',
          description,
          variant: 'destructive',
        });
      }
    },
    [updateProjectMutation, toast]
  );

  // Navigation handlers
  const navigateToNewProject = useCallback(() => {
    navigate('/projects/new');
  }, [navigate]);

  const navigateToCompanies = useCallback(() => {
    navigate('/companies');
  }, [navigate]);

  const navigateToArtists = useCallback(() => {
    navigate('/artists');
  }, [navigate]);

  const navigateToTags = useCallback(() => {
    navigate('/tags');
  }, [navigate]);

  return {
    handleBulkDelete,
    handleProjectUpdate,
    navigateToNewProject,
    navigateToCompanies,
    navigateToArtists,
    navigateToTags,
    isDeleting: deleteProjectMutation.isPending,
    isUpdating: updateProjectMutation.isPending,
  };
};
