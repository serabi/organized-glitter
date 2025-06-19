import React, { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ProjectType, ProgressNote } from '@/types/project';
import { progressNotesService } from '@/services';

/**
 * @deprecated This hook is deprecated. Use the React Query hooks from @/hooks/queries/useProgressNotes instead.
 *
 * Legacy hook for managing progress notes for a diamond art project
 *
 * This hook provides functionality for fetching, adding, updating, and deleting
 * progress notes stored in the dedicated progress_notes table.
 *
 * It leverages the ProgressNotesService to handle all database operations and errors.
 */
export const useProgressNotes = (project: ProjectType | null) => {
  const { toast } = useToast();

  /**
   * Fetch all progress notes for the current project
   */
  const fetchProgressNotes = useCallback(async (): Promise<ProgressNote[]> => {
    if (!project?.id) return [];

    const { data, error, status } = await progressNotesService.fetchProgressNotesLegacy(
      project.id,
      { toast }
    );

    // Service handles errors and toast notifications
    if (status !== 'success' || error) {
      return [];
    }

    // Ensure we return an array
    if (Array.isArray(data)) {
      return data;
    } else if (data) {
      return [data];
    }
    return [];
  }, [project?.id, toast]);

  /**
   * Add a new progress note to the current project
   */
  const handleAddProgressNote = useCallback(
    async (noteData: { date: string; content: string; imageFile?: File }) => {
      if (!project?.id) return null;

      const { data } = await progressNotesService.addProgressNoteLegacy(project.id, noteData, {
        toast,
      });

      return data;
    },
    [project?.id, toast]
  );

  /**
   * Update the content of an existing progress note
   */
  const handleUpdateProgressNote = useCallback(
    async (noteId: string, newContent: string) => {
      if (!project?.id) return null;

      const { data } = await progressNotesService.updateProgressNoteLegacy(
        project.id,
        noteId,
        newContent,
        { toast }
      );

      return data;
    },
    [project?.id, toast]
  );

  /**
   * Delete a progress note
   */
  const handleDeleteProgressNote = useCallback(
    async (noteId: string) => {
      if (!project?.id) return null;

      const { data } = await progressNotesService.deleteProgressNoteLegacy(project.id, noteId, {
        toast,
      });

      return data;
    },
    [project?.id, toast]
  );

  /**
   * Remove the image from a progress note
   */
  const handleDeleteProgressNoteImage = useCallback(
    async (noteId: string) => {
      if (!project?.id) return null;

      const { data } = await progressNotesService.deleteProgressNoteImageLegacy(
        project.id,
        noteId,
        { toast }
      );

      return data;
    },
    [project?.id, toast]
  );

  /**
   * Update the general notes for the project
   */
  const handleUpdateNotes = useCallback(
    async (newNotes: string) => {
      if (!project?.id) return null;

      const { data } = await progressNotesService.updateGeneralNotesLegacy(project.id, newNotes, {
        toast,
      });

      return data;
    },
    [project?.id, toast]
  );

  // Return memoized object to prevent unnecessary rerenders
  return React.useMemo(
    () => ({
      fetchProgressNotes,
      handleAddProgressNote,
      handleUpdateProgressNote,
      handleDeleteProgressNote,
      handleDeleteProgressNoteImage,
      handleUpdateNotes,
    }),
    [
      fetchProgressNotes,
      handleAddProgressNote,
      handleUpdateProgressNote,
      handleDeleteProgressNote,
      handleDeleteProgressNoteImage,
      handleUpdateNotes,
    ]
  );
};
