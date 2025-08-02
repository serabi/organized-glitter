/**
 * useStats hook - backward compatibility hook extracted for React Fast Refresh optimization
 * @author @serabi
 * @created 2025-08-02
 */

import { useStatsOptimized } from '@/contexts/useStatsOptimized';
import type { StatsContextOptimizedType } from '@/contexts/contexts-stats';
import { StatusBreakdown } from '@/types/dashboard';

/**
 * Backward compatibility hook that provides the same interface as the original useStats
 * This allows existing components to work with the optimized context without changes
 */
export const useStats = (): Omit<StatsContextOptimizedType, 'performanceMetrics'> & {
  stats: { status_breakdown: StatusBreakdown } | null;
} => {
  const optimizedContext = useStatsOptimized();

  // Transform to match original interface
  return {
    ...optimizedContext,
    stats: optimizedContext.statusCounts
      ? { status_breakdown: optimizedContext.statusCounts }
      : null,
  };
};
