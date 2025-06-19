import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ProgressNote } from '@/types/project';
import { progressNotesService } from '@/services';
import { queryKeys } from './queryKeys';
import { analytics } from '@/services/analytics';

interface AddProgressNoteData {
  date: string;
  content: string;
  imageFile?: File;
}

interface UpdateProgressNoteData {
  noteId: string;
  newContent: string;
}

interface DeleteProgressNoteData {
  noteId: string;
}

interface DeleteProgressNoteImageData {
  noteId: string;
}

interface UpdateGeneralNotesData {
  newNotes: string;
}

/**
 * Query hook to fetch progress notes for a project
 */
export function useProgressNotesQuery(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.progressNotes.list(projectId || ''),
    queryFn: async (): Promise<ProgressNote[]> => {
      if (!projectId) return [];

      return await progressNotesService.fetchProgressNotes(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    // Add placeholder data for immediate UI feedback
    placeholderData: () => [],
    // Reduce initial loading time perception
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation hook to add a progress note
 */
export function useAddProgressNoteMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (noteData: AddProgressNoteData) => {
      return await progressNotesService.addProgressNote(projectId, noteData);
    },
    onSuccess: progressNote => {
      // Show success toast
      toast({
        title: 'Success',
        description: 'Progress note added successfully',
      });

      // Track analytics
      analytics.progressNote.created(projectId, !!progressNote);

      // Invalidate and refetch progress notes for this project
      queryClient.invalidateQueries({
        queryKey: queryKeys.progressNotes.list(projectId),
      });

      // Also invalidate the project detail query as it may contain progress note data
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
    },
    onError: (error: Error) => {
      analytics.error.databaseOperation('create', 'progress_notes', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook to update a progress note
 */
export function useUpdateProgressNoteMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ noteId, newContent }: UpdateProgressNoteData) => {
      return await progressNotesService.updateProgressNote(noteId, newContent);
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: 'Success',
        description: 'Progress note updated successfully',
      });

      // Invalidate and refetch progress notes for this project
      queryClient.invalidateQueries({
        queryKey: queryKeys.progressNotes.list(projectId),
      });
    },
    onError: (error: Error) => {
      analytics.error.databaseOperation('update', 'progress_notes', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook to delete a progress note
 */
export function useDeleteProgressNoteMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ noteId }: DeleteProgressNoteData) => {
      return await progressNotesService.deleteProgressNote(noteId);
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: 'Success',
        description: 'Progress note deleted successfully',
      });

      // Invalidate and refetch progress notes for this project
      queryClient.invalidateQueries({
        queryKey: queryKeys.progressNotes.list(projectId),
      });
    },
    onError: (error: Error) => {
      analytics.error.databaseOperation('delete', 'progress_notes', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook to delete a progress note image
 */
export function useDeleteProgressNoteImageMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ noteId }: DeleteProgressNoteImageData) => {
      return await progressNotesService.deleteProgressNoteImage(noteId);
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: 'Success',
        description: 'Progress note image deleted successfully',
      });

      // Invalidate and refetch progress notes for this project
      queryClient.invalidateQueries({
        queryKey: queryKeys.progressNotes.list(projectId),
      });
    },
    onError: (error: Error) => {
      analytics.error.databaseOperation('update', 'progress_notes', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook to update general notes for a project
 */
export function useUpdateGeneralNotesMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ newNotes }: UpdateGeneralNotesData) => {
      return await progressNotesService.updateGeneralNotes(projectId, newNotes);
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: 'Success',
        description: 'General notes updated successfully',
      });

      // Invalidate and refetch the project detail query
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });

      // Also invalidate progress notes in case the service returns updated notes
      queryClient.invalidateQueries({
        queryKey: queryKeys.progressNotes.list(projectId),
      });
    },
    onError: (error: Error) => {
      analytics.error.databaseOperation('update', 'projects', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
