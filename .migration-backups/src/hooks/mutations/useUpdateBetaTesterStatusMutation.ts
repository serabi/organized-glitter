import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { secureLogger } from '@/utils/secureLogger';

/**
 * Mutation hook for updating beta tester status
 */
export const useUpdateBetaTesterStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isBetaTester }: { userId: string; isBetaTester: boolean }) => {
      return await pb.collection(Collections.Users).update(userId, {
        beta_tester: isBetaTester,
      });
    },
    onMutate: async ({ userId, isBetaTester }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.user.betaTesterStatus(userId) });

      // Snapshot the previous value
      const previousStatus = queryClient.getQueryData(queryKeys.user.betaTesterStatus(userId));

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.user.betaTesterStatus(userId), isBetaTester);

      // Return a context with the snapshotted value
      return { previousStatus };
    },
    onSuccess: (_, { userId }) => {
      // Invalidate the beta tester status to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.user.betaTesterStatus(userId) });
      // Also invalidate user profile in case it's used elsewhere
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
    onError: (error, { userId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(queryKeys.user.betaTesterStatus(userId), context.previousStatus);
      }
      secureLogger.error('Error updating beta tester status:', error);
    },
    onSettled: (_, __, { userId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.user.betaTesterStatus(userId) });
    },
  });
};
