import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { logger } from '@/utils/logger';

export const useProjectDelete = (projectId: string | undefined) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!projectId) return;

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
        logger.error('Error deleting progress notes:', progressNotesError);
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
        logger.error('Error deleting project tags:', projectTagsError);
        // Continue with deletion attempt - the project tags might not exist
      }

      // Step 3: Delete the project itself
      await pb.collection(Collections.Projects).delete(projectId);

      toast({
        title: 'Project deleted',
        description: 'The project has been successfully removed from your collection',
      });
      navigate('/dashboard');
    } catch (error) {
      logger.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the project',
        variant: 'destructive',
      });
    }
  };

  return { handleDelete };
};
