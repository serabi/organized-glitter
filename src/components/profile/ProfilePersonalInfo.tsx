import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { BetaTesterIcon } from '@/components/auth/icons';
import AvatarDisplay from './AvatarDisplay';
import { AvatarManager } from './AvatarManager';
import { createAvatarConfig, getUserInitials } from '@/utils/avatarUtils';
import { AvatarConfig } from '@/types/avatar';

interface ProfilePersonalInfoProps {
  userId: string | undefined;
  username: string;
  setName: React.Dispatch<React.SetStateAction<string>>; // This should be setUsername
  email: string;
  avatarUrl: string | null;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  profileLoading: boolean;
  isBetaTester?: boolean;
  onBetaTesterChange?: (newStatus: boolean) => void;
  // Avatar management props
  onAvatarUpdate?: (config: AvatarConfig) => Promise<void>;
}

const ProfilePersonalInfo: React.FC<ProfilePersonalInfoProps> = ({
  userId,
  username,
  email,
  avatarUrl,
  profileLoading,
  isBetaTester = false,
  onAvatarUpdate,
}) => {
  const [isAvatarManagerOpen, setIsAvatarManagerOpen] = useState(false);

  // Memoize avatar configuration to prevent unnecessary re-renders
  const currentAvatarConfig = useMemo(() => {
    const config = createAvatarConfig({
      avatar_url: avatarUrl,
      email: email,
      username: username,
    });
    console.log('[ProfilePersonalInfo] Created avatar config:', config);
    return config;
  }, [avatarUrl, email, username]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleAvatarManagerOpen = useCallback(() => {
    // Track avatar manager interaction only when opened
    // addBreadcrumb removed

    setIsAvatarManagerOpen(true);
  }, []);

  const handleAvatarUpdate = useCallback(
    async (config: AvatarConfig) => {
      if (onAvatarUpdate) {
        await onAvatarUpdate(config);
      }
      // Don't close the modal here - let AvatarManager handle it after awaiting the callback
    },
    [onAvatarUpdate]
  );

  // Only track component load once, not on every render
  React.useEffect(() => {
    // addBreadcrumb removed
  }, [userId]); // Only depend on userId to avoid excessive tracking

  if (profileLoading) {
    // Track loading state
    // addBreadcrumb removed

    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex w-full animate-pulse items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-muted"></div>
            <div className="flex-1 space-y-4">
              <div className="h-4 w-3/4 rounded bg-muted"></div>
              <div className="h-4 w-1/2 rounded bg-muted"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Track successful component render only when not loading
  if (!profileLoading) {
    // addBreadcrumb removed
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Avatar Section - Left Column (RESTORED) */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-background">
              <AvatarDisplay
                config={currentAvatarConfig}
                size={128}
                fallbackInitials={getUserInitials(username, email)}
                className="h-full w-full rounded-full object-cover"
              />
            </div>

            <div className="w-full max-w-[200px] space-y-2">
              {onAvatarUpdate ? (
                <Button
                  onClick={handleAvatarManagerOpen}
                  variant="outline"
                  className="flex w-full items-center justify-center gap-2"
                  size="sm"
                  type="button"
                >
                  <Settings className="h-4 w-4" />
                  Manage Avatar
                </Button>
              ) : null}
            </div>
          </div>

          {/* User Info - Middle and Right Columns */}
          <div className="md:col-span-2">
            <Card className="border border-border bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle
                  className="text-left text-lg font-semibold text-primary-foreground"
                  style={{ color: '#FF6B81' }}
                >
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-12 items-center gap-y-4">
                  {/* Username Row */}
                  <div className="col-span-4 font-medium text-muted-foreground">Username:</div>
                  <div className="col-span-8 flex items-center justify-between">
                    <span className="text-base font-semibold">
                      {username && username.trim() !== '' ? username : 'Diamond Art Enthusiast'}
                    </span>
                    {isBetaTester && (
                      <span className="ml-2 flex items-center font-semibold text-yellow-500">
                        <BetaTesterIcon className="mr-1 h-5 w-5" />
                        Beta Tester
                      </span>
                    )}
                  </div>
                  {/* Email Row */}
                  <div className="col-span-4 font-medium text-muted-foreground">Email:</div>
                  <div className="col-span-8">
                    <span className="text-base font-semibold">{email || 'Not set'}</span>
                  </div>
                </div>
                <hr className="my-6 border-border/60" />
                <div className="text-sm text-muted-foreground">
                  You can change these settings in the Account Settings section below.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
      {/* Avatar Manager Modal - Triggered by the button above */}
      {onAvatarUpdate && (
        <AvatarManager
          isOpen={isAvatarManagerOpen}
          onClose={() => setIsAvatarManagerOpen(false)}
          currentAvatar={avatarUrl || undefined}
          currentConfig={currentAvatarConfig}
          onAvatarUpdate={async config => {
            await handleAvatarUpdate(config);
            setIsAvatarManagerOpen(false);
          }}
          userEmail={email} // Ensure userEmail is passed
        />
      )}
    </Card>
  );
};

export default ProfilePersonalInfo;
