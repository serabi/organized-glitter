import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/logger';

const profileLogger = createLogger('useProfile');

// Global cache to prevent duplicate requests across multiple hook instances
interface UserProfileData {
  id: string;
  username?: string;
  email?: string;
  avatar?: string;
}

const profileCache = new Map<string, Promise<UserProfileData>>();
const profileData = new Map<string, UserProfileData>();

interface UseProfileResult {
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
  // Avatar management for PocketBase (simplified)
  avatarType: string | null;
  avatarVariant: string | null;
}

export const useProfile = (): UseProfileResult => {
  const { user } = useAuth();
  profileLogger.debug(
    'Hook initialized. User from useAuth():',
    user ? { id: user.id, email: user.email, username: user.username } : null
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarType] = useState<string | null>(null);
  const [avatarVariant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const { toast } = useToast();

  // Track if we're currently fetching to prevent duplicate requests
  const fetchingRef = useRef(false);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    profileLogger.debug(
      'refreshProfile called. User ID:',
      user?.id,
      'Fetching ref:',
      fetchingRef.current
    );
    if (!user?.id || fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      // Clear cached data when refreshing
      profileData.delete(user.id);
      profileCache.delete(user.id);

      profileLogger.debug('refreshProfile: Fetching user data for ID:', user.id);
      const userData = (await pb.collection('users').getOne(user.id, {
        requestKey: `profile-refresh-${user.id}-${Date.now()}`, // Unique key for refresh
      })) as UserProfileData;
      profileLogger.debug('refreshProfile: User data from PocketBase:', userData);

      if (userData) {
        // Update cache with fresh data
        profileData.set(user.id, userData);

        setName(userData.username || userData.email || '');
        setEmail(userData.email || '');
        setAvatarUrl(userData.avatar ? pb.files.getURL(userData, userData.avatar) : null);
        profileLogger.debug(
          'refreshProfile: State updated - Name:',
          userData.username || userData.email || '',
          'Email:',
          userData.email || ''
        );
      }
    } catch (error) {
      profileLogger.error('Error refreshing profile:', error);
      // Don't show error for auto-cancellation
      if (!(error && typeof error === 'object' && 'status' in error && error.status === 0)) {
        profileLogger.error('Non-cancellation error refreshing profile:', error);
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [user]);

  // Fetch profile data with global caching
  useEffect(() => {
    profileLogger.debug(
      'useEffect for fetchProfile triggered. User:',
      user ? { id: user.id, email: user.email, username: user.username } : null
    );
    if (!user) {
      setProfileLoading(false);
      profileLogger.debug('useEffect: No user, setting profileLoading to false and returning.');
      return;
    }

    // Check if we already have cached data
    const cachedData = profileData.get(user.id);
    if (cachedData) {
      profileLogger.debug('Using cached profile data for user:', user.id);
      setName(cachedData.username || cachedData.email || '');
      setEmail(cachedData.email || '');
      setAvatarUrl(cachedData.avatar ? pb.files.getURL(cachedData, cachedData.avatar) : null);
      setProfileLoading(false);
      return;
    }

    // Check if there's already a request in progress
    const existingRequest = profileCache.get(user.id);
    if (existingRequest) {
      profileLogger.debug('Using existing request for user:', user.id);
      existingRequest
        .then(userData => {
          if (userData) {
            setName(userData.username || userData.email || '');
            setEmail(userData.email || '');
            setAvatarUrl(userData.avatar ? pb.files.getURL(userData, userData.avatar) : null);
          }
          setProfileLoading(false);
        })
        .catch(error => {
          profileLogger.error('Error from existing request:', error);
          setProfileLoading(false);
        });
      return;
    }

    // Prevent duplicate concurrent requests from this instance
    if (fetchingRef.current) {
      profileLogger.debug('useEffect: Already fetching, skipping duplicate request');
      return;
    }

    const fetchProfile = async () => {
      let isMounted = true;
      profileLogger.debug('fetchProfile async function started. User ID:', user?.id);

      try {
        fetchingRef.current = true;
        setProfileLoading(true);

        if (!isMounted) {
          profileLogger.debug('fetchProfile: Component unmounted before fetching user data.');
          return;
        }

        // Create the request and cache it
        const userDataPromise = pb.collection('users').getOne(user.id, {
          requestKey: `profile-${user.id}`, // Add request key for PocketBase deduplication
        }) as Promise<UserProfileData>;

        profileCache.set(user.id, userDataPromise);

        try {
          profileLogger.debug('fetchProfile: Attempting to get user data for ID:', user.id);
          const userData = await userDataPromise;
          profileLogger.debug('fetchProfile: User data from PocketBase:', userData);

          if (userData) {
            // Cache the data
            profileData.set(user.id, userData);

            if (isMounted) {
              setName(userData.username || userData.email || '');
              setEmail(userData.email || '');
              setAvatarUrl(userData.avatar ? pb.files.getURL(userData, userData.avatar) : null);
              profileLogger.debug(
                'fetchProfile: State updated - Name:',
                userData.username || userData.email || '',
                'Email:',
                userData.email || ''
              );
            }
          }
        } catch (error) {
          profileLogger.error('fetchProfile: Error fetching user data:', error);
          profileCache.delete(user.id); // Remove failed request from cache
          if (error && typeof error === 'object' && 'status' in error && error.status === 0) {
            profileLogger.debug('fetchProfile: User data request cancelled');
            return;
          }
          throw error;
        }
      } catch (error) {
        profileLogger.error('Error fetching profile data:', error);
        // Don't show toast for auto-cancellation
        if (!(error && typeof error === 'object' && 'status' in error && error.status === 0)) {
          toast({
            title: 'Warning',
            description: 'Some profile data could not be loaded',
            variant: 'destructive',
          });
        }
      } finally {
        fetchingRef.current = false;
        if (isMounted) {
          setProfileLoading(false);
        }
        // Clean up the cache entry when done (successful or failed)
        profileCache.delete(user.id);
      }

      return () => {
        isMounted = false;
      };
    };

    fetchProfile();

    return () => {
      fetchingRef.current = false;
    };
  }, [user, toast]);

  // Update profile function
  const updateProfile = async (userId: string, updates: { avatar: File | string | null }) => {
    try {
      if (updates.avatar instanceof File) {
        // Upload new avatar file
        const formData = new FormData();
        formData.append('avatar', updates.avatar);

        await pb.collection('users').update(userId, formData);
      } else if (updates.avatar === null) {
        // Remove avatar
        await pb.collection('users').update(userId, { avatar: null });
      }

      await refreshProfile();
      return { error: null };
    } catch (error) {
      profileLogger.error('Error updating profile:', error);
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
    avatarType,
    avatarVariant,
  };
};
