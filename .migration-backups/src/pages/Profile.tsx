import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfileReactQuery } from '@/hooks/useProfileReactQuery';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateBetaTesterStatusMutation } from '@/hooks/mutations/useUpdateBetaTesterStatusMutation';
import { useAvatar } from '@/hooks/useAvatar';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePersonalInfo from '@/components/profile/ProfilePersonalInfo';
import AccountSettings from '@/components/profile/AccountSettings';
import DataImportExportSettings from '@/components/profile/DataImportExportSettings';
import PayPalSupportSection from '@/components/profile/PayPalSupportSection';
import { TimezonePreferences } from '@/components/profile/TimezonePreferences';
import { useToast } from '@/hooks/use-toast';
import type { AvatarConfig } from '@/types/avatar';
import { logger } from '@/utils/logger';
import { useUpdateTimezoneMutation } from '@/hooks/mutations/useUpdateTimezoneMutation';

// Lazy load tab components for better performance
const CompanyListTab = lazy(() => import('@/components/profile/CompanyListTab'));
const ArtistListTab = lazy(() => import('@/components/profile/ArtistListTab'));
const TagListTab = lazy(() => import('@/components/profile/TagListTab'));

const Profile = () => {
  // URL query parameter handling for tabs
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  // Authentication handling
  const { user, isLoading: authLoading } = useAuth();

  // Profile data with React Query
  const {
    name,
    setName,
    email,
    avatarUrl,
    setAvatarUrl,
    loading: profileActionLoading,
    setLoading,
    profileLoading,
    refreshProfile,
    // Beta tester status
    isBetaTester,
  } = useProfileReactQuery();

  const updateBetaTesterMutation = useUpdateBetaTesterStatusMutation();
  const updateTimezoneMutation = useUpdateTimezoneMutation();

  // Helper function to update beta tester status (replaces setIsBetaTester)
  const setIsBetaTester = async (newStatus: boolean) => {
    if (!user?.id) return;
    try {
      await updateBetaTesterMutation.mutateAsync({
        userId: user.id,
        isBetaTester: newStatus,
      });
    } catch (error) {
      logger.error('Error updating beta tester status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update beta tester status',
        variant: 'destructive',
      });
    }
  };

  // Helper function to update timezone preference
  const handleTimezoneUpdate = async (timezone: string) => {
    if (!user?.id) return;
    try {
      await updateTimezoneMutation.mutateAsync({
        userId: user.id,
        timezone: timezone,
      });
    } catch (error) {
      logger.error('Error updating timezone:', error);
      toast({
        title: 'Error',
        description: 'Failed to update timezone preference',
        variant: 'destructive',
      });
      throw error; // Re-throw to let the component handle it
    }
  };

  // Avatar management
  const { revertToInitials } = useAvatar();

  const { toast } = useToast();

  // Handle avatar updates with React Query cache invalidation
  const handleAvatarUpdate = async (config: AvatarConfig) => {
    try {
      if (config.type === 'upload' && config.uploadUrl) {
        // The avatar is already uploaded by AvatarManager
        // Add cache-busting parameter to force refresh
        const cacheBustedUrl = `${config.uploadUrl}?t=${Date.now()}`;

        // Update the local state immediately with cache-busted URL
        setAvatarUrl(cacheBustedUrl);

        // Force multiple cache refreshes to ensure consistency
        refreshProfile();
        setTimeout(() => refreshProfile(), 500);
        setTimeout(() => refreshProfile(), 1000);

        toast({
          title: 'Success',
          description: 'Your avatar has been updated successfully!',
          variant: 'default',
        });
      } else if (config.type === 'initials') {
        // Use the useAvatar hook for initials handling
        await revertToInitials();

        toast({
          title: 'Success',
          description: 'Avatar reverted to initials successfully!',
          variant: 'default',
        });
      }
    } catch (error) {
      logger.error('Error updating avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to update avatar. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Show loading state while authentication or profile is being loaded
  if (authLoading || profileLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Don't render if user is not authenticated (ProtectedRoute will handle redirect)
  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto max-w-5xl px-4 py-4 md:py-8">
        <div className="space-y-6">
          <ProfileHeader />

          <Tabs
            value={activeTab}
            onValueChange={value => {
              setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                if (value === 'profile') {
                  newParams.delete('tab'); // Clean URL for default tab
                } else {
                  newParams.set('tab', value);
                }
                return newParams;
              });
            }}
            className="w-full"
          >
            <div className="sticky top-16 z-10 -mx-4 border-b border-border/50 bg-background px-4 pb-4 pt-2 md:top-0 md:mx-0 md:px-0">
              <div className="overflow-x-auto">
                <TabsList className="grid w-full min-w-fit grid-cols-5">
                  <TabsTrigger value="profile" className="px-2 text-xs sm:px-4 sm:text-sm">
                    Data
                  </TabsTrigger>
                  <TabsTrigger value="preferences" className="px-2 text-xs sm:px-4 sm:text-sm">
                    Preferences
                  </TabsTrigger>
                  <TabsTrigger value="companies" className="px-2 text-xs sm:px-4 sm:text-sm">
                    Company List
                  </TabsTrigger>
                  <TabsTrigger value="artists" className="px-2 text-xs sm:px-4 sm:text-sm">
                    Artist List
                  </TabsTrigger>
                  <TabsTrigger value="tags" className="px-2 text-xs sm:px-4 sm:text-sm">
                    Tag List
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="mt-6">
              <TabsContent value="profile" className="space-y-6">
                <ProfilePersonalInfo
                  userId={user?.id}
                  username={name}
                  setName={setName}
                  email={email}
                  avatarUrl={avatarUrl}
                  setAvatarUrl={setAvatarUrl}
                  loading={profileActionLoading} // Updated loading prop
                  setLoading={setLoading}
                  profileLoading={profileLoading}
                  isBetaTester={isBetaTester}
                  onBetaTesterChange={newStatus => {
                    setIsBetaTester(newStatus);
                  }}
                  // Avatar management props
                  onAvatarUpdate={handleAvatarUpdate}
                />

                {/* Use existing DataImportExportSettings component */}
                <DataImportExportSettings profileLoading={profileLoading} />

                {/* Support Section */}
                <PayPalSupportSection />
              </TabsContent>

              <TabsContent value="preferences" className="space-y-6">
                <AccountSettings
                  loading={profileActionLoading}
                  email={email}
                  name={name}
                  setName={setName}
                  userId={user?.id}
                />

                <TimezonePreferences onTimezoneUpdate={handleTimezoneUpdate} />
              </TabsContent>

              <TabsContent value="companies">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                    </div>
                  }
                >
                  <CompanyListTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="artists">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                    </div>
                  }
                >
                  <ArtistListTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="tags">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                    </div>
                  }
                >
                  <TagListTab />
                </Suspense>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
