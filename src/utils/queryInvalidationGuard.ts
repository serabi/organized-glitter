/**
 * Query Invalidation Guard - Prevents Infinite Invalidation Loops
 * @author @serabi
 * @created 2025-07-04
 */

import { QueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/logger';

const logger = createLogger('QueryInvalidationGuard');

/**
 * Tracks ongoing invalidations to prevent cascading loops
 */
class InvalidationTracker {
  private activeInvalidations = new Map<string, number>();
  private invalidationCounts = new Map<string, number>();
  private readonly MAX_INVALIDATIONS_PER_WINDOW = 5;
  private readonly TIME_WINDOW_MS = 5000; // 5 seconds
  private readonly COOLDOWN_MS = 1000; // 1 second

  /**
   * Creates a unique key for tracking invalidations
   */
  private createKey(queryKey: readonly unknown[]): string {
    try {
      return JSON.stringify(queryKey);
    } catch {
      return String(queryKey);
    }
  }

  /**
   * Checks if an invalidation should be allowed
   */
  canInvalidate(queryKey: readonly unknown[]): boolean {
    const key = this.createKey(queryKey);
    const now = Date.now();

    // Check if this invalidation is already in progress
    const activeTime = this.activeInvalidations.get(key);
    if (activeTime && now - activeTime < this.COOLDOWN_MS) {
      logger.warn('🚫 Invalidation blocked - already in progress', {
        queryKey: key,
        timeSinceStart: now - activeTime,
      });
      return false;
    }

    // Clean up old count entries
    this.cleanupOldCounts(now);

    // Check invalidation frequency
    const count = this.invalidationCounts.get(key) || 0;
    if (count >= this.MAX_INVALIDATIONS_PER_WINDOW) {
      logger.error('🚨 Invalidation blocked - too frequent', {
        queryKey: key,
        count,
        maxAllowed: this.MAX_INVALIDATIONS_PER_WINDOW,
        timeWindow: this.TIME_WINDOW_MS,
      });
      return false;
    }

    return true;
  }

  /**
   * Marks an invalidation as started
   */
  startInvalidation(queryKey: readonly unknown[]): void {
    const key = this.createKey(queryKey);
    const now = Date.now();

    this.activeInvalidations.set(key, now);
    this.invalidationCounts.set(key, (this.invalidationCounts.get(key) || 0) + 1);

    logger.debug('⏳ Invalidation started', { queryKey: key });
  }

  /**
   * Marks an invalidation as completed
   */
  completeInvalidation(queryKey: readonly unknown[]): void {
    const key = this.createKey(queryKey);
    this.activeInvalidations.delete(key);

    logger.debug('✅ Invalidation completed', { queryKey: key });
  }

  /**
   * Cleans up old count entries outside the time window
   */
  private cleanupOldCounts(now: number): void {
    const cutoff = now - this.TIME_WINDOW_MS;

    for (const [key, timestamp] of this.activeInvalidations.entries()) {
      if (timestamp < cutoff) {
        this.activeInvalidations.delete(key);
        this.invalidationCounts.delete(key);
      }
    }
  }

  /**
   * Gets current invalidation statistics for debugging
   */
  getStats(): { active: number; totalCounts: number } {
    return {
      active: this.activeInvalidations.size,
      totalCounts: Array.from(this.invalidationCounts.values()).reduce((a, b) => a + b, 0),
    };
  }
}

// Global tracker instance
const tracker = new InvalidationTracker();

/**
 * Safe wrapper for queryClient.invalidateQueries with loop protection
 */
export async function safeInvalidateQueries(
  queryClient: QueryClient,
  options: Parameters<typeof queryClient.invalidateQueries>[0],
  context?: { source?: string }
): Promise<void> {
  const queryKey = options.queryKey || [];

  if (!tracker.canInvalidate(queryKey)) {
    logger.warn('🛡️ Invalidation prevented by circuit breaker', {
      queryKey,
      source: context?.source,
      stats: tracker.getStats(),
    });
    return;
  }

  tracker.startInvalidation(queryKey);

  try {
    await queryClient.invalidateQueries(options);
    logger.debug('🔄 Safe invalidation completed', {
      queryKey,
      source: context?.source,
    });
  } catch (error) {
    logger.error('❌ Invalidation failed', {
      queryKey,
      error: error?.message,
      source: context?.source,
    });
    throw error;
  } finally {
    tracker.completeInvalidation(queryKey);
  }
}

/**
 * Enhanced hook for tracking invalidation patterns in development
 */
export function useInvalidationMonitor() {
  if (process.env.NODE_ENV === 'development') {
    return {
      getStats: () => tracker.getStats(),
      logStats: () => {
        const stats = tracker.getStats();
        logger.info('📊 Invalidation Monitor Stats:', stats);
      },
    };
  }

  return {
    getStats: () => ({ active: 0, totalCounts: 0 }),
    logStats: () => {},
  };
}
