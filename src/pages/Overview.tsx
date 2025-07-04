import { useMemo, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { useProfileData } from '@/hooks/queries/useUserProfileQuery';
import { logger } from '@/utils/logger';

// Import custom hooks
import { useAuth } from '@/hooks/useAuth';
import { useInProgressProjects } from '@/hooks/queries/useInProgressProjects';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

// Import UI components
import { WelcomeSection } from '@/components/overview/WelcomeSection';
import { InProgressSection } from '@/components/overview/InProgressSection';
import { QuickActionsSection } from '@/components/overview/QuickActionsSection';
import { ThankYouMessage } from '@/components/overview/ThankYouMessage';
import { Skeleton } from '@/components/ui/skeleton';
import { OverviewErrorBoundary } from '@/components/error/ComponentErrorBoundaries';

/**
 * Overview Page - Simplified to show welcome section and in-progress projects only
 * Stats have been removed as part of caching simplification - will re-add later via a dashboard SWM
 */
const Overview = () => {
  // Performance monitoring
  useEffect(() => {
    const mountTime = performance.now();
    logger.debug(`[Overview] Overview mounted at: ${mountTime}`, { component: 'Overview' });

    if (import.meta.env.DEV) {
      logger.log(
        '[Overview] Simplified overview page loaded - Welcome section and in-progress projects only'
      );
    }

    return () => {
      logger.debug(`[Overview] Overview unmounted at: ${performance.now()}`, {
        component: 'Overview',
      });
    };
  }, []);

  // Custom hooks
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfileData(user?.id);
  const { toast } = useToast();

  // Performance monitoring
  const { logPerformanceReport } = usePerformanceMonitoring({
    enabled: true,
    componentName: 'Overview Page',
    trackToAnalytics: false, // Enable when analytics are set up
  });

  // Progressive loading - separate critical from non-critical data
  // Critical: User email for Welcome section (available immediately from auth)
  const criticalUserEmail = user?.email || '';

  // Non-critical: Profile name, avatar (can load progressively)
  const displayName = useMemo(() => profile?.name || 'Diamond Artist', [profile?.name]);
  const isProfileReady = !profileLoading && profile?.name;

  // In-Progress Projects Query - simplified from previous stats+projects query
  const {
    inProgressProjects,
    isLoading: projectsLoading,
    isError,
    error,
    refetch,
  } = useInProgressProjects();

  // Enhanced error detection and fallback states
  const hasProjects = inProgressProjects.length > 0;
  const showErrorFallback = isError && !hasProjects;

  // Log when projects are loaded and track performance
  useEffect(() => {
    if (!projectsLoading) {
      if (import.meta.env.DEV) {
        const loadTime = performance.now();
        logger.debug(`[Overview] Projects loaded at: ${loadTime}`, {
          component: 'Overview',
          projectsCount: inProgressProjects.length,
        });

        // Log performance report when data is loaded
        const timerId = setTimeout(logPerformanceReport, 100);

        if (loadTime < 200) {
          logger.log('🎉 [Overview] Excellent performance! Projects loaded in <200ms');
        }

        // Cleanup timeout on component unmount or dependency change
        return () => clearTimeout(timerId);
      }
    }
  }, [projectsLoading, inProgressProjects, logPerformanceReport]);

  // Error handling for projects query
  useEffect(() => {
    if (error && user?.id && isError) {
      // Don't show toast for auto-cancellation
      if (
        !(
          error &&
          typeof error === 'object' &&
          'status' in error &&
          (error as { status: number }).status === 0
        )
      ) {
        toast({
          title: 'Error',
          description: 'Failed to load your in-progress projects. Please try again.',
          variant: 'destructive',
        });
      }
    }
  }, [error, user?.id, isError, toast]);

  // Progressive Loading - Only block on auth loading, ProtectedRoute handles auth redirects
  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-primary"></div>
          <p className="ml-3 text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  // Progressive Rendering - Show content immediately
  return (
    <MainLayout>
      <OverviewErrorBoundary onCacheRefresh={refetch} hasInfrastructureError={false}>
        <div className="container mx-auto space-y-12 px-4 py-8">
          {/* Welcome Section - Renders immediately with email fallback */}
          <WelcomeSection
            displayName={displayName}
            avatarUrl={profile?.avatarUrl || null}
            avatarType={null}
            email={criticalUserEmail}
            isLoadingProfile={!isProfileReady}
          />

          {/* Enhanced loading/error states with graceful degradation */}
          {projectsLoading ? (
            <>
              {/* In Progress Projects Skeleton */}
              <section className="mb-12">
                <div className="mb-6 flex items-center">
                  <Skeleton className="h-8 w-64" />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              </section>
            </>
          ) : showErrorFallback ? (
            // Show error fallback when no projects data is available
            <div className="space-y-6 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <svg
                  className="h-8 w-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Unable to Load Projects
                </h3>
                <p className="mx-auto max-w-md text-gray-600 dark:text-gray-400">
                  There was a problem loading your in-progress projects. Please try again.
                </p>
              </div>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={() => refetch()}
                  className="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* In Progress Projects Section */}
              <InProgressSection
                inProgressProjects={inProgressProjects}
                isLoading={projectsLoading}
              />
            </>
          )}

          {/* Quick Actions - Always visible */}
          <QuickActionsSection />

          {/* Thank You Message - Always visible */}
          <ThankYouMessage />
        </div>
      </OverviewErrorBoundary>
    </MainLayout>
  );
};

export default Overview;
