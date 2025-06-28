import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TagService } from '@/lib/tags';
import { queryKeys } from '../queries/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isServiceResponseError } from '@/types/shared';
import { requireAuthenticatedUser } from '@/utils/authGuards';

interface DeleteTagData {
  id: string;
  name?: string; // Optional for better error messages
}

async function deleteTag(data: DeleteTagData): Promise<void> {
  const response = await TagService.deleteTag(data.id);

  if (isServiceResponseError(response)) {
    throw new Error(response.error?.message || 'Failed to delete tag');
  }

  return;
}

export function useDeleteTag() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeleteTagData) => {
      requireAuthenticatedUser(user);
      return deleteTag(data);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch tags list
      queryClient.invalidateQueries({
        queryKey: queryKeys.tags.lists(),
      });

      // Also invalidate specific tag detail if it exists
      queryClient.invalidateQueries({
        queryKey: queryKeys.tags.detail(variables.id),
      });

      // Invalidate project queries since tags might be displayed there
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      });

      // Invalidate project details since they might show tags
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.details(),
      });

      // Invalidate tag stats queries (since deleting a tag affects project counts)
      queryClient.invalidateQueries({
        queryKey: queryKeys.tags.stats(),
      });

      toast({
        title: 'Success',
        description: variables.name
          ? `Tag "${variables.name}" has been deleted`
          : 'Tag has been deleted successfully',
      });
    },
    onError: (error: unknown) => {
      console.error('Error deleting tag:', error);

      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('Unauthorized')) {
        toast({
          title: 'Unauthorized',
          description: 'You can only delete your own tags',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('not found')) {
        toast({
          title: 'Tag not found',
          description: 'The tag you are trying to delete was not found',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Could not delete tag. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });
}
