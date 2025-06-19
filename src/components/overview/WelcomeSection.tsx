import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, UploadCloud } from 'lucide-react';
import AvatarDisplay from '@/components/profile/AvatarDisplay';
import { createAvatarConfig, getUserInitials } from '@/utils/avatarUtils';
import '@/styles/welcome-section.css';

interface WelcomeSectionProps {
  displayName: string;
  avatarUrl: string | null;
  avatarType: string | null;
  email: string;
  isLoadingProfile?: boolean;
}

/**
 * Welcome section component with gradient styling and action buttons
 * Memoized for performance optimization
 */
function WelcomeSectionComponent({
  displayName,
  avatarUrl,
  avatarType,
  email,
  isLoadingProfile = false,
}: WelcomeSectionProps) {
  // Use the same avatar configuration logic as the Profile page
  const avatarConfig = createAvatarConfig({
    avatar_url: avatarUrl,
    avatar_type: avatarType,
    email: email,
    // username: undefined, // Or pass a username if available from useProfile and needed
  });

  const calculatedFallbackInitials = getUserInitials(displayName, email);

  return (
    <section className="rounded-xl border border-border/20 bg-gradient-to-r from-primary/10 via-mauve-500/5 to-flamingo-400/5 p-6 py-8 text-center shadow-lg dark:from-primary/20 dark:via-mauve-500/10 dark:to-flamingo-400/10 md:p-10 md:py-12 md:text-left">
      <div className="mb-3 flex flex-col items-center justify-between md:flex-row">
        <div className="mb-3 flex flex-col items-center gap-4 sm:flex-row md:mb-0">
          {/* Picture frame around avatar */}
          <div className="picture-frame">
            <div className="picture-frame-photo">
              <AvatarDisplay
                config={avatarConfig}
                size={64}
                className="flex-shrink-0"
                fallbackInitials={calculatedFallbackInitials}
              />
            </div>
          </div>
          <h1 className="text-center text-3xl font-bold text-foreground sm:text-left md:text-4xl">
            Welcome,{' '}
            {isLoadingProfile ? (
              <Skeleton className="inline-block h-9 w-32 align-middle" />
            ) : (
              <span className="bg-gradient-to-r from-primary via-mauve-500 to-flamingo-500 bg-clip-text text-transparent">
                {displayName}!
              </span>
            )}
          </h1>
        </div>
        <div className="flex flex-col items-center gap-3 md:items-start">
          <div className="flex w-full flex-col justify-center gap-3 sm:flex-row md:justify-start">
            <Button
              asChild
              className="w-full px-4 shadow-md transition-shadow hover:shadow-lg sm:w-auto"
            >
              <Link to="/projects/new">
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Project
              </Link>
            </Button>
            <Button
              size="default"
              variant="outline"
              asChild
              className="w-full shadow-md transition-shadow hover:shadow-lg sm:w-auto"
            >
              <Link to="/dashboard">View Full Dashboard</Link>
            </Button>
          </div>
          <div className="flex w-full justify-center">
            <Button
              size="default"
              variant="outline"
              asChild
              className="w-full shadow-md transition-shadow hover:shadow-lg sm:w-auto"
            >
              <Link to="/import">
                <UploadCloud className="mr-2 h-5 w-5" /> Import Projects via CSV
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Memoized export for performance optimization
export const WelcomeSection = memo(WelcomeSectionComponent);
