import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, ArtistsResponse } from '@/types/pocketbase.types';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { ClientResponseError } from 'pocketbase';

async function fetchArtists(userId: string): Promise<ArtistsResponse[]> {
  const result = await pb.collection(Collections.Artists).getList(1, 200, {
    filter: `user = "${userId}"`,
    sort: 'name',
    requestKey: `artists-${userId}`,
  });

  return result.items;
}

export function useArtists() {
  const { user } = useAuth();

  return useQuery<ArtistsResponse[], Error>({
    queryKey: queryKeys.artists.list(user?.id || ''),
    queryFn: () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return fetchArtists(user.id);
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - artists don't change often
    retry: (failureCount, error: Error) => {
      // Don't retry on client errors (4xx)
      if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
