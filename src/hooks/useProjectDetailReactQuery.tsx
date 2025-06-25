import { useProjectDetailQuery } from '@/hooks/queries/useProjectDetailQuery';
import {
  useUpdateProjectStatusMutation,
  useUpdateProjectNotesMutation,
  useAddProgressNoteMutation,
  useUpdateProgressNoteMutation,
  useDeleteProgressNoteMutation,
  useDeleteProgressNoteImageMutation,
  useArchiveProjectMutation,
  useDeleteProjectMutation,
} from '@/hooks/mutations/useProjectDetailMutations';
import { useAuth } from '@/hooks/useAuth';
import { ProjectStatus } from '@/types/project';

/**
 * React Query-based hook for managing a project's details, status, notes, and progress notes
 * This replaces the original useProjectDetail hook with React Query for better caching and state management
 * Now includes authentication state to prevent race conditions
 */
export const useProjectDetailReactQuery = (projectId: string | undefined) => {
  // Get authentication state to prevent race conditions
  const { isAuthenticated, initialCheckComplete } = useAuth();
  
  // Log auth state for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[useProjectDetailReactQuery] Auth state:', {
      projectId,
      isAuthenticated,
      initialCheckComplete
    });
  }

  // Main project detail query with auth dependencies
  const { data: project, isLoading: loading, error, refetch } = useProjectDetailQuery(
    projectId,
    isAuthenticated,
    initialCheckComplete
  );

  // Mutation hooks
  const updateStatusMutation = useUpdateProjectStatusMutation();
  const updateNotesMutation = useUpdateProjectNotesMutation();
  const addProgressNoteMutation = useAddProgressNoteMutation();
  const updateProgressNoteMutation = useUpdateProgressNoteMutation();
  const deleteProgressNoteMutation = useDeleteProgressNoteMutation();
  const deleteProgressNoteImageMutation = useDeleteProgressNoteImageMutation();
  const archiveProjectMutation = useArchiveProjectMutation();
  const deleteProjectMutation = useDeleteProjectMutation();

  // Check if any mutation is in progress
  const submitting =
    updateStatusMutation.isPending ||
    updateNotesMutation.isPending ||
    addProgressNoteMutation.isPending ||
    updateProgressNoteMutation.isPending ||
    deleteProgressNoteMutation.isPending ||
    deleteProgressNoteImageMutation.isPending ||
    archiveProjectMutation.isPending ||
    deleteProjectMutation.isPending;

  /**
   * Update a project's status
   */
  const handleUpdateStatus = async (newStatus: ProjectStatus): Promise<boolean> => {
    if (!projectId || !project) return false;

    try {
      await updateStatusMutation.mutateAsync({ projectId, status: newStatus });
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * Update the general notes for a project
   */
  const handleUpdateNotes = async (newNotes: string): Promise<void> => {
    if (!projectId || !project) return;

    await updateNotesMutation.mutateAsync({ projectId, notes: newNotes });
  };

  /**
   * Add a new progress note
   */
  const handleAddProgressNote = async (noteData: {
    date: string;
    content: string;
    imageFile?: File;
  }): Promise<void> => {
    if (!projectId || !project) return;

    await addProgressNoteMutation.mutateAsync({ projectId, noteData });
  };

  /**
   * Update an existing progress note
   */
  const handleUpdateProgressNote = async (noteId: string, newContent: string): Promise<void> => {
    if (!projectId || !project) return;

    await updateProgressNoteMutation.mutateAsync({ noteId, projectId, content: newContent });
  };

  /**
   * Delete a progress note
   */
  const handleDeleteProgressNote = async (noteId: string): Promise<void> => {
    if (!projectId || !project) return;

    await deleteProgressNoteMutation.mutateAsync({ noteId });
  };

  /**
   * Remove an image from a progress note
   */
  const handleDeleteProgressNoteImage = async (noteId: string): Promise<void> => {
    if (!projectId || !project) return;

    await deleteProgressNoteImageMutation.mutateAsync({ noteId, projectId });
  };

  /**
   * Archive a project and navigate to dashboard
   */
  const handleArchive = async (): Promise<boolean> => {
    if (!projectId) return false;

    try {
      await archiveProjectMutation.mutateAsync({ projectId });
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * Delete a project and navigate to dashboard
   */
  const handleDelete = async (): Promise<boolean> => {
    if (!projectId) return false;

    try {
      await deleteProjectMutation.mutateAsync({ projectId });
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * Get a human-readable label for a status
   */
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'wishlist':
        return 'Wishlist';
      case 'purchased':
        return 'Purchased - Not Received';
      case 'stash':
        return 'In Stash';
      case 'progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'destashed':
        return 'Destashed';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  };

  /**
   * Get color classes for a status
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'wishlist':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'purchased':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'stash':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'progress':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'completed':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'destashed':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
      case 'archived':
        return 'bg-gray-500 text-white dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return {
    project,
    loading,
    submitting,
    error,
    refetch,
    handleUpdateStatus,
    handleUpdateNotes,
    handleAddProgressNote,
    handleUpdateProgressNote,
    handleDeleteProgressNote,
    handleDeleteProgressNoteImage,
    handleArchive,
    handleDelete,
    getStatusLabel,
    getStatusColor,
  };
};
