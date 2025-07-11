import { useQuery } from '@tanstack/react-query';
import { TagService } from '@/lib/tags';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { Tag } from '@/types/tag';
import { ClientResponseError } from 'pocketbase';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useTags');

export function useTags() {
  const { user } = useAuth();

  logger.debug('useTags called', { userId: user?.id });

  return useQuery<Tag[], Error>({
    queryKey: queryKeys.tags.list(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      logger.debug('Executing tags query', { userId: user.id });

      try {
        // Use secure TagService instead of direct PocketBase calls
        const result = await TagService.getUserTags();

        if (result.status === 'error') {
          logger.error('Tags query failed:', result.error);
          throw new Error(result.error || 'Failed to fetch tags');
        }

        logger.debug('Tags query successful:', {
          userId: user.id,
          itemsCount: result.data.length,
        });

        return result.data;
      } catch (error) {
        logger.error('Tags query failed:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - tags don't change often
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
