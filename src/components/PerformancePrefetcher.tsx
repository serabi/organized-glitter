import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/hooks/queries/queryKeys';

/**
 * PHASE 2.3: Background Prefetcher for Overview Performance
 * Proactively loads critical data during app initialization for instant perceived performance
 */
export const PerformancePrefetcher: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    // Only prefetch when user is authenticated
    if (!user?.id) return;

    const prefetchOverviewStats = async () => {
      try {
        const startTime = performance.now();

        // Import the new dashboard stats service for prefetching
        const { DashboardStatsService } = await import(
          '@/services/pocketbase/dashboardStatsService'
        );

        // Prefetch dashboard stats with high priority
        await queryClient.prefetchQuery({
          queryKey: [...queryKeys.stats.overview(user.id), 'dashboard', new Date().getFullYear()],
          queryFn: () => DashboardStatsService.getYearlyStats(user.id, new Date().getFullYear()),
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 30 * 60 * 1000, // 30 minutes
        });

        if (import.meta.env.DEV) {
          const prefetchTime = performance.now() - startTime;
          console.log(
            '[Performance Prefetcher] Overview stats prefetched in:',
            prefetchTime.toFixed(0),
            'ms'
          );
          console.log(
            '[Performance Prefetcher] Overview page will now load instantly on first visit'
          );
        }
      } catch (error) {
        // Silently handle prefetch errors - they shouldn't affect the user experience
        if (import.meta.env.DEV) {
          console.warn('[Performance Prefetcher] Failed to prefetch overview stats:', error);
        }
      }
    };

    // Delay prefetching slightly to avoid interfering with critical app initialization
    const prefetchTimer = setTimeout(() => {
      prefetchOverviewStats();
    }, 1000); // 1 second delay

    return () => clearTimeout(prefetchTimer);
  }, [user?.id, queryClient]);

  // This is a background utility component - renders nothing
  return null;
};

export default PerformancePrefetcher;
