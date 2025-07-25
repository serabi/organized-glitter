/**
 * Modern React hook for automatic cache cleaning on navigation
 *
 * This hook provides a type-safe, router-aware way to clean invalid cache entries
 * without modifying global methods. Uses modern React and TanStack Query patterns.
 *
 * @version 2.0.0 - Modernized with latest React Router and TanStack Query patterns
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient, type QueryClient, Query } from '@tanstack/react-query';
import { cleanInvalidCacheEntries } from '@/utils/cacheValidation';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('NavigationCacheCleaning');

/**
 * Configuration options for navigation cache cleaning
 */
interface NavigationCacheOptions {
  /** Delay in milliseconds before cleaning cache after navigation */
  cleanupDelay?: number;
  /** Whether to enable debug logging */
  enableLogging?: boolean;
  /** Custom cleanup function */
  customCleanup?: (queryClient: QueryClient) => Promise<number> | number;
}

/**
 * Hook that automatically cleans invalid cache entries on navigation
 *
 * Uses modern React patterns including useCallback for stability and
 * supports custom configuration options.
 *
 * @param options - Configuration options for cache cleaning behavior
 *
 * @example
 * ```tsx
 * function App() {
 *   useNavigationCacheCleaning({
 *     cleanupDelay: 150,
 *     enableLogging: true
 *   });
 *   return <YourAppContent />;
 * }
 * ```
 */
export function useNavigationCacheCleaning(options: NavigationCacheOptions = {}) {
  const { cleanupDelay = 100, enableLogging = import.meta.env.DEV, customCleanup } = options;

  const location = useLocation(); // Modern Wouter hook - no destructuring needed
  const queryClient = useQueryClient();
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoized cleanup function for performance
  const performCleanup = useCallback(async () => {
    try {
      const removedCount = customCleanup
        ? await customCleanup(queryClient)
        : cleanInvalidCacheEntries(queryClient);

      if (removedCount > 0 && enableLogging) {
        logger.debug('Cleaned cache entries after navigation', {
          pathname: location,
          removedCount,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error during cache cleanup:', error);
    }
  }, [queryClient, location, customCleanup, enableLogging]);

  useEffect(() => {
    // Clear any pending cleanup
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    // Schedule new cleanup with configured delay
    cleanupTimeoutRef.current = setTimeout(() => {
      performCleanup();
    }, cleanupDelay);

    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
    };
  }, [location, performCleanup, cleanupDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, []);
}

/**
 * Modern cache management hook with comprehensive cleaning strategies
 *
 * Provides type-safe, performance-optimized cache management utilities
 * following TanStack Query v5+ best practices.
 *
 * @returns Object with methods to manually clean cache using modern patterns
 */
export function useCacheCleaning() {
  const queryClient = useQueryClient();

  // Memoized cleanup functions for performance
  const cleanInvalidEntries = useCallback(() => {
    return cleanInvalidCacheEntries(queryClient);
  }, [queryClient]);

  const cleanAllEntries = useCallback(() => {
    queryClient.clear();
    logger.info('Cleared all cache entries');
  }, [queryClient]);

  const cleanByPattern = useCallback(
    (pattern: string) => {
      const removedQueries = queryClient.removeQueries({
        predicate: query => {
          const keyString = query.queryKey.join('.');
          return keyString.includes(pattern);
        },
      });
      logger.debug('Cleaned cache entries by pattern', { pattern, removedCount: removedQueries });
      return removedQueries;
    },
    [queryClient]
  );

  // Advanced cache management with type safety
  const cleanByQueryKey = useCallback(
    <TQueryKey extends readonly unknown[]>(queryKey: TQueryKey, exact = false) => {
      const removedQueries = queryClient.removeQueries({
        queryKey,
        exact,
      });
      logger.debug('Cleaned cache entries by query key', {
        queryKey: queryKey.join('.'),
        exact,
        removedCount: removedQueries,
      });
      return removedQueries;
    },
    [queryClient]
  );

  const cleanStaleQueries = useCallback(
    (staleTimeMs = 5 * 60 * 1000) => {
      const now = Date.now();
      const removedQueries = queryClient.removeQueries({
        predicate: query => {
          const staleTime = (query.options as any)?.staleTime ?? 0;
          const dataUpdatedAt = query.state.dataUpdatedAt;
          return now - dataUpdatedAt > Math.max(staleTime, staleTimeMs);
        },
      });
      logger.debug('Cleaned stale cache entries', {
        staleTimeMs,
        removedCount: removedQueries,
      });
      return removedQueries;
    },
    [queryClient]
  );

  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    const stats = {
      totalQueries: queries.length,
      errorQueries: queries.filter(q => q.state.error).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      invalidQueries: queries.filter(q => q.state.isInvalidated).length,
    };

    logger.debug('Cache statistics', stats);
    return stats;
  }, [queryClient]);

  return {
    // Basic cleanup
    cleanInvalidEntries,
    cleanAllEntries,
    cleanByPattern,

    // Advanced cleanup with type safety
    cleanByQueryKey,
    cleanStaleQueries,

    // Cache monitoring
    getCacheStats,

    // Utility for custom predicates
    cleanByPredicate: useCallback(
      (predicate: (query: Query) => boolean, description?: string) => {
        const removedQueries = queryClient.removeQueries({ predicate });
        if (description) {
          logger.debug(`Cleaned cache entries: ${description}`, { removedCount: removedQueries });
        }
        return removedQueries;
      },
      [queryClient]
    ),
  };
}

/**
 * Advanced hook for navigation-aware cache optimization
 *
 * Implements smart cache warming and background cleanup strategies
 * based on navigation patterns and query usage.
 */
export function useSmartCacheOptimization() {
  const _queryClient = useQueryClient();
  const location = useLocation();
  const { cleanStaleQueries, getCacheStats } = useCacheCleaning();
  const statsRef = useRef({ navigationCount: 0, lastOptimization: 0 });

  const optimizeCache = useCallback(async () => {
    const now = Date.now();
    const stats = statsRef.current;

    // Only optimize every 5 navigations or every 2 minutes
    if (stats.navigationCount % 5 !== 0 && now - stats.lastOptimization < 120000) {
      return;
    }

    try {
      // Clean stale queries older than 10 minutes
      const staleRemoved = cleanStaleQueries(10 * 60 * 1000);

      // Get current cache stats
      const cacheStats = getCacheStats();

      // Log optimization results
      logger.debug('Cache optimization completed', {
        staleRemoved,
        cacheStats,
        navigationCount: stats.navigationCount,
      });

      stats.lastOptimization = now;
    } catch (error) {
      logger.error('Cache optimization failed:', error);
    }
  }, [cleanStaleQueries, getCacheStats]);

  useEffect(() => {
    statsRef.current.navigationCount++;

    // Defer optimization to avoid blocking navigation
    const timeoutId = setTimeout(optimizeCache, 200);

    return () => clearTimeout(timeoutId);
  }, [location, optimizeCache]);

  return {
    optimizeCache,
    getNavigationStats: () => ({ ...statsRef.current }),
  };
}
