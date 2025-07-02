/**
 * @fileoverview Router-safe React Query hook for navigation context fallback
 * 
 * This hook provides database-backed navigation context as a fallback when
 * React Router state is not available (e.g., direct URL access, bookmarks).
 * 
 * @author serabi
 * @since 2025-07-02
 */

import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';
import { queryKeys } from './queryKeys';
import type { NavigationContext } from '@/hooks/useNavigateToProject';

const logger = createLogger('useNavigationFallback');

/**
 * Parameters for the useNavigationFallback hook
 */
export interface UseNavigationFallbackParams {
  userId: string | undefined;
}

/**
 * Result type for the navigation fallback hook
 */
export interface NavigationFallbackResult {
  navigationContext: NavigationContext | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

/**
 * Fetches saved navigation context from database
 */
const fetchNavigationFallback = async (userId: string): Promise<NavigationContext | null> => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  logger.debug(`Fetching navigation fallback for user ${userId}`);
  const startTime = performance.now();

  try {
    // Query the user_dashboard_settings collection
    const record = await pb.collection('user_dashboard_settings')
      .getFirstListItem(`user="${userId}"`);
    
    const endTime = performance.now();
    logger.debug(`Navigation fallback query completed in ${Math.round(endTime - startTime)}ms`);

    // Return the navigation context or null if not set
    return record.navigation_context || null;
  } catch (error) {
    // If no record exists, that's okay - return null
    if (error?.status === 404) {
      logger.debug(`No navigation context found for user ${userId}`);
      return null;
    }
    
    // Log other errors but don't throw - fallback should be resilient
    logger.error('Error fetching navigation fallback:', error);
    throw error;
  }
};

/**
 * React Query hook for fetching navigation context from database as fallback
 * 
 * Features:
 * - Router-safe (no dependencies on location/routing state)
 * - Long stale time (30 minutes) - user preferences don't change often
 * - Conservative refetch settings to avoid conflicts
 * - Resilient error handling (404 = no preferences saved yet)
 * 
 * @param params - Hook parameters
 * @returns Navigation context fallback data and query state
 * 
 * @example
 * ```tsx
 * const { navigationContext, isLoading } = useNavigationFallback({ userId: user?.id });
 * 
 * if (isLoading) return <Spinner />;
 * 
 * // Use navigationContext as fallback when router state is missing
 * const finalContext = location.state?.navigationContext || navigationContext;
 * ```
 */
export const useNavigationFallback = ({ userId }: UseNavigationFallbackParams): NavigationFallbackResult => {
  const query = useQuery({
    queryKey: queryKeys.projects.navigationContext(userId || ''),
    queryFn: () => fetchNavigationFallback(userId!),
    enabled: !!userId,
    
    // Long stale time - user preferences don't change frequently
    // This prevents unnecessary refetches while still allowing fresh data
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour garbage collection
    
    // Conservative refetch settings to avoid router conflicts
    refetchOnWindowFocus: false, // Preferences don't change externally
    refetchOnReconnect: false,   // Preferences don't change externally
    refetchInterval: false,      // No polling needed
    
    // Simple retry strategy
    retry: (failureCount, error) => {
      // Don't retry 404s (no preferences saved yet)
      if (error?.status === 404) {
        return false;
      }
      
      // Don't retry client errors
      const errorMessage = error?.message || '';
      const isClientError = 
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403');

      if (isClientError) {
        return false;
      }

      // Retry up to 1 time for other errors (keep it simple)
      return failureCount < 1;
    },
    retryDelay: 1000, // Fixed 1 second delay
    
    // Graceful fallback for errors
    throwOnError: false, // Don't throw - fallback should be resilient
    
    // Use select to ensure consistent null fallback
    select: (data) => data || null,
  });

  return {
    navigationContext: query.data || null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
};