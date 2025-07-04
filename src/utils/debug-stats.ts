/**
 * Debug utilities for stats cache investigation
 *
 * These functions help diagnose stats cache issues by providing
 * direct access to the underlying data and cache state.
 */

import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { DashboardStatsService } from '@/services/pocketbase/dashboardStatsService';
import { createFilter } from '@/utils/filterBuilder';
import { logger } from './logger';

export interface DebugStats {
  userId: string;
  email?: string;
  totalProjects: number;
  projectsByStatus: Record<string, number>;
  completedProjects: Array<{
    id: string;
    title: string;
    date_completed: string;
    isIn2025: boolean;
  }>;
  manual2025Count: number;
  cachedStats?: {
    completed_count: number;
    last_calculated: string;
    cache_version: string;
  };
  queryResult2025: number;
}

/**
 * Comprehensive debug analysis for a user's stats
 */
export async function debugUserStats(userIdOrEmail: string): Promise<DebugStats> {
  let userId = userIdOrEmail;
  let email: string | undefined;

  // If it looks like an email, find the user first
  if (userIdOrEmail.includes('@')) {
    try {
      const user = await pb
        .collection('users')
        .getFirstListItem(createFilter().equals('email', userIdOrEmail).build());
      userId = user.id;
      email = user.email;
    } catch (error) {
      throw new Error(`User not found: ${userIdOrEmail}`);
    }
  }

  // Get all projects for this user
  const allProjects = await pb.collection(Collections.Projects).getFullList({
    filter: createFilter().userScope(userId).build(),
    fields: 'id,title,status,date_completed,date_started',
    sort: '-updated',
  });

  // Analyze projects by status
  const projectsByStatus: Record<string, number> = {};
  allProjects.forEach(project => {
    projectsByStatus[project.status] = (projectsByStatus[project.status] || 0) + 1;
  });

  // Focus on completed projects
  const completedProjects = allProjects
    .filter(p => p.status === 'completed')
    .map(project => ({
      id: project.id,
      title: project.title,
      date_completed: project.date_completed || 'null',
      isIn2025: !!(project.date_completed && project.date_completed >= '2025-01-01'),
    }));

  // Manual count of 2025 completed projects
  const manual2025Count = completedProjects.filter(p => p.isIn2025).length;

  // Test the actual query used by the stats service
  const yearStart = '2025-01-01';
  const queryResult = await pb.collection(Collections.Projects).getList(1, 1, {
    filter: createFilter()
      .userScope(userId)
      .status('completed')
      .greaterThan('date_completed', yearStart)
      .build(),
    fields: 'id',
  });

  // Check cached stats
  let cachedStats;
  try {
    const cached = await pb
      .collection('user_yearly_stats')
      .getFirstListItem(
        createFilter()
          .userScope(userId)
          .equals('year', 2025)
          .equals('stats_type', 'yearly')
          .build(),
        {
          fields: 'completed_count,last_calculated,cache_version',
        }
      );
    cachedStats = {
      completed_count: cached.completed_count,
      last_calculated: cached.last_calculated,
      cache_version: cached.cache_version,
    };
  } catch {
    // No cached stats found
  }

  return {
    userId,
    email,
    totalProjects: allProjects.length,
    projectsByStatus,
    completedProjects,
    manual2025Count,
    cachedStats,
    queryResult2025: queryResult.totalItems,
  };
}

/**
 * Force invalidate and recalculate stats for a user
 */
export async function forceRecalculateStats(userId: string, year = 2025): Promise<void> {
  logger.log(`🔄 Force recalculating stats for user ${userId}, year ${year}`);

  // Step 1: Invalidate cache
  await DashboardStatsService.invalidateCache(userId, year);
  logger.log('✅ Cache invalidated');

  // Step 2: Force fresh calculation
  const result = await DashboardStatsService.getYearlyStats(userId, year);
  logger.log('✅ Fresh stats calculated:', result.stats);
  logger.log('📊 Source:', result.source);

  return;
}

/**
 * Compare cached vs real-time stats
 */
export async function compareStats(userId: string, year = 2025) {
  secureLogger.log(`🔍 Comparing cached vs real-time stats for user ${userId}`);

  // Get current stats (may be cached)
  const currentStats = await DashboardStatsService.getYearlyStats(userId, year);
  secureLogger.log(
    '📋 Current stats (may be cached):',
    currentStats.stats,
    'Source:',
    currentStats.source
  );

  // Force fresh calculation
  await DashboardStatsService.invalidateCache(userId, year);
  const freshStats = await DashboardStatsService.getYearlyStats(userId, year);
  secureLogger.log('🆕 Fresh stats:', freshStats.stats, 'Source:', freshStats.source);

  // Compare
  const differences: Array<{
    field: string;
    cached: number;
    fresh: number;
  }> = [];
  const keys: Array<keyof typeof currentStats.stats> = [
    'completed_count',
    'started_count',
    'in_progress_count',
    'total_diamonds',
    'estimated_drills',
  ];

  keys.forEach(key => {
    if (currentStats.stats[key] !== freshStats.stats[key]) {
      differences.push({
        field: key,
        cached: currentStats.stats[key] as number,
        fresh: freshStats.stats[key] as number,
      });
    }
  });

  if (differences.length > 0) {
    secureLogger.log('⚠️  Found differences:');
    differences.forEach(diff => {
      secureLogger.log(`  ${diff.field}: ${diff.cached} (cached) vs ${diff.fresh} (fresh)`);
    });
  } else {
    secureLogger.log('✅ No differences found');
  }

  return { currentStats, freshStats, differences };
}

/**
 * Display cache metrics for monitoring
 */
export function showCacheMetrics(): void {
  const metrics = DashboardStatsService.getMetrics();

  secureLogger.log('📊 Dashboard Stats Cache Metrics:');
  secureLogger.log(`  Total Requests: ${metrics.totalRequests}`);
  secureLogger.log(`  Cache Hits: ${metrics.hits} (${(metrics.hitRate * 100).toFixed(1)}%)`);
  secureLogger.log(`  Cache Misses: ${metrics.misses}`);
  secureLogger.log(`  Errors: ${metrics.errors} (${(metrics.errorRate * 100).toFixed(1)}%)`);
  secureLogger.log(`  Background Refreshes: ${metrics.backgroundRefreshes}`);
  secureLogger.log(`  Pending Requests: ${metrics.pendingRequestsCount}`);
  secureLogger.log(`  Active Background Refreshes: ${metrics.backgroundRefreshesActive}`);
}

/**
 * Show detailed cache status for a user
 */
export async function showCacheStatus(userId: string, year = 2025) {
  secureLogger.log(`🕰️  Cache status for user ${userId}, year ${year}:`);

  const status = await DashboardStatsService.getCacheStatus(userId, year);

  if (!status.exists) {
    secureLogger.log('  ❌ No cache exists');
    return status;
  }

  secureLogger.log(`  ✅ Cache exists: ${status.fresh ? 'Fresh' : 'Stale'}`);
  secureLogger.log(`  🕐 Cached at: ${status.cached_at}`);
  secureLogger.log(`  ⏱️  Age: ${((status.age_ms || 0) / 1000 / 60).toFixed(1)} minutes`);

  if (status.needsBackgroundRefresh) {
    secureLogger.log('  🔄 Scheduled for background refresh');
  }

  return status;
}

/**
 * Reset cache metrics (useful for testing)
 */
export function resetCacheMetrics(): void {
  DashboardStatsService.resetMetrics();
  secureLogger.log('🔄 Cache metrics reset');
}

// Type for debug functions
interface DebugFunctions {
  debugUserStats: typeof debugUserStats;
  forceRecalculateStats: typeof forceRecalculateStats;
  compareStats: typeof compareStats;
  showCacheMetrics: typeof showCacheMetrics;
  showCacheStatus: typeof showCacheStatus;
  resetCacheMetrics: typeof resetCacheMetrics;
}

// Extend Window interface
declare global {
  interface Window {
    organizedGlitterDebug?: DebugFunctions;
  }
}

/**
 * Console helper for easy debugging
 */
export function enableDebugMode() {
  // Add debug functions to window for console access
  if (typeof window !== 'undefined') {
    // Create a debug namespace to avoid conflicts
    window.organizedGlitterDebug = {
      debugUserStats,
      forceRecalculateStats,
      compareStats,
      showCacheMetrics,
      showCacheStatus,
      resetCacheMetrics,
    };

    secureLogger.log('🛠️  Debug mode enabled. Available functions:');
    secureLogger.log('  organizedGlitterDebug.debugUserStats("email") - Analyze user stats');
    secureLogger.log('  organizedGlitterDebug.forceRecalculateStats(userId) - Force recalculation');
    secureLogger.log('  organizedGlitterDebug.compareStats(userId) - Compare cached vs fresh');
    secureLogger.log(
      '  organizedGlitterDebug.showCacheMetrics() - Display cache performance metrics'
    );
    secureLogger.log(
      '  organizedGlitterDebug.showCacheStatus(userId) - Show cache status for user'
    );
    secureLogger.log('  organizedGlitterDebug.resetCacheMetrics() - Reset performance metrics');
    secureLogger.log('');
    secureLogger.log('📋 Quick start:');
    secureLogger.log('  const debug = organizedGlitterDebug;');
    secureLogger.log('  debug.debugUserStats("test@tonks.cloud").then(console.log);');
    secureLogger.log('  debug.showCacheMetrics(); // Show performance metrics');
  }
}
