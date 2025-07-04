import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { secureLogger } from '@/utils/secureLogger';

interface UpdateProfileData {
  avatar: File | string | null;
}

/**
 * Mutation hook for updating user profile
 */
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: UpdateProfileData }) => {
      if (updates.avatar instanceof File) {
        // Upload new avatar file
        const formData = new FormData();
        formData.append('avatar', updates.avatar);

        return await pb.collection(Collections.Users).update(userId, formData);
      } else if (updates.avatar === null) {
        // Remove avatar
        return await pb.collection(Collections.Users).update(userId, { avatar: null });
      }

      // For other updates, we could extend this
      return await pb.collection(Collections.Users).update(userId, updates);
    },
    onSuccess: (_, { userId }) => {
      // Invalidate the user profile to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
    onError: error => {
      secureLogger.error('Error updating profile:', error);
    },
  });
};
