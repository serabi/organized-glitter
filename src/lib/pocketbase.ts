import PocketBase from 'pocketbase';
import { createLogger } from '@/utils/logger';
import type { TypedPocketBase } from '@/types/pocketbase.types';

const pbLogger = createLogger('PocketBase');

// Get PocketBase URL from environment variables
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://data.organizedglitter.app/';

// Validate environment variables
if (!POCKETBASE_URL) {
  pbLogger.error('❌ CRITICAL: Missing PocketBase URL configuration');
  throw new Error('PocketBase URL not configured');
}

pbLogger.debug('PocketBase Environment:', {
  url: POCKETBASE_URL,
  isLocal: POCKETBASE_URL.includes('localhost') || POCKETBASE_URL.includes('127.0.0.1'),
  nodeEnv: import.meta.env.NODE_ENV,
  mode: import.meta.env.MODE,
  hasUrl: !!POCKETBASE_URL,
});

// Create and configure PocketBase client
export const pb = new PocketBase(POCKETBASE_URL) as TypedPocketBase;

// Configure auto-cancellation to be less aggressive in development
if (import.meta.env.DEV) {
  // In development, disable auto-cancellation to reduce debugging noise
  pb.autoCancellation(false);
  pbLogger.debug('Auto-cancellation disabled for development');

  // Make PocketBase client available for debugging
  if (typeof window !== 'undefined') {
    (window as Window & { __pb?: TypedPocketBase; pb?: TypedPocketBase }).__pb = pb;
    (window as Window & { __pb?: TypedPocketBase; pb?: TypedPocketBase }).pb = pb;
    pbLogger.debug('🛠️  PocketBase client available as window.pb for debugging');
  }
}

// Rate limiting state - optimized for authenticated users
let lastRequestTime = 0;
let consecutiveRateLimits = 0;
const baseInterval = 10; // Reduced from 50ms - much more responsive for authenticated users

// Request deduplication cache
const pendingRequests = new Map<string, Promise<void>>();

// Dynamic rate limiting that increases after 429s
const getMinRequestInterval = () => {
  // For authenticated users, use minimal rate limiting unless we hit 429s
  const isAuthenticated = pb.authStore.isValid;

  if (consecutiveRateLimits === 0) {
    // No recent rate limits - use minimal delay for authenticated users
    return isAuthenticated ? 0 : baseInterval;
  }

  // Exponential backoff after 429s: 20ms, 40ms, 80ms, 160ms, 320ms, max 1s for auth users
  // For non-auth: 100ms, 200ms, 400ms, 800ms, 1.6s, max 5s
  const multiplier = isAuthenticated ? 2 : 10;
  const maxDelay = isAuthenticated ? 1000 : 5000;
  return Math.min(baseInterval * multiplier * Math.pow(2, consecutiveRateLimits - 1), maxDelay);
};

// Type definitions for request tracking
interface RequestTiming {
  startTime: number;
  method: string;
  url: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Track request performance
const requestTimings = new Map<string, RequestTiming>();

// Map to store request ID for each request URL (for timing cleanup)
// Using URL as key since we can't modify the response object
const urlToRequestIdMap = new Map<string, string>();

// Generate unique ID with fallback for older browsers
const generateUniqueId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

pb.beforeSend = function (url: string, options: RequestInit & Record<string, unknown>) {
  // Store request start time with method and URL for reliable cleanup
  const uniqueId = generateUniqueId();
  const method = (options.method as HttpMethod) || 'GET';
  const requestId = `${method}:${url}:${uniqueId}`;

  requestTimings.set(requestId, {
    startTime: performance.now(),
    method: method,
    url: url,
  });

  // Store the unique ID by URL for retrieval in afterSend
  // Note: This may cause issues with concurrent identical requests, but it's the best we can do
  // without being able to modify the request/response objects
  const urlKey = `${method}:${url}`;
  urlToRequestIdMap.set(urlKey, uniqueId);

  // Create request key for deduplication (only for GET requests)
  const requestMethod = options.method || 'GET';
  if (requestMethod === 'GET') {
    // For GET requests, the URL already contains query parameters
    // Using just the URL ensures proper deduplication for different queries
    const requestKey = `${requestMethod}:${url}`;
    const existingRequest = pendingRequests.get(requestKey);

    if (existingRequest) {
      pbLogger.debug(`Request deduplication: using existing request for ${requestKey}`);
      return existingRequest.then(() => ({ url, options }));
    }

    // Store the promise for this request
    const requestPromise = new Promise<void>(resolve => {
      // Clean up after a reasonable time
      setTimeout(() => {
        pendingRequests.delete(requestKey);
        resolve();
      }, 5000); // 5 second cleanup
    });

    pendingRequests.set(requestKey, requestPromise);
  }

  // Add rate limiting with dynamic intervals
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minInterval = getMinRequestInterval();

  if (timeSinceLastRequest < minInterval) {
    // Wait for the remaining time
    const delay = minInterval - timeSinceLastRequest;
    const isAuth = pb.authStore.isValid;
    pbLogger.debug(
      `Rate limiting: waiting ${delay}ms (auth: ${isAuth}, consecutive 429s: ${consecutiveRateLimits})`
    );
    if (import.meta.env.DEV && delay > 5) {
      pbLogger.debug(`Rate limiting delay: ${delay}ms for ${url} (auth: ${isAuth})`);
    }
    return new Promise(resolve => {
      setTimeout(() => {
        lastRequestTime = Date.now();
        resolve({ url, options });
      }, delay);
    });
  }

  lastRequestTime = now;
  return { url, options };
};

pb.afterSend = function (response: Response, data: unknown): unknown {
  // Note: PocketBase SDK only provides (response, data) - no third parameter
  const now = performance.now();
  let cleaned = false;

  // Clear request deduplication cache for failed requests
  if (response.status >= 400) {
    // Find and remove failed requests from pending cache
    for (const [requestKey] of pendingRequests.entries()) {
      if (requestKey.includes(response.url)) {
        pendingRequests.delete(requestKey);
        pbLogger.debug(`Cleared failed request from cache: ${requestKey}`);
      }
    }
  }

  // Try to find the request by extracting method from the stored timing entries
  // We'll need to infer the method by matching URL patterns
  const defaultMethod: HttpMethod = 'GET';

  // Try to extract method from response URL pattern or use URL mapping
  const urlKey = `${defaultMethod}:${response.url}`;
  const uniqueId = urlToRequestIdMap.get(urlKey);

  if (uniqueId) {
    const requestId = `${defaultMethod}:${response.url}:${uniqueId}`;
    const timing = requestTimings.get(requestId);

    if (timing) {
      const duration = now - timing.startTime;
      if (import.meta.env.DEV && duration > 1000) {
        pbLogger.debug(`Slow request detected: ${requestId} took ${duration.toFixed(2)}ms`);
      }
      // Clean up to prevent memory leak
      requestTimings.delete(requestId);
      urlToRequestIdMap.delete(urlKey);
      cleaned = true;
    }
  }

  // Fallback: Try all possible methods if initial lookup failed
  if (!cleaned) {
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    for (const possibleMethod of methods) {
      const urlKey = `${possibleMethod}:${response.url}`;
      const uniqueId = urlToRequestIdMap.get(urlKey);

      if (uniqueId) {
        const requestId = `${possibleMethod}:${response.url}:${uniqueId}`;
        const timing = requestTimings.get(requestId);

        if (timing) {
          const duration = now - timing.startTime;
          if (import.meta.env.DEV && duration > 1000) {
            pbLogger.debug(`Slow request detected: ${requestId} took ${duration.toFixed(2)}ms`);
          }
          // Clean up to prevent memory leak
          requestTimings.delete(requestId);
          urlToRequestIdMap.delete(urlKey);
          cleaned = true;
          break;
        }
      }
    }
  }

  // Secondary fallback: Match by URL pattern in requestTimings
  if (!cleaned) {
    for (const [requestId, timing] of requestTimings.entries()) {
      if (timing.url === response.url) {
        const duration = now - timing.startTime;
        if (import.meta.env.DEV && duration > 1000) {
          pbLogger.debug(`Slow request detected: ${requestId} took ${duration.toFixed(2)}ms`);
        }
        // Clean up to prevent memory leak
        requestTimings.delete(requestId);
        // Also try to clean up urlToRequestIdMap
        const parts = requestId.split(':');
        if (parts.length >= 3) {
          const method = parts[0];
          const urlKey = `${method}:${response.url}`;
          urlToRequestIdMap.delete(urlKey);
        }
        cleaned = true;
        break;
      }
    }
  }

  // Final cleanup: Remove old entries to prevent unbounded growth
  const MAX_TIMING_ENTRIES = 100;
  const MAX_URL_MAP_ENTRIES = 100;
  const CLEANUP_AGE_MS = 30000; // 30 seconds

  if (requestTimings.size > MAX_TIMING_ENTRIES || urlToRequestIdMap.size > MAX_URL_MAP_ENTRIES) {
    const cutoffTime = now - CLEANUP_AGE_MS;

    // Clean up old request timings
    for (const [requestId, timing] of requestTimings.entries()) {
      if (timing.startTime < cutoffTime) {
        requestTimings.delete(requestId);
      }
    }

    // Clean up orphaned URL mappings
    if (urlToRequestIdMap.size > MAX_URL_MAP_ENTRIES) {
      // Since we can't easily track age of URL mappings, clear older half when too large
      const entriesToRemove = Math.floor(urlToRequestIdMap.size / 2);
      let removed = 0;
      for (const [key] of urlToRequestIdMap) {
        urlToRequestIdMap.delete(key);
        if (++removed >= entriesToRemove) break;
      }
    }
  }

  // Handle 429 rate limit responses with exponential backoff
  if (response.status === 429) {
    consecutiveRateLimits++;
    pbLogger.warn(`Rate limit hit (${consecutiveRateLimits} consecutive):`, {
      status: response.status,
      nextInterval: getMinRequestInterval(),
    });
  } else if (response.status >= 200 && response.status < 300) {
    // Reset counter on successful requests
    if (consecutiveRateLimits > 0) {
      pbLogger.info('Rate limit cleared, resetting interval');
      consecutiveRateLimits = 0;
    }
  } else if (response.status >= 400) {
    // Log client/server errors for debugging
    pbLogger.warn(`Request failed with status ${response.status}:`, {
      url: response.url,
      status: response.status,
    });
  }
  return data;
};

// Configure auth store options for better security
pb.authStore.onChange((_token, record) => {
  if (import.meta.env.DEV) {
    pbLogger.debug('Auth state changed:', {
      isValid: pb.authStore.isValid,
      hasRecord: !!record,
      userId: record?.id || null,
    });
  }
});

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return pb.authStore.isValid;
};

// Helper function to get current user
export const getCurrentUser = () => {
  return pb.authStore.record;
};

// Helper function to get current user ID
export const getCurrentUserId = (): string | null => {
  return pb.authStore.record?.id || null;
};

// Helper function to logout
export const logout = (): void => {
  pb.authStore.clear();
  pbLogger.debug('User logged out');
};

// Helper function to get file URL with validation
export const getFileUrl = (
  record: { id: string; [key: string]: unknown },
  filename: string,
  thumb?: string
): string => {
  if (!record || !filename) return '';

  // Handle case where filename is already a relative path starting with '/'
  if (typeof filename === 'string' && filename.startsWith('/') && !filename.startsWith('//')) {
    pbLogger.warn('Detected relative path filename, this may cause 404 errors:', filename);
    // Extract just the filename from the path
    const actualFilename = filename.split('/').pop();
    if (!actualFilename) return '';
    filename = actualFilename;
  }

  const url = pb.files.getURL(record, filename, thumb ? { thumb } : undefined);

  // Validate the generated URL is absolute
  if (url && !url.startsWith('http') && !url.startsWith('//')) {
    pbLogger.error('Generated non-absolute URL for file:', { record: record.id, filename, url });
    return '';
  }

  return url;
};

// Export PocketBase client configuration
export const getPocketBaseConfig = () => ({
  url: POCKETBASE_URL,
  isLocal: POCKETBASE_URL.includes('localhost') || POCKETBASE_URL.includes('127.0.0.1'),
});

// Example usage:
// import { pb, isAuthenticated, getCurrentUser } from '@/lib/pocketbase';
