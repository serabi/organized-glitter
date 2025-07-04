import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { queryKeys } from '../queries/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { secureLogger } from '@/utils/secureLogger';

async function deleteArtist(id: string): Promise<void> {
  await pb.collection(Collections.Artists).delete(id);
}

export function useDeleteArtist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteArtist,
    onSuccess: () => {
      // Invalidate and refetch artists list
      queryClient.invalidateQueries({
        queryKey: queryKeys.artists.lists(),
      });

      toast({
        title: 'Success',
        description: 'Artist has been deleted',
      });
    },
    onError: (error: unknown) => {
      secureLogger.error('Error deleting artist:', error);

      // Handle specific error cases
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        toast({
          title: 'Artist not found',
          description: 'The artist you are trying to delete was not found',
          variant: 'destructive',
        });
      } else if (error && typeof error === 'object' && 'status' in error && error.status === 400) {
        toast({
          title: 'Cannot delete artist',
          description: 'This artist may be linked to existing projects',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Could not delete artist. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });
}
