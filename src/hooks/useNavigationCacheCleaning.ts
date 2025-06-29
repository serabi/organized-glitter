/**
 * React hook for automatic cache cleaning on navigation
 * 
 * This hook provides a Wouter-aware way to clean invalid cache entries
 * without modifying global methods. Use this instead of setupAutomaticCacheCleaning
 * when possible for better compatibility and safety.
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { cleanInvalidCacheEntries } from '@/utils/cacheValidation';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('NavigationCacheCleaning');

/**
 * Hook that automatically cleans invalid cache entries on navigation
 * 
 * Usage: Add this hook to your main App component or routing component
 * 
 * @example
 * ```tsx
 * function App() {
 *   useNavigationCacheCleaning();
 *   return <YourAppContent />;
 * }
 * ```
 */
export function useNavigationCacheCleaning() {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Clean cache after navigation, with a small delay to allow React Query
    // to invalidate queries as needed
    const timeoutId = setTimeout(() => {
      const removedCount = cleanInvalidCacheEntries(queryClient);
      if (removedCount > 0) {
        logger.debug('Cleaned cache entries after navigation', { 
          pathname: location,
          removedCount 
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [location, queryClient]);
}

/**
 * Hook that provides manual cache cleaning functionality
 * 
 * @returns Object with methods to manually clean cache
 */
export function useCacheCleaning() {
  const queryClient = useQueryClient();

  return {
    cleanInvalidEntries: () => cleanInvalidCacheEntries(queryClient),
    
    cleanAllEntries: () => {
      queryClient.clear();
      logger.info('Cleared all cache entries');
    },
    
    cleanByPattern: (pattern: string) => {
      queryClient.removeQueries({
        predicate: (query) => {
          const keyString = query.queryKey.join('.');
          return keyString.includes(pattern);
        }
      });
      logger.debug('Cleaned cache entries by pattern', { pattern });
    }
  };
}