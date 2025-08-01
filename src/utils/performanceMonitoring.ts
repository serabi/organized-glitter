import { logger } from '@/utils/logger';

/**
 * Performance monitoring utilities for development environment
 */

/**
 * Initialize performance monitoring tools (development only)
 * Monitors long tasks and memory usage
 */
export const initializePerformanceMonitoring = (): void => {
  if (!import.meta.env.DEV) {
    return;
  }

  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 50) {
            logger.warn(`Long task detected: ${entry.duration}ms`);
          }
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      // PerformanceObserver might not be supported in some browsers
      logger.debug('PerformanceObserver not supported or failed to initialize');
    }
  }

  // Log memory usage
  logMemoryUsage();
};

/**
 * Log current memory usage information (development only)
 */
const logMemoryUsage = (): void => {
  if (!('memory' in performance)) {
    return;
  }

  const memoryInfo = (
    performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    }
  ).memory;

  if (!memoryInfo) {
    return;
  }

  logger.debug('Memory usage:', {
    used: Math.round(memoryInfo.usedJSHeapSize / 1048576) + ' MB',
    total: Math.round(memoryInfo.totalJSHeapSize / 1048576) + ' MB',
    limit: Math.round(memoryInfo.jsHeapSizeLimit / 1048576) + ' MB',
  });
};
