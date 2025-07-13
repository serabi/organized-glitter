import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, ArtistsResponse } from '@/types/pocketbase.types';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { ClientResponseError } from 'pocketbase';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useArtists');

async function fetchArtists(userId: string): Promise<ArtistsResponse[]> {
  logger.debug('Executing artists query', { userId });

  try {
    const result = await pb.collection(Collections.Artists).getList(1, 200, {
      filter: `user = "${userId}"`,
      sort: 'name',
      requestKey: `artists-all-${userId}`, // Enable request deduplication with user context
    });

    logger.debug('Artists query successful:', {
      userId,
      itemsCount: result.items.length,
      totalItems: result.totalItems,
    });

    return result.items;
  } catch (error) {
    logger.error('Artists query failed:', error);
    throw error;
  }
}

export function useArtists() {
  const { user } = useAuth();

  logger.debug('useArtists called', { userId: user?.id });

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
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    refetchOnReconnect: false, // Reduce blinking on reconnect
    // Add specific notification optimization
    notifyOnChangeProps: ['data', 'error', 'isLoading', 'isError'] as const,
    retry: (failureCount, error: Error) => {
      // Don't retry on client errors (4xx)
      if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
