import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, ArtistsRecord } from '@/types/pocketbase.types';
import { queryKeys } from '../queries/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { requireAuthenticatedUser } from '@/utils/authGuards';
import { secureLogger } from '@/utils/secureLogger';
import { FilterBuilder } from '@/utils/filterBuilder';

interface UpdateArtistData {
  id: string;
  name: string;
}

async function updateArtist(data: UpdateArtistData, userId: string): Promise<ArtistsRecord> {
  // Get current artist to check ownership
  const currentArtist = await pb.collection(Collections.Artists).getOne(data.id);

  if (currentArtist.user !== userId) {
    throw new Error('You can only update your own artists');
  }

  // Check if artist name already exists (if name changed)
  if (data.name.trim() !== currentArtist.name) {
    const filter = new FilterBuilder()
      .userScope(userId)
      .equals('name', data.name.trim())
      .build();

    const existing = await pb
      .collection(Collections.Artists)
      .getFirstListItem(filter, { requestKey: null })
      .catch(() => null);

    if (existing && existing.id !== data.id) {
      throw new Error('An artist with this name already exists');
    }
  }

  const artistData: Partial<ArtistsRecord> = {
    name: data.name.trim(),
  };

  return await pb.collection(Collections.Artists).update(data.id, artistData);
}

export function useUpdateArtist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateArtistData) => {
      const userId = requireAuthenticatedUser(user);
      return updateArtist(data, userId);
    },
    onSuccess: updatedArtist => {
      // Invalidate and refetch artists list
      queryClient.invalidateQueries({
        queryKey: queryKeys.artists.lists(),
      });

      // Also invalidate specific artist detail if it exists
      queryClient.invalidateQueries({
        queryKey: queryKeys.artists.detail(updatedArtist.id),
      });

      toast({
        title: 'Success',
        description: `Artist "${updatedArtist.name}" has been updated`,
      });
    },
    onError: (error: unknown) => {
      secureLogger.error('Error updating artist:', error);

      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('already exists')) {
        toast({
          title: 'Artist name already exists',
          description: 'An artist with this name already exists in your list',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('only update your own')) {
        toast({
          title: 'Unauthorized',
          description: 'You can only update your own artists',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Could not update artist. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });
}
