import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { queryKeys } from './queryKeys';

/**
 * Fetches beta tester status for a user
 */
const fetchBetaTesterStatus = async (userId: string): Promise<boolean> => {
  const userRecord = await pb.collection(Collections.Users).getOne(userId, {
    fields: 'beta_tester',
    requestKey: `beta-tester-status-${userId}`,
  });

  return Boolean(userRecord.beta_tester);
};

/**
 * React Query hook for fetching beta tester status
 */
export const useBetaTesterStatusQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: userId
      ? queryKeys.user.betaTesterStatus(userId)
      : ['user', 'beta-tester', 'disabled'],
    queryFn: () => fetchBetaTesterStatus(userId as string),
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes - beta tester status doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (user not found) or auth errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status === 404 || status === 401) {
          return false;
        }
      }
      return failureCount < 2; // Retry fewer times for beta tester status
    },
  });
};
