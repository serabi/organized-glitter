import { QueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('QueryClient');

/**
 * Global error handler for React Query that gracefully handles PocketBase 404 errors
 * and prevents them from surfacing to users during navigation and cache invalidation.
 */
function handleQueryError(error: unknown, query: any): boolean {
  // Handle PocketBase 404 errors gracefully
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    
    if (status === 404) {
      // Log 404s for debugging but don't surface to users
      logger.debug(`Query ${query.queryKey?.join('.')} returned 404 - likely stale cache`);
      
      // Don't retry 404s - they indicate the resource no longer exists
      return false;
    }
    
    // Handle other client errors (4xx) - usually don't retry
    if (status >= 400 && status < 500) {
      logger.warn(`Query ${query.queryKey?.join('.')} returned client error: ${status}`);
      return false;
    }
    
    // Handle server errors (5xx) - retry with backoff
    if (status >= 500) {
      logger.error(`Query ${query.queryKey?.join('.')} returned server error: ${status}`);
      return true; // Allow retries for server errors
    }
  }
  
  // Handle network errors and other failures
  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      logger.warn(`Network error for query ${query.queryKey?.join('.')}: ${error.message}`);
      return true; // Retry network errors
    }
  }
  
  // Default: allow retry for unknown errors
  logger.error(`Unknown error for query ${query.queryKey?.join('.')}: ${error}`);
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Enhanced retry logic with PocketBase 404 handling
      retry: (failureCount, error, query) => {
        // Never retry more than 2 times
        if (failureCount >= 2) return false;
        
        // Use custom error handler to determine if we should retry
        return handleQueryError(error, query);
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
          const status = (error as { status: number }).status;
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
