import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ProgressNote } from '@/types/project';
import { pb } from '@/lib/pocketbase';
import { queryKeys } from './queryKeys';
import { requireValidAuthStore } from '@/utils/authGuards';

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

      // Fetch progress notes using direct PocketBase call
      const filter = pb.filter('project = {:projectId}', { projectId });
      const notes = await pb.collection('progress_notes').getFullList({
        filter,
        sort: '-date,-created', // Sort by date descending, then by created descending
        expand: 'project',
        requestKey: `progress-notes-${projectId}`,
      });

      // Transform PocketBase records to ProgressNote format
      const progressNotes: ProgressNote[] = notes.map(note => ({
        id: note.id,
        projectId: note.project,
        content: note.content,
        date: note.date,
        imageUrl: note.image ? pb.files.getURL(note, note.image) : undefined,
        createdAt: note.created,
        updatedAt: note.updated,
      }));

      return progressNotes;
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
    mutationFn: async (noteData: AddProgressNoteData): Promise<ProgressNote> => {
      // Check authentication
      requireValidAuthStore();

      // Prepare data for PocketBase
      const data: Record<string, unknown> = {
        project: projectId,
        content: noteData.content,
        date: noteData.date,
      };

      // Add image file if provided
      if (noteData.imageFile) {
        data.image = noteData.imageFile;
      }

      const record = await pb.collection('progress_notes').create(data);

      // Transform the created record to ProgressNote format
      const progressNote: ProgressNote = {
        id: record.id,
        projectId: record.project,
        content: record.content,
        date: record.date,
        imageUrl: record.image ? pb.files.getURL(record, record.image) : undefined,
        createdAt: record.created,
        updatedAt: record.updated,
      };

      return progressNote;
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: 'Success',
        description: 'Progress note added successfully',
      });

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
    mutationFn: async ({ noteId, newContent }: UpdateProgressNoteData): Promise<ProgressNote> => {
      // Check authentication
      requireValidAuthStore();

      const record = await pb.collection('progress_notes').update(noteId, {
        content: newContent,
      });

      // Transform the updated record to ProgressNote format
      const progressNote: ProgressNote = {
        id: record.id,
        projectId: record.project,
        content: record.content,
        date: record.date,
        imageUrl: record.image ? pb.files.getURL(record, record.image) : undefined,
        createdAt: record.created,
        updatedAt: record.updated,
      };

      return progressNote;
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
    mutationFn: async ({ noteId }: DeleteProgressNoteData): Promise<void> => {
      // Check authentication
      requireValidAuthStore();

      await pb.collection('progress_notes').delete(noteId);
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
    mutationFn: async ({ noteId }: DeleteProgressNoteImageData): Promise<ProgressNote> => {
      // Check authentication
      requireValidAuthStore();

      // Update the note to remove the image field
      const record = await pb.collection('progress_notes').update(noteId, {
        image: null,
      });

      // Transform the updated record to ProgressNote format
      const progressNote: ProgressNote = {
        id: record.id,
        projectId: record.project,
        content: record.content,
        date: record.date,
        imageUrl: record.image ? pb.files.getURL(record, record.image) : undefined,
        createdAt: record.created,
        updatedAt: record.updated,
      };

      return progressNote;
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
    mutationFn: async ({ newNotes }: UpdateGeneralNotesData): Promise<void> => {
      // Check authentication
      requireValidAuthStore();

      // Update the project's general notes field
      await pb.collection('projects').update(projectId, {
        general_notes: newNotes,
      });
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
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
