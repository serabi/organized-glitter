/**
 * Performance monitoring hook for Overview page optimization
 * Tracks real-world performance metrics for analysis and optimization
 */

import { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstMeaningfulPaint: number;
  componentMountTime: number;
  statsLoadTime?: number;
  source?: 'cache' | 'realtime' | 'partial';
}

interface UsePerformanceMonitoringOptions {
  enabled?: boolean;
  trackToAnalytics?: boolean;
  componentName?: string;
}

/**
 * Hook to track performance metrics for the Overview page
 */
export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions = {}) {
  const {
    enabled = import.meta.env.DEV,
    trackToAnalytics = false,
    componentName = 'Unknown',
  } = options;

  const startTimeRef = useRef<number>(0);
  const mountTimeRef = useRef<number | null>(null);
  const metricsRef = useRef<Partial<PerformanceMetrics>>({});

  // Initialize start time and track component mount time
  useEffect(() => {
    if (!enabled || typeof performance === 'undefined') return;

    // Initialize start time on first effect run
    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now();
    }

    mountTimeRef.current = performance.now();
    const componentMountTime = mountTimeRef.current - startTimeRef.current;

    metricsRef.current.componentMountTime = componentMountTime;

    if (import.meta.env.DEV) {
      logger.log(`[Performance] ${componentName} mounted in ${componentMountTime.toFixed(2)}ms`);
    }
  }, [enabled, componentName]);

  // Track page load completion
  useEffect(() => {
    if (!enabled || typeof performance === 'undefined') return;

    const trackPageLoad = () => {
      const pageLoadTime = performance.now() - startTimeRef.current;
      metricsRef.current.pageLoadTime = pageLoadTime;

      // Get navigation timing if available
      if (performance.getEntriesByType) {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        if (navigation?.loadEventStart && navigation?.fetchStart) {
          const firstMeaningfulPaint = navigation.loadEventStart - navigation.fetchStart;
          metricsRef.current.firstMeaningfulPaint = firstMeaningfulPaint;
        }
      }

      if (import.meta.env.DEV) {
        logger.log(
          `[Performance] ${componentName} page load completed in ${pageLoadTime.toFixed(2)}ms`
        );
      }

      // Send to analytics if enabled
      if (trackToAnalytics && typeof window !== 'undefined') {
        // Analytics integration would go here
        // Example: analytics.track('overview_performance', metricsRef.current);
      }
    };

    // Track when the page is fully loaded
    if (typeof document !== 'undefined') {
      if (document.readyState === 'complete') {
        trackPageLoad();
      } else if (typeof window !== 'undefined') {
        window.addEventListener('load', trackPageLoad);
        return () => window.removeEventListener('load', trackPageLoad);
      }
    }
  }, [enabled, componentName, trackToAnalytics]);

  // Function to track stats loading performance
  const trackStatsLoading = (duration: number, source: 'cache' | 'realtime' | 'partial') => {
    if (!enabled) return;

    metricsRef.current.statsLoadTime = duration;
    metricsRef.current.source = source;

    if (import.meta.env.DEV) {
      logger.log(`[Performance] Stats loaded in ${duration.toFixed(2)}ms from ${source}`);

      // Performance analysis
      if (source === 'cache' && duration > 100) {
        logger.warn(
          '[Performance] Cache hit but slow response time - investigate database performance'
        );
      } else if (source === 'realtime' && duration > 2000) {
        logger.warn('[Performance] Real-time calculation is slow - consider optimizing queries');
      } else if (source === 'cache' && duration < 50) {
        logger.log('[Performance] ✅ Excellent cache performance');
      }
    }
  };

  // Function to get current metrics
  const getMetrics = (): Partial<PerformanceMetrics> => {
    return { ...metricsRef.current };
  };

  // Function to log a performance report
  const logPerformanceReport = () => {
    if (!enabled || !import.meta.env.DEV) return;

    const metrics = getMetrics();
    logger.group(`[Performance Report] ${componentName}`);
    logger.table(metrics);

    // Performance recommendations
    if (metrics.pageLoadTime && metrics.pageLoadTime > 3000) {
      logger.warn('Page load time > 3s - consider further optimizations');
    } else if (metrics.pageLoadTime && metrics.pageLoadTime < 1000) {
      logger.log('✅ Excellent page load performance');
    }

    if (metrics.statsLoadTime && metrics.source === 'cache' && metrics.statsLoadTime < 100) {
      logger.log('✅ Excellent stats cache performance');
    }

    logger.groupEnd();
  };

  return {
    trackStatsLoading,
    getMetrics,
    logPerformanceReport,
    startTime: typeof performance !== 'undefined' ? startTimeRef.current : 0,
  };
}

/**
 * Simplified hook for basic performance tracking
 */
export function useSimplePerformanceTracking(componentName: string) {
  const startTime = useRef(0);

  useEffect(() => {
    if (typeof performance === 'undefined') return;

    // Initialize start time on mount
    startTime.current = performance.now();

    return () => {
      if (typeof performance === 'undefined') return;

      const endTime = performance.now();
      const duration = endTime - startTime.current;

      if (import.meta.env.DEV) {
        logger.log(`[Performance] ${componentName} lifecycle: ${duration.toFixed(2)}ms`);
      }
    };
  }, [componentName]);

  return {
    startTime: startTime.current,
    getElapsedTime: () => {
      if (typeof performance === 'undefined') return 0;
      return performance.now() - startTime.current;
    },
  };
}
