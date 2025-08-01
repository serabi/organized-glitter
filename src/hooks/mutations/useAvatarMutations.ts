import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { logger } from '@/utils/logger';
/**
 * Mutation hook for uploading a new avatar
 */
export const useUploadAvatarMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, avatarFile }: { userId: string; avatarFile: File }) => {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      return await pb.collection(Collections.Users).update(userId, formData);
    },
    onMutate: async ({ userId, avatarFile }) => {
      // Cancel any outgoing refetches for both profile and optimistic avatar
      await queryClient.cancelQueries({ queryKey: queryKeys.user.profile(userId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.user.optimisticAvatar(userId) });

      // Snapshot the previous values
      const previousProfile = queryClient.getQueryData(queryKeys.user.profile(userId));
      const previousOptimisticAvatar = queryClient.getQueryData(
        queryKeys.user.optimisticAvatar(userId)
      );

      // Create optimistic avatar URL for immediate UI feedback
      const optimisticAvatarUrl = URL.createObjectURL(avatarFile);

      // Set optimistic avatar in separate query cache (type-safe)
      queryClient.setQueryData(queryKeys.user.optimisticAvatar(userId), optimisticAvatarUrl);

      // Return context for rollback
      return { previousProfile, previousOptimisticAvatar, optimisticAvatarUrl };
    },
    onSuccess: (_, { userId }) => {
      // Clear optimistic avatar and invalidate profile to get the real avatar URL
      queryClient.removeQueries({ queryKey: queryKeys.user.optimisticAvatar(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
    onError: (error, { userId }, context) => {
      // Rollback optimistic avatar on error
      if (context?.previousOptimisticAvatar !== undefined) {
        queryClient.setQueryData(
          queryKeys.user.optimisticAvatar(userId),
          context.previousOptimisticAvatar
        );
      } else {
        queryClient.removeQueries({ queryKey: queryKeys.user.optimisticAvatar(userId) });
      }

      // Clean up optimistic URL
      if (context?.optimisticAvatarUrl) {
        URL.revokeObjectURL(context.optimisticAvatarUrl);
      }

      logger.error('Error uploading avatar:', error);
    },
    onSettled: (_, __, { userId }, context) => {
      // Clean up optimistic URL
      if (context?.optimisticAvatarUrl) {
        URL.revokeObjectURL(context.optimisticAvatarUrl);
      }

      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
  });
};

/**
 * Mutation hook for removing avatar (revert to initials)
 */
export const useRemoveAvatarMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return await pb.collection(Collections.Users).update(userId, { avatar: null });
    },
    onMutate: async ({ userId }) => {
      // Cancel any outgoing refetches for both profile and optimistic avatar
      await queryClient.cancelQueries({ queryKey: queryKeys.user.profile(userId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.user.optimisticAvatar(userId) });

      // Snapshot the previous values
      const previousProfile = queryClient.getQueryData(queryKeys.user.profile(userId));
      const previousOptimisticAvatar = queryClient.getQueryData(
        queryKeys.user.optimisticAvatar(userId)
      );

      // Clear optimistic avatar immediately (revert to initials)
      queryClient.removeQueries({ queryKey: queryKeys.user.optimisticAvatar(userId) });

      // Return context for rollback
      return { previousProfile, previousOptimisticAvatar };
    },
    onSuccess: (_, { userId }) => {
      // Ensure optimistic avatar is cleared and invalidate profile
      queryClient.removeQueries({ queryKey: queryKeys.user.optimisticAvatar(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
    onError: (error, { userId }, context) => {
      // Rollback optimistic avatar on error
      if (context?.previousOptimisticAvatar !== undefined) {
        queryClient.setQueryData(
          queryKeys.user.optimisticAvatar(userId),
          context.previousOptimisticAvatar
        );
      }

      logger.error('Error removing avatar:', error);
    },
    onSettled: (_, __, { userId }) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
  });
};
