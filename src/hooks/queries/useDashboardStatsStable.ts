import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { dashboardStatsOptions } from './dashboardStatsOptions';
import { useAuth } from '@/hooks/useAuth';
import { DashboardStatsResult } from '@/types/dashboard';

export const useDashboardStatsStable = (): DashboardStatsResult => {
  const { user } = useAuth();
  const userId = user?.id;

  const queryConfig = useMemo(() => dashboardStatsOptions(userId || ''), [userId]);

  const query = useQuery({
    ...queryConfig,
    enabled: !!userId,
  });

  const stats = useMemo(() => {
    if (!query.data?.stats) return null;
    return query.data.stats;
  }, [query.data?.stats]);

  return useMemo(
    () => ({
      stats,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      source: (query.data?.source as 'optimized' | 'legacy' | 'unknown') || 'unknown',
    }),
    [stats, query.isLoading, query.isError, query.error, query.data?.source]
  );
};
