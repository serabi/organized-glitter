import { useEffect, useState, memo } from 'react';
import { BetaTesterIcon } from '@/components/auth/icons';
import { pb } from '@/lib/pocketbase';

interface ProfileIconsProps {
  userId: string | undefined;
  isBetaTester?: boolean;
  onBetaTesterChange?: (newStatus: boolean) => void;
}

// Memoize the component to prevent unnecessary re-renders
const ProfileIcons = memo(
  ({
    userId,
    isBetaTester = false,
    onBetaTesterChange: _onBetaTesterChange,
  }: ProfileIconsProps) => {
    const [showBetaBadge, setShowBetaBadge] = useState(isBetaTester);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // If we have a prop value, use it and don't fetch
      if (isBetaTester !== undefined) {
        console.log('ProfileIcons - Using prop value:', isBetaTester);
        setShowBetaBadge(isBetaTester);
        setIsLoading(false);
        return;
      }

      // Only fetch from database if we don't have a prop value and have a userId
      if (!userId) {
        setIsLoading(false);
        return;
      }

      // Otherwise fetch from database
      const checkBetaStatus = async () => {
        try {
          const user = await pb.collection('users').getOne(userId);
          console.log('ProfileIcons - Database check result:', user.beta_tester);
          setShowBetaBadge(!!user.beta_tester);
        } catch (error) {
          console.error('Error checking beta status:', error);
        } finally {
          setIsLoading(false);
        }
      };

      checkBetaStatus();
    }, [userId, isBetaTester]); // Stable dependencies

    // Don't render while loading or if no badge to show
    if (isLoading || !userId || !showBetaBadge) return null;

    return (
      <div className="beta-tester-icon flex items-center gap-1 text-amber-400" title="Beta Tester">
        <BetaTesterIcon className="h-5 w-5" />
        <span className="text-sm font-medium">Beta Tester</span>
      </div>
    );
  }
);

ProfileIcons.displayName = 'ProfileIcons';

export default ProfileIcons;
