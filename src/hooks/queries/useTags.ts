/**
 * React Query hook for fetching tags data
 * @author @serabi
 * @created 2025-01-16
 */

import { useQuery } from '@tanstack/react-query';
import { TagService } from '@/lib/tags';
import { queryKeys } from './queryKeys';
import { useUserAuth, getStandardQueryConfig, logQueryError, logQuerySuccess, createQueryTimer } from './shared/queryUtils';
import type { Tag } from '@/types/tag';

/**
 * Hook for fetching all tags for the current user using TagService
 * @author @serabi
 * @returns React Query result with tags data
 */
export function useTags() {
  const { userId, requireAuth } = useUserAuth();

  return useQuery<Tag[], Error>({
    queryKey: queryKeys.tags.list(userId || ''),
    queryFn: async () => {
      const authenticatedUserId = requireAuth();
      const timer = createQueryTimer('useTags', 'tags query');

      try {
        // Use secure TagService instead of direct PocketBase calls
        const result = await TagService.getUserTags();

        if (result.status === 'error') {
          logQueryError('useTags', 'tags query', result.error, { userId: authenticatedUserId });
          throw new Error(result.error || 'Failed to fetch tags');
        }

        timer.stop({
          itemsCount: result.data.length,
        });

        logQuerySuccess('useTags', 'tags query', result.data, {
          userId: authenticatedUserId,
          itemsCount: result.data.length,
        });

        return result.data;
      } catch (error) {
        timer.stop({ error: true });
        logQueryError('useTags', 'tags query', error, { userId: authenticatedUserId });
        throw error;
      }
    },
    enabled: !!userId,
    ...getStandardQueryConfig(),
  });
}
