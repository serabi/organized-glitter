import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, ArtistsRecord } from '@/types/pocketbase.types';
import { queryKeys } from '../queries/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CreateArtistData {
  name: string;
}

async function createArtist(data: CreateArtistData, userId: string): Promise<ArtistsRecord> {
  const artistData: Partial<ArtistsRecord> = {
    name: data.name.trim(),
    user: userId,
  };

  return await pb.collection(Collections.Artists).create(artistData);
}

export function useCreateArtist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateArtistData) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return createArtist(data, user.id);
    },
    onSuccess: newArtist => {
      // Invalidate and refetch artists list
      queryClient.invalidateQueries({
        queryKey: queryKeys.artists.lists(),
      });

      toast({
        title: 'Success',
        description: `Artist "${newArtist.name}" has been added`,
      });
    },
    onError: (error: unknown) => {
      console.error('Error creating artist:', error);

      // Handle specific error cases
      if (error && typeof error === 'object' && 'status' in error && error.status === 400) {
        toast({
          title: 'Artist already exists',
          description: 'An artist with this name already exists in your list',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Could not add artist. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });
}
