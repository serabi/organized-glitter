import { useQuery } from '@tanstack/react-query';
import { TagService } from '@/lib/tags';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { Tag } from '@/types/tag';
import { ClientResponseError } from 'pocketbase';

export function useTags() {
  const { user } = useAuth();

  return useQuery<Tag[], Error>({
    queryKey: queryKeys.tags.list(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Use secure TagService instead of direct PocketBase calls
      const result = await TagService.getUserTags();

      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to fetch tags');
      }

      return result.data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - tags don't change often
    retry: (failureCount, error: Error) => {
      // Don't retry on client errors (4xx)
      if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
