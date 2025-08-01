/**
 * Mutation hook for updating user timezone preference
 * @author @serabi
 * @created 2025-01-13
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, UsersResponse } from '@/types/pocketbase.types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { createLogger } from '@/utils/logger';
import { isValidTimezone } from '@/utils/timezoneUtils';

const logger = createLogger('useUpdateTimezoneMutation');

interface UpdateTimezoneParams {
  userId: string;
  timezone: string;
}

/**
 * Mutation hook for updating user timezone preference
 * Includes optimistic updates and proper error handling
 */
export const useUpdateTimezoneMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, timezone }: UpdateTimezoneParams) => {
      // Validate timezone before sending to server
      if (!isValidTimezone(timezone)) {
        throw new Error(`Invalid timezone: ${timezone}`);
      }

      logger.debug('Updating user timezone', { userId, timezone });

      return await pb.collection(Collections.Users).update(userId, {
        timezone: timezone,
      });
    },
    onMutate: async ({ userId, timezone }) => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.user.profile(userId) });

      // Snapshot the previous user data
      const previousUser = queryClient.getQueryData(queryKeys.user.profile(userId));

      // Optimistically update the user data with new timezone
      queryClient.setQueryData(queryKeys.user.profile(userId), (old: UsersResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          timezone: timezone,
        };
      });

      // Return context with previous value for rollback
      return { previousUser };
    },
    onSuccess: (_, { userId, timezone }) => {
      logger.info('Successfully updated timezone', { userId, timezone });

      // Invalidate user profile to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });

      // Also invalidate any auth-related queries that might cache user data
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error, { userId, timezone }, context) => {
      logger.error('Failed to update timezone', { userId, timezone, error });

      // Rollback optimistic update if we have previous data
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.user.profile(userId), context.previousUser);
      }
    },
    onSettled: (_, __, { userId }) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
  });
};
