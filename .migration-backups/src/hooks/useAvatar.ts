import { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';
import { useUploadAvatarMutation, useRemoveAvatarMutation } from './mutations/useAvatarMutations';

export function useAvatar() {
  const { user } = useAuth();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const removeAvatarMutation = useRemoveAvatarMutation();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAvatarUploaded = useCallback(
    async (avatarFile: File) => {
      if (!user?.id) {
        throw new Error('User ID is required for avatar upload');
      }

      try {
        setIsUpdating(true);

        // Use React Query mutation for avatar upload with optimistic updates
        await uploadAvatarMutation.mutateAsync({
          userId: user.id,
          avatarFile,
        });

        logger.info('Avatar updated successfully');
      } catch (error) {
        logger.error('Failed to update avatar:', error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, uploadAvatarMutation]
  );

  const revertToInitials = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User ID is required for avatar revert');
    }

    try {
      setIsUpdating(true);

      // Use React Query mutation for avatar removal with optimistic updates
      await removeAvatarMutation.mutateAsync({
        userId: user.id,
      });

      logger.info('Avatar reverted to initials successfully');
    } catch (error) {
      logger.error('Failed to revert avatar to initials:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [user, removeAvatarMutation]);

  return {
    updateAvatar: handleAvatarUploaded,
    revertToInitials,
    isUpdating,
  };
}
