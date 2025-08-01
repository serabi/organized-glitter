import { logger } from '@/utils/logger';

/**
 * Resource Loading Error Tracking
 * Monitors and reports on resource loading failures for diagnostics
 */

interface ResourceError {
  type: 'script' | 'image' | 'css' | 'other';
  url: string;
  timestamp: number;
  userAgent: string;
  referrer: string;
  status?: number;
}

// Track resource errors for analytics
const resourceErrors: ResourceError[] = [];
const MAX_TRACKED_ERRORS = 50;

/**
 * Get resource type from URL or element
 */
const getResourceType = (element: Element | string): ResourceError['type'] => {
  if (typeof element === 'string') {
    if (element.includes('.js')) return 'script';
    if (element.includes('.css')) return 'css';
    if (element.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i)) return 'image';
    return 'other';
  }

  if (element instanceof HTMLScriptElement) return 'script';
  if (element instanceof HTMLImageElement) return 'image';
  if (element instanceof HTMLLinkElement && element.rel === 'stylesheet') return 'css';

  return 'other';
};

/**
 * Track a resource loading error
 */
const trackResourceError = (url: string, type: ResourceError['type'], status?: number): void => {
  const error: ResourceError = {
    type,
    url,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    referrer: document.referrer,
    status,
  };

  resourceErrors.push(error);

  // Keep only the most recent errors
  if (resourceErrors.length > MAX_TRACKED_ERRORS) {
    resourceErrors.shift();
  }

  logger.warn(`🚨 Resource loading failed: ${type} - ${url}`, { status });

  // Special handling for PocketBase file errors
  if (url.includes('data.organizedglitter.app') && type === 'image') {
    logger.error('PocketBase image failed to load - this may indicate URL generation issues:', {
      url,
      urlParts: {
        hostname: new URL(url).hostname,
        pathname: new URL(url).pathname,
        search: new URL(url).search,
      },
    });
  }
};

/**
 * Initialize resource error tracking
 */
export const initializeResourceErrorTracking = (): void => {
  // Track script loading errors
  window.addEventListener(
    'error',
    event => {
      const target = event.target;

      if (target instanceof HTMLScriptElement) {
        trackResourceError(target.src, 'script');
      } else if (target instanceof HTMLImageElement) {
        trackResourceError(target.src, 'image');
      } else if (target instanceof HTMLLinkElement && target.rel === 'stylesheet') {
        trackResourceError(target.href, 'css');
      }
    },
    true
  ); // Use capture phase to catch all events

  // Track fetch errors (for dynamic resources)
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const response = await originalFetch.apply(this, args);

      // Track failed responses
      if (!response.ok) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        trackResourceError(url, getResourceType(url), response.status);
      }

      return response;
    } catch (error) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      trackResourceError(url, getResourceType(url));
      throw error;
    }
  };

  logger.log('🛠️ Resource error tracking initialized');
};

/**
 * Get current resource error statistics
 */
export const getResourceErrorStats = () => {
  const stats = {
    total: resourceErrors.length,
    byType: resourceErrors.reduce(
      (acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      },
      {} as Record<ResourceError['type'], number>
    ),
    recent: resourceErrors.filter(error => Date.now() - error.timestamp < 5 * 60 * 1000), // Last 5 minutes
    pocketbaseErrors: resourceErrors.filter(error =>
      error.url.includes('data.organizedglitter.app')
    ),
  };

  return stats;
};

/**
 * Export resource errors for debugging
 */
export const exportResourceErrors = (): ResourceError[] => {
  return [...resourceErrors];
};

/**
 * Clear tracked resource errors
 */
export const clearResourceErrors = (): void => {
  resourceErrors.length = 0;
};

// Make functions available for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (
    window as Window & { __resourceErrorTracking?: Record<string, unknown> }
  ).__resourceErrorTracking = {
    getStats: getResourceErrorStats,
    exportErrors: exportResourceErrors,
    clearErrors: clearResourceErrors,
  };
}
