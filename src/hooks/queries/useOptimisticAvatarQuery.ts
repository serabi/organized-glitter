import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

/**
 * React Query hook for accessing optimistic avatar URL during uploads
 * Returns undefined when no optimistic avatar is set
 */
export const useOptimisticAvatarQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: userId
      ? queryKeys.user.optimisticAvatar(userId)
      : ['user', 'optimistic-avatar', 'disabled'],
    queryFn: () => {
      // This query doesn't actually fetch from server
      // It only returns what was set optimistically in the cache
      return null;
    },
    enabled: false, // Never actually fetch from server
    staleTime: Infinity, // Optimistic data doesn't go stale
    gcTime: 5 * 60 * 1000, // Clean up after 5 minutes
  });
};
