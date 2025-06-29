/**
 * Cache Validation Utilities
 * 
 * Provides utilities to validate React Query cache entries and prevent
 * queries with stale or invalid record IDs that could cause 404 errors.
 */

import { QueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('CacheValidation');

/**
 * Validates if a record ID appears to be valid PocketBase format
 */
export function isValidPocketBaseId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  
  // PocketBase IDs are 16 characters long and use Base62 alphanumeric characters
  const pocketBaseIdPattern = /^[a-zA-Z0-9]{16}$/;
  return pocketBaseIdPattern.test(id);
}

/**
 * Validates if a query key contains valid record IDs
 */
export function validateQueryKey(queryKey: unknown[]): boolean {
  for (const key of queryKey) {
    // Check any string that could be a PocketBase ID (16 chars or looks like an ID)
    if (typeof key === 'string') {
      // If it's exactly 16 characters, it should be a valid PocketBase ID
      if (key.length === 16 && !isValidPocketBaseId(key)) {
        logger.debug(`Invalid PocketBase ID found in query key: ${key}`);
        return false;
      }
      
      // Also check strings that contain dashes or other invalid characters that might be malformed IDs
      if (key.length > 10 && key.length < 25 && (key.includes('-') || key.includes(' ') || key.includes('!'))) {
        logger.debug(`Suspicious ID-like string found in query key: ${key}`);
        return false;
      }
    }
  }
  return true;
}

/**
 * Removes invalid cache entries that could cause 404 errors
 */
export function cleanInvalidCacheEntries(queryClient: QueryClient): number {
  let removedCount = 0;
  
  // Get all queries in cache
  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.getAll();
  
  for (const query of queries) {
    const queryKey = query.queryKey;
    
    // Skip if query is currently fetching (don't interrupt in-progress requests)
    if (query.state.fetchStatus === 'fetching') continue;
    
    // Check if query has error state that indicates stale data
    if (query.state.error) {
      const error = query.state.error;
      
      // Remove queries with 404 errors - they indicate stale cache
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        
        if (status === 404) {
          logger.debug(`Removing query with 404 error: ${queryKey.join('.')}`);
          queryClient.removeQueries({ queryKey });
          removedCount++;
          continue;
        }
      }
    }
    
    // Validate query key format
    if (!validateQueryKey(queryKey)) {
      logger.debug(`Removing query with invalid key format: ${queryKey.join('.')}`);
      queryClient.removeQueries({ queryKey });
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    logger.info(`Cleaned ${removedCount} invalid cache entries`);
  }
  
  return removedCount;
}

/**
 * Sets up automatic cache cleaning on navigation
 */
export function setupAutomaticCacheCleaning(queryClient: QueryClient): () => void {
  // Clean cache every time the user navigates
  const handleNavigation = () => {
    // Use setTimeout to run after React Query has had time to invalidate queries
    setTimeout(() => {
      cleanInvalidCacheEntries(queryClient);
    }, 100);
  };
  
  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', handleNavigation);
  
  // Also listen for pushstate/replacestate (programmatic navigation)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    handleNavigation();
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    handleNavigation();
  };
  
  // Return cleanup function
  return () => {
    window.removeEventListener('popstate', handleNavigation);
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  };
}

/**
 * Enhanced query invalidation that cleans stale entries
 */
export function safeInvalidateQueries(
  queryClient: QueryClient,
  filters: Parameters<QueryClient['invalidateQueries']>[0]
): Promise<void> {
  // First clean any invalid entries
  cleanInvalidCacheEntries(queryClient);
  
  // Then perform normal invalidation
  return queryClient.invalidateQueries(filters);
}