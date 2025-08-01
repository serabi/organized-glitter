/**
 * Dashboard Synchronization Performance Monitor
 *
 * Provides debugging and performance monitoring tools for dashboard
 * status synchronization to help identify and prevent future issues.
 */

import { createLogger } from '@/utils/logger';

const logger = createLogger('DashboardSyncMonitor');

interface SyncEvent {
  timestamp: number;
  type: 'status_update' | 'cache_invalidation' | 'stats_update' | 'navigation';
  projectId?: string;
  status?: string;
  userId?: string;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

class DashboardSyncMonitor {
  private events: SyncEvent[] = [];
  private maxEvents = 100; // Keep last 100 events for debugging
  private performanceObserver?: PerformanceObserver;

  constructor() {
    // Initialize performance monitoring in development
    if (import.meta.env.DEV) {
      this.initializePerformanceMonitoring();
    }
  }

  private initializePerformanceMonitoring() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name.includes('dashboard') || entry.name.includes('project')) {
              logger.debug('🎯 Performance entry:', {
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime,
              });
            }
          });
        });

        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        logger.debug('Performance monitoring not available:', error);
      }
    }
  }

  /**
   * Record a synchronization event
   */
  recordEvent(event: Omit<SyncEvent, 'timestamp'>) {
    const syncEvent: SyncEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(syncEvent);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log important events
    if (!syncEvent.success) {
      logger.error('🚨 Sync event failed:', syncEvent);
    } else if (syncEvent.duration && syncEvent.duration > 1000) {
      logger.warn('⚠️ Slow sync event:', syncEvent);
    } else {
      logger.debug('✅ Sync event recorded:', syncEvent);
    }
  }

  /**
   * Start timing a synchronization operation
   */
  startTiming(operationName: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordEvent({
        type: 'cache_invalidation',
        duration,
        success: true,
        metadata: { operationName },
      });
    };
  }

  /**
   * Get recent events for debugging
   */
  getRecentEvents(count = 10): SyncEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SyncEvent['type']): SyncEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const now = Date.now();
    const recentEvents = this.events.filter(event => now - event.timestamp < 60000); // Last minute

    const summary = {
      totalEvents: recentEvents.length,
      successRate: recentEvents.filter(e => e.success).length / recentEvents.length,
      averageDuration:
        recentEvents.filter(e => e.duration).reduce((sum, e) => sum + (e.duration || 0), 0) /
        recentEvents.length,
      eventsByType: recentEvents.reduce(
        (acc, event) => {
          acc[event.type] = (acc[event.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      errors: recentEvents
        .filter(e => !e.success)
        .map(e => e.error)
        .filter(Boolean),
    };

    logger.info('📊 Dashboard sync performance summary:', summary);
    return summary;
  }

  /**
   * Check for potential issues
   */
  diagnose(): string[] {
    const issues: string[] = [];
    const recentEvents = this.events.slice(-20); // Last 20 events

    // Check for repeated failures
    const failures = recentEvents.filter(e => !e.success);
    if (failures.length > 3) {
      issues.push(`High failure rate: ${failures.length} failures in last 20 events`);
    }

    // Check for slow operations
    const slowEvents = recentEvents.filter(e => e.duration && e.duration > 2000);
    if (slowEvents.length > 0) {
      issues.push(`Slow operations detected: ${slowEvents.length} events over 2s`);
    }

    // Check for missing user context
    const eventsWithoutUser = recentEvents.filter(e => e.type === 'status_update' && !e.userId);
    if (eventsWithoutUser.length > 0) {
      issues.push(`Events without user context: ${eventsWithoutUser.length}`);
    }

    // Check for cache invalidation patterns
    const invalidationEvents = recentEvents.filter(e => e.type === 'cache_invalidation');
    if (invalidationEvents.length === 0 && recentEvents.length > 5) {
      issues.push('No cache invalidation events detected - potential sync issue');
    }

    return issues;
  }

  /**
   * Export events for external analysis
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Clear all recorded events
   */
  clear() {
    this.events = [];
    logger.info('🧹 Cleared dashboard sync monitor events');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.clear();
  }
}

// Global instance
export const dashboardSyncMonitor = new DashboardSyncMonitor();

// Development-only debugging helpers
if (import.meta.env.DEV) {
  // Add to window for debugging
  (window as unknown as Record<string, unknown>).__dashboardSyncMonitor = dashboardSyncMonitor;

  // Auto-diagnose every 30 seconds in development
  const diagnosisInterval = setInterval(() => {
    const issues = dashboardSyncMonitor.diagnose();
    if (issues.length > 0) {
      logger.warn('🔍 Dashboard sync issues detected:', issues);
    }
  }, 30000);

  // Cleanup on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearInterval(diagnosisInterval);
      dashboardSyncMonitor.destroy();
    });
  }
}

/**
 * Hook for easy monitoring integration
 */
export const useDashboardSyncMonitor = () => {
  return {
    recordEvent: dashboardSyncMonitor.recordEvent.bind(dashboardSyncMonitor),
    startTiming: dashboardSyncMonitor.startTiming.bind(dashboardSyncMonitor),
    getRecentEvents: dashboardSyncMonitor.getRecentEvents.bind(dashboardSyncMonitor),
    getPerformanceSummary: dashboardSyncMonitor.getPerformanceSummary.bind(dashboardSyncMonitor),
    diagnose: dashboardSyncMonitor.diagnose.bind(dashboardSyncMonitor),
  };
};
