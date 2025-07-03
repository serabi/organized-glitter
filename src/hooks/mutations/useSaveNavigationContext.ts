/**
 * @fileoverview Auto-save mutation for navigation context preferences
 * 
 * This hook provides automatic saving of dashboard filter state to the database
 * for use as navigation context fallback on direct URL access.
 * 
 * @author serabi
 * @since 2025-07-02
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';
import { queryKeys } from '@/hooks/queries/queryKeys';
import type { NavigationContext } from '@/hooks/useNavigateToProject';

const logger = createLogger('useSaveNavigationContext');

/**
 * Parameters for saving navigation context
 */
export interface SaveNavigationContextParams {
  userId: string;
  navigationContext: NavigationContext;
}

/**
 * Saves navigation context to database (upsert operation)
 */
const saveNavigationContext = async ({ 
  userId, 
  navigationContext 
}: SaveNavigationContextParams): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!navigationContext) {
    throw new Error('Navigation context is required');
  }

  logger.info(`💾 Saving navigation context for user ${userId}`);
  const startTime = performance.now();

  try {
    // Try to find existing record
    let record;
    try {
      record = await pb.collection('user_dashboard_settings')
        .getFirstListItem(`user="${userId}"`);
    } catch (error) {
      // Record doesn't exist yet, we'll create it
      if (error?.status !== 404) {
        throw error;
      }
    }

    if (record) {
      // Update existing record
      await pb.collection('user_dashboard_settings').update(record.id, {
        navigation_context: navigationContext,
      });
      logger.info(`✅ Updated existing navigation context for user ${userId}`);
    } else {
      // Create new record
      await pb.collection('user_dashboard_settings').create({
        user: userId,
        navigation_context: navigationContext,
      });
      logger.info(`✅ Created new navigation context for user ${userId}`);
    }

    const endTime = performance.now();
    logger.info(`✅ Navigation context save completed in ${Math.round(endTime - startTime)}ms`);
  } catch (error) {
    logger.error('Error saving navigation context:', error);
    throw error;
  }
};

/**
 * React Query mutation hook for saving navigation context to database
 * 
 * Features:
 * - Upsert operation (create or update as needed)
 * - Automatic query invalidation to ensure fresh fallback data
 * - Error handling with logging
 * - Performance monitoring
 * 
 * Usage patterns:
 * - Call when dashboard filters change (debounced)
 * - Call before navigation to project detail
 * - Graceful error handling (save failures don't break navigation)
 * 
 * @returns Mutation object with mutate function and state
 * 
 * @example
 * ```tsx
 * const saveNavigation = useSaveNavigationContext();
 * 
 * // Auto-save when filters change
 * useEffect(() => {
 *   if (userId && hasFiltersChanged) {
 *     saveNavigation.mutate({ userId, navigationContext: currentContext });
 *   }
 * }, [userId, currentContext]);
 * 
 * // Handle errors gracefully
 * if (saveNavigation.error) {
 *   console.warn('Failed to save navigation preferences');
 * }
 * ```
 */
export const useSaveNavigationContext = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveNavigationContext,
    
    onSuccess: (_, variables) => {
      const { userId } = variables;
      
      // Invalidate the navigation fallback query to ensure fresh data
      // on next direct URL access
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.navigationContext(userId),
      });
      
      logger.info(`✅ Successfully saved and invalidated navigation context for user ${userId}`);
    },
    
    onError: (error, variables) => {
      const { userId } = variables;
      
      // Log error but don't throw - auto-save failures shouldn't break the UI
      logger.error(`❌ Failed to save navigation context for user ${userId}:`, error);
      logger.error('Save failure details:', {
        userId,
        errorMessage: error?.message,
        errorStatus: error?.status,
        timestamp: Date.now()
      });
      
      // Could add toast notification here if desired
      // toast.error('Failed to save dashboard preferences');
    },
    
    // Don't retry auto-save operations to avoid spamming the database
    retry: false,
    
    // Use a shorter timeout for auto-save operations
    meta: {
      timeout: 5000, // 5 seconds
    },
  });
};