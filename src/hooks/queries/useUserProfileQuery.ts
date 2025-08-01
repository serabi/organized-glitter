import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, UsersResponse } from '@/types/pocketbase.types';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

/**
 * Fetches user profile data from PocketBase
 */
const fetchUserProfile = async (userId: string): Promise<UsersResponse> => {
  return await pb.collection(Collections.Users).getOne(userId, {
    requestKey: `profile-${userId}`,
  });
};

/**
 * React Query hook for fetching user profile data
 * Enhanced with better caching and error handling
 */
export const useUserProfileQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: userId ? queryKeys.user.profile(userId) : ['user', 'profile', 'disabled'],
    queryFn: () => fetchUserProfile(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduced for faster avatar updates
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (user not found) or auth errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status === 404 || status === 401) {
          return false;
        }
      }
      return failureCount < 2; // Retry fewer times for profile data
    },
  });
};

/**
 * Mutation for updating user profile (especially avatar)
 * Provides optimistic updates and proper cache invalidation
 */
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: { avatar: File | string | null };
    }) => {
      if (updates.avatar instanceof File) {
        // Upload new avatar file
        const formData = new FormData();
        formData.append('avatar', updates.avatar);
        return await pb.collection(Collections.Users).update(userId, formData);
      } else if (updates.avatar === null) {
        // Remove avatar
        return await pb.collection(Collections.Users).update(userId, { avatar: null });
      }
      throw new Error('Invalid avatar update data');
    },
    onSuccess: (data, variables) => {
      // Update the profile query cache with the new data
      queryClient.setQueryData(queryKeys.user.profile(variables.userId), data);

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    },
    onError: error => {
      logger.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Helper hook that provides a simplified interface similar to the old useProfile
 * but powered by React Query for better performance and caching
 */
export const useProfileData = (userId: string | undefined) => {
  const { data: profileData, isLoading, error, refetch } = useUserProfileQuery(userId);
  const updateMutation = useUpdateProfileMutation();

  const profile = profileData
    ? {
        id: profileData.id,
        email: profileData.email,
        username: profileData.username,
        name: profileData.username || profileData.email || '',
        avatarUrl: profileData.avatar ? pb.files.getURL(profileData, profileData.avatar) : null,
        avatar: profileData.avatar,
      }
    : null;

  const updateProfile = async (userId: string, updates: { avatar: File | string | null }) => {
    try {
      await updateMutation.mutateAsync({ userId, updates });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  };

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile,
    isUpdating: updateMutation.isPending,
  };
};
