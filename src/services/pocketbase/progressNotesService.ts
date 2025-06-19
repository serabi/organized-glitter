import { BasePocketBaseService } from './baseService';
import { ProgressNote } from '@/types/project';
import { analytics } from '@/services/analytics';

interface ToastHandlers {
  toast: (params: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => void;
}

interface ProgressNoteResponse {
  data: ProgressNote[] | ProgressNote | null;
  error: string | null;
  status: 'success' | 'error';
}

export class ProgressNotesService extends BasePocketBaseService {
  private collection = 'progress_notes';

  /**
   * Fetch all progress notes for a specific project
   * Designed to work with React Query - throws errors instead of returning error objects
   */
  async fetchProgressNotes(projectId: string): Promise<ProgressNote[]> {
    try {
      if (!this.checkAuth()) {
        throw new Error('Authentication required');
      }

      const filter = this.buildFilter({ project: projectId });
      const notes = await this.pb.collection(this.collection).getFullList({
        filter,
        sort: '-date,-created', // Sort by date descending, then by created descending
        expand: 'project',
        requestKey: `progress-notes-${projectId}-${Date.now()}`,
      });

      // Transform PocketBase records to ProgressNote format
      const progressNotes: ProgressNote[] = notes.map(note => ({
        id: note.id,
        projectId: note.project,
        content: note.content,
        date: note.date,
        imageUrl: note.image ? this.pb.files.getURL(note, note.image) : undefined,
        createdAt: note.created,
        updatedAt: note.updated,
      }));

      return progressNotes;
    } catch (error: unknown) {
      this.logger.error('Failed to fetch progress notes:', error);
      throw new Error('Failed to fetch progress notes');
    }
  }

  /**
   * Legacy method for backward compatibility - wraps new method with toast handling
   */
  async fetchProgressNotesLegacy(
    projectId: string,
    { toast }: ToastHandlers
  ): Promise<ProgressNoteResponse> {
    try {
      const data = await this.fetchProgressNotes(projectId);
      return { data, error: null, status: 'success' };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch progress notes';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }

  /**
   * Add a new progress note to a project
   * Designed to work with React Query - throws errors instead of returning error objects
   */
  async addProgressNote(
    projectId: string,
    noteData: { date: string; content: string; imageFile?: File }
  ): Promise<ProgressNote> {
    try {
      if (!this.checkAuth()) {
        throw new Error('Authentication required');
      }

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

      const record = await this.pb.collection(this.collection).create(data);

      // Track progress note creation analytics
      analytics.progressNote.created(projectId, !!noteData.imageFile);

      // Track image upload if present
      if (noteData.imageFile) {
        analytics.feature.imageUploaded('progress_note', noteData.imageFile.size / 1024);
      }

      // Transform the created record to ProgressNote format
      const progressNote: ProgressNote = {
        id: record.id,
        projectId: record.project,
        content: record.content,
        date: record.date,
        imageUrl: record.image ? this.pb.files.getURL(record, record.image) : undefined,
        createdAt: record.created,
        updatedAt: record.updated,
      };

      return progressNote;
    } catch (error: unknown) {
      this.logger.error('Failed to add progress note:', error);

      // Track progress note creation failure
      analytics.error.databaseOperation('create', 'progress_notes', 'Failed to add progress note');

      throw new Error('Failed to add progress note');
    }
  }

  /**
   * Legacy method for backward compatibility - wraps new method with toast handling
   */
  async addProgressNoteLegacy(
    projectId: string,
    noteData: { date: string; content: string; imageFile?: File },
    { toast }: ToastHandlers
  ): Promise<ProgressNoteResponse> {
    try {
      await this.addProgressNote(projectId, noteData);
      toast({ title: 'Success', description: 'Progress note added successfully' });

      // Return all progress notes for the project (to update the list)
      return this.fetchProgressNotesLegacy(projectId, { toast });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add progress note';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }

  /**
   * Update the content of an existing progress note
   * Designed to work with React Query - throws errors instead of returning error objects
   */
  async updateProgressNote(noteId: string, newContent: string): Promise<ProgressNote> {
    try {
      if (!this.checkAuth()) {
        throw new Error('Authentication required');
      }

      const record = await this.pb.collection(this.collection).update(noteId, {
        content: newContent,
      });

      // Transform the updated record to ProgressNote format
      const progressNote: ProgressNote = {
        id: record.id,
        projectId: record.project,
        content: record.content,
        date: record.date,
        imageUrl: record.image ? this.pb.files.getURL(record, record.image) : undefined,
        createdAt: record.created,
        updatedAt: record.updated,
      };

      return progressNote;
    } catch (error: unknown) {
      this.logger.error('Failed to update progress note:', error);
      throw new Error('Failed to update progress note');
    }
  }

  /**
   * Legacy method for backward compatibility - wraps new method with toast handling
   */
  async updateProgressNoteLegacy(
    projectId: string,
    noteId: string,
    newContent: string,
    { toast }: ToastHandlers
  ): Promise<ProgressNoteResponse> {
    try {
      await this.updateProgressNote(noteId, newContent);
      toast({ title: 'Success', description: 'Progress note updated successfully' });

      // Return all progress notes for the project (to update the list)
      return this.fetchProgressNotesLegacy(projectId, { toast });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update progress note';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }

  /**
   * Delete a progress note
   * Designed to work with React Query - throws errors instead of returning error objects
   */
  async deleteProgressNote(noteId: string): Promise<void> {
    try {
      if (!this.checkAuth()) {
        throw new Error('Authentication required');
      }

      await this.pb.collection(this.collection).delete(noteId);
    } catch (error: unknown) {
      this.logger.error('Failed to delete progress note:', error);
      throw new Error('Failed to delete progress note');
    }
  }

  /**
   * Legacy method for backward compatibility - wraps new method with toast handling
   */
  async deleteProgressNoteLegacy(
    projectId: string,
    noteId: string,
    { toast }: ToastHandlers
  ): Promise<ProgressNoteResponse> {
    try {
      await this.deleteProgressNote(noteId);
      toast({ title: 'Success', description: 'Progress note deleted successfully' });

      // Return all progress notes for the project (to update the list)
      return this.fetchProgressNotesLegacy(projectId, { toast });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete progress note';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }

  /**
   * Remove the image from a progress note
   * Designed to work with React Query - throws errors instead of returning error objects
   */
  async deleteProgressNoteImage(noteId: string): Promise<ProgressNote> {
    try {
      if (!this.checkAuth()) {
        throw new Error('Authentication required');
      }

      // Update the note to remove the image field
      const record = await this.pb.collection(this.collection).update(noteId, {
        image: null,
      });

      // Transform the updated record to ProgressNote format
      const progressNote: ProgressNote = {
        id: record.id,
        projectId: record.project,
        content: record.content,
        date: record.date,
        imageUrl: record.image ? this.pb.files.getURL(record, record.image) : undefined,
        createdAt: record.created,
        updatedAt: record.updated,
      };

      return progressNote;
    } catch (error: unknown) {
      this.logger.error('Failed to delete progress note image:', error);
      throw new Error('Failed to delete progress note image');
    }
  }

  /**
   * Legacy method for backward compatibility - wraps new method with toast handling
   */
  async deleteProgressNoteImageLegacy(
    projectId: string,
    noteId: string,
    { toast }: ToastHandlers
  ): Promise<ProgressNoteResponse> {
    try {
      await this.deleteProgressNoteImage(noteId);
      toast({ title: 'Success', description: 'Progress note image deleted successfully' });

      // Return all progress notes for the project (to update the list)
      return this.fetchProgressNotesLegacy(projectId, { toast });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete progress note image';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }

  /**
   * Update general notes for a project (this updates the project's general_notes field)
   * Designed to work with React Query - throws errors instead of returning error objects
   */
  async updateGeneralNotes(projectId: string, newNotes: string): Promise<void> {
    try {
      if (!this.checkAuth()) {
        throw new Error('Authentication required');
      }

      // Update the project's general notes field
      await this.pb.collection('projects').update(projectId, {
        general_notes: newNotes,
      });
    } catch (error: unknown) {
      this.logger.error('Failed to update general notes:', error);
      throw new Error('Failed to update general notes');
    }
  }

  /**
   * Legacy method for backward compatibility - wraps new method with toast handling
   */
  async updateGeneralNotesLegacy(
    projectId: string,
    newNotes: string,
    { toast }: ToastHandlers
  ): Promise<ProgressNoteResponse> {
    try {
      await this.updateGeneralNotes(projectId, newNotes);
      toast({ title: 'Success', description: 'General notes updated successfully' });

      // Return all progress notes for the project (general notes update doesn't change progress notes)
      return this.fetchProgressNotesLegacy(projectId, { toast });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update general notes';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }
}

// Export singleton instance
export const progressNotesService = new ProgressNotesService();
