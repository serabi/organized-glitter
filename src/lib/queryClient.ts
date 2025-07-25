import { QueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/secureLogger';

// Define proper error interface
interface ErrorWithStatus {
  status: number;
  message?: string;
}

const logger = createLogger('QueryClient');

// DIAGNOSTIC: Global error interceptor to catch React Query internal errors
if (typeof window !== 'undefined') {
  const originalConsoleError = logger.error;
  logger.error = (...args: unknown[]) => {
    // Check for the specific queryKey error
    const errorMessage = args.join(' ');
    if (errorMessage.includes("Cannot read properties of undefined (reading 'queryKey')")) {
      logger.criticalError('DETECTED: React Query queryKey undefined error', {
        args,
        stack: new Error().stack,
        timestamp: new Date().toISOString(),
      });
    }
    originalConsoleError.apply(logger, args);
  };
}


export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Enhanced retry logic with PocketBase 404 handling
      retry: (failureCount, error) => {
        // DIAGNOSTIC: Log retry attempt details for debugging
        logger.debug('React Query retry attempt', {
          failureCount,
          errorType: error?.constructor?.name,
          errorMessage: error?.message,
          errorStatus:
            error && typeof error === 'object' && 'status' in error
              ? (error as ErrorWithStatus).status
              : undefined,
        });

        // Never retry more than 2 times
        if (failureCount >= 2) {
          logger.debug('Max retry attempts reached, stopping retries');
          return false;
        }

        // Handle PocketBase 404 errors gracefully (simplified without query object)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as ErrorWithStatus).status;

          if (status === 404) {
            logger.debug('404 error detected - not retrying');
            return false;
          }

          if (status >= 400 && status < 500) {
            logger.warn(`Client error ${status} - not retrying`);
            return false;
          }

          if (status >= 500) {
            logger.error(`Server error ${status} - allowing retry`);
            return true;
          }
        }

        // Handle network errors
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            logger.warn(`Network error - allowing retry: ${error.message}`);
            return true;
          }
        }

        // Default: allow retry for unknown errors
        logger.error(`Unknown error - allowing retry: ${error}`);
        return true;
      },
      // Retry delay that increases exponentially
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Only refetch on window focus if data is stale (reduces unnecessary API calls)
      refetchOnWindowFocus: true,
      // Only refetch on reconnect if data is stale
      refetchOnReconnect: true,
    },
    mutations: {
      // Enhanced mutation retry logic
      retry: (failureCount, error) => {
        // Never retry more than 1 time for mutations
        if (failureCount >= 1) return false;

        // Don't retry client errors (4xx) - they indicate bad requests
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as ErrorWithStatus).status;
          if (status >= 400 && status < 500) return false;
        }

        // Retry server errors and network issues
        return true;
      },
      retryDelay: 1000,
    },
  },
});

// Override cache settings for image-related queries
queryClient.setQueryDefaults(['optimized-image'], {
  staleTime: 30 * 60 * 1000, // 30 minutes for optimized images
  gcTime: 60 * 60 * 1000, // 1 hour retention for images
  refetchOnWindowFocus: false, // Images don't change frequently
  refetchOnReconnect: false, // Avoid unnecessary image refetches
});

queryClient.setQueryDefaults(['progressive-image'], {
  staleTime: 30 * 60 * 1000, // 30 minutes for progressive images
  gcTime: 60 * 60 * 1000, // 1 hour retention for images
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
