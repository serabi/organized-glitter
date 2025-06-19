import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, TagsResponse } from '@/types/pocketbase.types';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import type { Tag } from '@/types/tag';
import { ClientResponseError } from 'pocketbase';

async function fetchTags(userId: string): Promise<Tag[]> {
  const result = await pb.collection(Collections.Tags).getList(1, 200, {
    filter: `user = "${userId}"`,
    sort: 'name',
    requestKey: `tags-${userId}`,
  });

  return result.items.map((item: TagsResponse) => ({
    id: item.id,
    userId: item.user,
    name: item.name,
    slug: item.slug,
    color: item.color,
    createdAt: item.created,
    updatedAt: item.updated,
  }));
}

export function useTags() {
  const { user } = useAuth();

  return useQuery<Tag[], Error>({
    queryKey: queryKeys.tags.list(user?.id || ''),
    queryFn: () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return fetchTags(user.id);
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
