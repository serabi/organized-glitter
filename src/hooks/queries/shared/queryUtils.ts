/**
 * Shared utilities for React Query hooks to reduce duplication and improve consistency
 * @author @serabi
 * @created 2025-07-16
 */

import { ClientResponseError } from 'pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('QueryUtils');

/**
 * Standard retry configuration for all query hooks
 * @author @serabi
 * @param failureCount - Number of failures so far
 * @param error - Error that occurred
 * @returns Whether to retry the query
 */
export const standardRetryConfig = (failureCount: number, error: Error): boolean => {
  // Don't retry on client errors (4xx)
  if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500) {
    logger.debug('Not retrying client error', { status: error.status, message: error.message });
    return false;
  }

  // Also check error message for 4xx status codes (for non-ClientResponseError cases)
  const errorMessage = error?.message || '';
  const isClientError =
    errorMessage.includes('400') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403') ||
    errorMessage.includes('404');

  if (isClientError) {
    logger.debug('Not retrying client error (from message)', { message: errorMessage });
    return false;
  }

  // Retry up to 2 times for server errors (matching queryOptionsFactory pattern)
  const shouldRetry = failureCount < 2;
  logger.debug('Retry decision', { failureCount, shouldRetry, errorMessage });
  return shouldRetry;
};

/**
 * Standard exponential backoff retry delay configuration
 * @author @serabi
 * @param attemptIndex - Current retry attempt index (0-based)
 * @returns Delay in milliseconds with exponential backoff, capped at 30 seconds
 */
export const standardRetryDelay = (attemptIndex: number): number => {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
};

/**
 * Standard query configuration for stable, user-scoped queries
 * @author @serabi
 * @returns Query configuration object
 */
export const getStandardQueryConfig = () => ({
  staleTime: 10 * 60 * 1000, // 10 minutes - stable data
  gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  refetchOnWindowFocus: false, // Reduce unnecessary refetches
  refetchOnReconnect: false, // Reduce blinking on reconnect
  retry: standardRetryConfig,
  retryDelay: standardRetryDelay,
});

/**
 * Standard query configuration for frequently changing queries
 * @author @serabi
 * @returns Query configuration object
 */
export const getFrequentQueryConfig = () => ({
  staleTime: 5 * 60 * 1000, // 5 minutes - more frequent updates
  gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: standardRetryConfig,
  retryDelay: standardRetryDelay,
});

/**
 * Standard query configuration for paginated queries
 * @author @serabi
 * @returns Query configuration object
 */
export const getPaginatedQueryConfig = () => ({
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: standardRetryConfig,
  retryDelay: standardRetryDelay,
});

/**
 * Hook for getting user authentication state and validation
 * @author @serabi
 * @returns Object with user data and validation utilities
 */
export const useUserAuth = () => {
  const { user } = useAuth();

  return {
    user,
    userId: user?.id,
    isAuthenticated: !!user?.id,
    requireAuth: (): string => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return user.id;
    },
  };
};

/**
 * Creates a request key for PocketBase request deduplication
 * @author @serabi
 * @param collection - Collection name
 * @param userId - User ID
 * @param suffix - Additional suffix for uniqueness
 * @returns Request key string
 */
export const createRequestKey = (collection: string, userId: string, suffix?: string): string => {
  const parts = [collection, userId];
  if (suffix) {
    parts.push(suffix);
  }
  return parts.join('-');
};

/**
 * Standard error logging utility for query hooks
 * @author @serabi
 * @param hookName - Name of the hook for logging context
 * @param operation - Operation being performed
 * @param error - Error that occurred
 * @param context - Additional context for logging
 */
export const logQueryError = (
  hookName: string,
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): void => {
  const queryLogger = createLogger(hookName);
  queryLogger.error(`${operation} failed:`, error, context);
};

/**
 * Standard success logging utility for query hooks
 * @author @serabi
 * @param hookName - Name of the hook for logging context
 * @param operation - Operation being performed
 * @param result - Result data
 * @param context - Additional context for logging
 */
export const logQuerySuccess = (
  hookName: string,
  operation: string,
  result: unknown,
  context?: Record<string, unknown>
): void => {
  const queryLogger = createLogger(hookName);
  queryLogger.debug(`${operation} successful:`, { result, ...context });
};

/**
 * Performance timing utility for query operations
 * @author @serabi
 * @param hookName - Name of the hook for logging context
 * @param operation - Operation being performed
 * @returns Timer object with stop function
 */
export const createQueryTimer = (hookName: string, operation: string) => {
  const startTime = performance.now();
  const queryLogger = createLogger(hookName);

  return {
    stop: (context?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      queryLogger.debug(`${operation} completed in ${Math.round(duration)}ms`, context);
      return duration;
    },
  };
};

/**
 * Moderate caching configuration for dashboard data and status counts
 * Provides balanced performance and accuracy for real-time updates
 * @author @serabi
 * @returns Query configuration with 30-second stale time for accurate data
 */
export const getStatusCountQueryConfig = () => ({
  staleTime: 2 * 60 * 1000, // 2 minutes - balanced caching for accuracy
  gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  refetchOnWindowFocus: false, // Never refetch on focus - rely on invalidation
  refetchOnReconnect: false, // Never refetch on reconnect - rely on invalidation
  retry: standardRetryConfig,
  retryDelay: standardRetryDelay,
});
