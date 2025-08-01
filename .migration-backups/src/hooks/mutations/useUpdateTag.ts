import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TagService } from '@/lib/tags';
import { TagFormValues } from '@/types/tag';
import { queryKeys } from '../queries/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isServiceResponseError } from '@/types/shared';
import { requireAuthenticatedUser } from '@/utils/authGuards';
import { logger } from '@/utils/logger';

interface UpdateTagData {
  id: string;
  updates: Partial<TagFormValues>;
}

async function updateTag(data: UpdateTagData): Promise<void> {
  const response = await TagService.updateTag(data.id, data.updates);

  if (isServiceResponseError(response)) {
    throw new Error(response.error?.message || 'Failed to update tag');
  }

  return;
}

export function useUpdateTag() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTagData) => {
      requireAuthenticatedUser(user);
      return updateTag(data);
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

      toast({
        title: 'Success',
        description: `Tag has been updated successfully`,
      });
    },
    onError: (error: unknown) => {
      logger.error('Error updating tag:', error);

      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('already exists')) {
        toast({
          title: 'Tag name already exists',
          description: 'A tag with this name already exists in your list',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('Unauthorized')) {
        toast({
          title: 'Unauthorized',
          description: 'You can only update your own tags',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Could not update tag. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });
}
