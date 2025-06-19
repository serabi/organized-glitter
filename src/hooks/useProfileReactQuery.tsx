import { useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfileQuery } from '@/hooks/queries/useUserProfileQuery';
import { useUpdateProfileMutation } from '@/hooks/mutations/useUpdateProfileMutation';

interface UseProfileReactQueryResult {
  user: { id: string; email?: string; username?: string; avatar?: string } | null;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  avatarUrl: string | null;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  profileLoading: boolean;
  refreshProfile: () => void;
  updateProfile: (
    userId: string,
    updates: { avatar: File | string | null }
  ) => Promise<{ error: Error | null }>;
  // Enhanced error handling and states
  error: Error | null;
  isUpdatingProfile: boolean;
  // Beta tester status
  isBetaTester: boolean;
}

export const useProfileReactQuery = (): UseProfileReactQueryResult => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBetaTester, setIsBetaTester] = useState(false);

  // Use React Query for profile data
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
    refetch,
  } = useUserProfileQuery(user?.id);

  // Update profile mutation
  const updateProfileMutation = useUpdateProfileMutation();

  // Update local state when profileData changes
  useEffect(() => {
    if (profileData) {
      setName(profileData.username || profileData.email || '');
      setEmail(profileData.email || '');
      setIsBetaTester(profileData.beta_tester || false);

      // Set avatar URL from profile data with timestamp to bust cache
      const avatarUrl = profileData.avatar
        ? `${pb.files.getURL(profileData, profileData.avatar)}?t=${Date.now()}`
        : null;
      setAvatarUrl(avatarUrl);

      console.log('[useProfileReactQuery] Updated avatar URL:', avatarUrl);
    }
  }, [profileData]);

  // Refresh profile data
  const refreshProfile = () => {
    refetch();
  };

  // Update profile function
  const updateProfile = async (userId: string, updates: { avatar: File | string | null }) => {
    try {
      await updateProfileMutation.mutateAsync({ userId, updates });
      return { error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  };

  return {
    user,
    name,
    setName,
    email,
    setEmail,
    avatarUrl,
    setAvatarUrl,
    loading,
    setLoading,
    profileLoading,
    refreshProfile,
    updateProfile,
    // Enhanced error handling and states
    error: profileError,
    isUpdatingProfile: updateProfileMutation.isPending,
    // Beta tester status
    isBetaTester,
  };
};
