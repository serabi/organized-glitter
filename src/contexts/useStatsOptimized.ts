/**
 * useStatsOptimized hook - extracted for React Fast Refresh optimization
 * @author @serabi
 * @created 2025-08-02
 */

import { useContext } from 'react';
import { StatsContextOptimized, type StatsContextOptimizedType } from '@/contexts/contexts-stats';

/**
 * Hook to access optimized stats context
 * Must be used within a StatsProviderOptimized component.
 *
 * @returns StatsContextOptimizedType with optimized stats data and loading states
 * @throws Error if used outside of StatsProviderOptimized
 */
export const useStatsOptimized = (): StatsContextOptimizedType => {
  const context = useContext(StatsContextOptimized);
  if (!context) {
    throw new Error('useStatsOptimized must be used within a StatsProviderOptimized');
  }
  return context;
};

// Re-export StatsProviderOptimized for backward compatibility
export { StatsProviderOptimized } from '@/contexts/StatsContextOptimized';
