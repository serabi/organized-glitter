import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ProjectStatus, ProjectType, ProgressNote } from '@/types/project';
import { pb } from '@/lib/pocketbase';
import {
  Collections,
  ProjectsResponse,
  ProjectTagsResponse,
  TagsResponse,
  CompaniesResponse,
  ArtistsResponse,
} from '@/types/pocketbase.types';

// Define interface for project with expanded data
interface ProjectWithExpand extends ProjectsResponse {
  expand?: {
    project_tags_via_project?: Array<
      ProjectTagsResponse & {
        expand?: {
          tag?: TagsResponse;
        };
      }
    >;
    company?: CompaniesResponse;
    artist?: ArtistsResponse;
  };
}

/**
 * Hook for managing a project's details, status, notes, and progress notes
 * Uses PocketBase directly for data operations
 */
export const useProjectDetail = (projectId: string | undefined) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [project, setProject] = useState<ProjectType | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch project data
  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('useProjectDetail: Fetching project:', projectId);
      console.log('useProjectDetail: Checking for re-renders');

      // Fetch project with related data using consistent request key to enable auto-cancellation
      const projectRecord = await pb
        .collection(Collections.Projects)
        .getOne<ProjectWithExpand>(projectId, {
          expand: 'company,artist,project_tags_via_project.tag',
          requestKey: `project-detail-${projectId}`,
        });

      // Process tags from expanded data
      let tags: Array<{
        id: string;
        userId: string;
        name: string;
        slug: string;
        color: string;
        createdAt: string;
        updatedAt: string;
      }> = [];
      const projectTagsExpand = projectRecord.expand?.['project_tags_via_project'];
      if (projectTagsExpand) {
        const projectTagsArray = Array.isArray(projectTagsExpand)
          ? projectTagsExpand
          : [projectTagsExpand];

        tags = projectTagsArray
          .filter(pt => pt?.expand?.tag)
          .map(pt => {
            const tagData = pt.expand!.tag!;
            return {
              id: tagData.id,
              userId: tagData.user,
              name: tagData.name,
              slug: tagData.slug,
              color: tagData.color,
              createdAt: tagData.created,
              updatedAt: tagData.updated,
            };
          });
      }

      // Fetch progress notes separately with consistent request key to enable auto-cancellation
      const progressNotesRecords = await pb.collection(Collections.ProgressNotes).getList(1, 100, {
        filter: `project = "${projectId}"`,
        sort: '-date',
        requestKey: `progress-notes-${projectId}`,
      });

      const progressNotes: ProgressNote[] = progressNotesRecords.items.map(note => ({
        id: note.id,
        projectId: note.project,
        content: note.content,
        date: note.date,
        imageUrl: note.image ? pb.files.getURL(note, note.image) : undefined,
        createdAt: note.created,
        updatedAt: note.updated,
      }));

      // Convert to ProjectType
      const projectData: ProjectType = {
        id: projectRecord.id,
        userId: projectRecord.user,
        title: projectRecord.title || 'Untitled Project',
        company: projectRecord.expand?.company?.name || undefined,
        artist: projectRecord.expand?.artist?.name || undefined,
        width: projectRecord.width || undefined,
        height: projectRecord.height || undefined,
        drillShape: projectRecord.drill_shape || undefined,
        status: projectRecord.status as ProjectStatus,
        kit_category: projectRecord.kit_category || undefined,
        datePurchased: projectRecord.date_purchased || undefined,
        dateReceived: projectRecord.date_received || undefined,
        dateStarted: projectRecord.date_started || undefined,
        dateCompleted: projectRecord.date_completed || undefined,
        generalNotes: projectRecord.general_notes || undefined,
        imageUrl: projectRecord.image
          ? pb.files.getURL(projectRecord, projectRecord.image)
          : undefined,
        sourceUrl: projectRecord.source_url || undefined,
        totalDiamonds: projectRecord.total_diamonds || undefined,
        progressNotes: progressNotes,
        tags: tags,
        createdAt: projectRecord.created,
        updatedAt: projectRecord.updated,
      };

      setProject(projectData);
      console.log('useProjectDetail: Project loaded successfully');
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  // Effect to fetch project on mount and when projectId changes
  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Helper to update project state
  const updateProject = useCallback((updates: Partial<ProjectType>) => {
    setProject(prev => (prev ? { ...prev, ...updates } : null));
  }, []);

  /**
   * Update a project's status
   */
  const handleUpdateStatus = async (newStatus: ProjectStatus) => {
    if (!projectId || !project) return false;

    setSubmitting(true);
    try {
      await pb.collection('projects').update(projectId, {
        status: newStatus,
      });

      updateProject({ status: newStatus });

      toast({
        title: 'Success',
        description: `Project status updated to ${newStatus.replace('_', ' ')}`,
        variant: 'default',
      });
      return true;
    } catch (error) {
      console.error('Error updating project status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project status',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Update the general notes for a project
   */
  const handleUpdateNotes = async (newNotes: string) => {
    if (!projectId || !project) return;

    setSubmitting(true);
    try {
      await pb.collection('projects').update(projectId, {
        general_notes: newNotes,
      });

      updateProject({ generalNotes: newNotes });

      toast({
        title: 'Success',
        description: 'Project notes updated successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating project notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project notes',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Add a new progress note
   */
  const handleAddProgressNote = async (noteData: {
    date: string;
    content: string;
    imageFile?: File;
  }) => {
    if (!projectId || !project) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('project', projectId);
      formData.append('content', noteData.content);
      formData.append('date', noteData.date);

      if (noteData.imageFile) {
        formData.append('image', noteData.imageFile);
      }

      const newNote = await pb.collection('progress_notes').create(formData);

      // Create the new progress note object
      const progressNote: ProgressNote = {
        id: newNote.id,
        projectId: newNote.project,
        content: newNote.content,
        date: newNote.date,
        imageUrl: newNote.image ? pb.files.getURL(newNote, newNote.image) : undefined,
        createdAt: newNote.created,
        updatedAt: newNote.updated,
      };

      // Update project with the new progress note added
      updateProject({
        progressNotes: [progressNote, ...(project.progressNotes || [])],
      });

      toast({
        title: 'Success',
        description: 'Progress note added successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error adding progress note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add progress note',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Update an existing progress note
   */
  const handleUpdateProgressNote = async (noteId: string, newContent: string) => {
    if (!projectId || !project) return;

    setSubmitting(true);
    try {
      await pb.collection(Collections.ProgressNotes).update(noteId, {
        content: newContent,
      });

      // Update project with the updated progress note
      const updatedProgressNotes =
        project.progressNotes?.map(note =>
          note.id === noteId ? { ...note, content: newContent } : note
        ) || [];

      updateProject({
        progressNotes: updatedProgressNotes,
      });

      toast({
        title: 'Success',
        description: 'Progress note updated successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating progress note:', error);
      toast({
        title: 'Error',
        description: 'Failed to update progress note',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Delete a progress note
   */
  const handleDeleteProgressNote = async (noteId: string) => {
    if (!projectId || !project) return;

    setSubmitting(true);
    try {
      await pb.collection('progress_notes').delete(noteId);

      // Update project by removing the deleted progress note
      const updatedProgressNotes = project.progressNotes?.filter(note => note.id !== noteId) || [];

      updateProject({
        progressNotes: updatedProgressNotes,
      });

      toast({
        title: 'Success',
        description: 'Progress note deleted successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error deleting progress note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete progress note',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Remove an image from a progress note
   */
  const handleDeleteProgressNoteImage = async (noteId: string) => {
    if (!projectId || !project) return;

    setSubmitting(true);
    try {
      // Update the progress note to remove the image field
      await pb.collection(Collections.ProgressNotes).update(noteId, {
        image: null,
      });

      // Update project by removing the image from the specific progress note
      const updatedProgressNotes =
        project.progressNotes?.map(note =>
          note.id === noteId ? { ...note, imageUrl: undefined } : note
        ) || [];

      updateProject({
        progressNotes: updatedProgressNotes,
      });

      toast({
        title: 'Success',
        description: 'Progress note image removed successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error removing progress note image:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove progress note image',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Archive a project and navigate to dashboard
   */
  const handleArchive = async () => {
    if (!projectId) return;

    setSubmitting(true);
    try {
      await pb.collection(Collections.Projects).update(projectId, {
        status: 'archived',
      });

      toast({
        title: 'Project Archived',
        description: 'Your project has been archived successfully',
        variant: 'default',
      });

      // Navigate to dashboard after a brief delay to allow toast to show
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);

      return true;
    } catch (error) {
      console.error('Error archiving project:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive project',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Delete a project and navigate to dashboard
   */
  const handleDelete = async () => {
    if (!projectId) return;

    setSubmitting(true);
    try {
      // Step 1: Delete all progress notes for this project
      try {
        const progressNotes = await pb.collection(Collections.ProgressNotes).getFullList({
          filter: `project = "${projectId}"`,
        });

        for (const note of progressNotes) {
          await pb.collection(Collections.ProgressNotes).delete(note.id);
        }
      } catch (progressNotesError) {
        console.error('Error deleting progress notes:', progressNotesError);
        // Continue with deletion attempt - the progress notes might not exist
      }

      // Step 2: Delete all project-tag associations for this project
      try {
        const projectTags = await pb.collection(Collections.ProjectTags).getFullList({
          filter: `project = "${projectId}"`,
        });

        for (const projectTag of projectTags) {
          await pb.collection(Collections.ProjectTags).delete(projectTag.id);
        }
      } catch (projectTagsError) {
        console.error('Error deleting project tags:', projectTagsError);
        // Continue with deletion attempt - the project tags might not exist
      }

      // Step 3: Delete the project itself
      await pb.collection(Collections.Projects).delete(projectId);

      toast({
        title: 'Project Deleted',
        description: 'Your project has been permanently deleted',
        variant: 'default',
      });

      // Navigate to dashboard after a brief delay to allow toast to show
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);

      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
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
