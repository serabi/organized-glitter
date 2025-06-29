/**
 * @fileoverview React Query mutation hook for creating randomizer spin records
 *
 * Provides a React Query mutation for recording the results of randomizer wheel spins.
 * Handles automatic cache invalidation, user feedback through toasts, and proper
 * error handling with retry logic.
 *
 * @author Generated with Claude Code
 * @version 1.0.0
 * @since 2024-06-28
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateSpinParams, createSpin } from '@/services/pocketbase/randomizerService';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useCreateSpin');

/**
 * React Query mutation hook for creating a new randomizer spin record
 *
 * Provides a mutation for recording wheel spin results with automatic cache management
 * and user feedback. Includes retry logic, toast notifications, and proper error handling.
 *
 * @returns {UseMutationResult} React Query mutation object with the following properties:
 *   - mutate: Function to trigger the mutation
 *   - mutateAsync: Async version that returns a promise
 *   - isPending: Boolean indicating if mutation is in progress
 *   - error: Error object if mutation failed
 *   - data: The created spin record if successful
 *
 * @example
 * ```typescript
 * function RandomizerComponent() {
 *   const createSpinMutation = useCreateSpin();
 *
 *   const handleSpin = async (selectedProject: Project) => {
 *     try {
 *       await createSpinMutation.mutateAsync({
 *         user: user.id,
 *         project: selectedProject.id,
 *         project_title: selectedProject.title,
 *         selected_projects: selectedProjectIds
 *       });
 *       // Success toast shown automatically
 *     } catch (error) {
 *       // Error toast shown automatically
 *     }
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleSpin}
 *       disabled={createSpinMutation.isPending}
 *     >
 *       {createSpinMutation.isPending ? 'Recording...' : 'Spin Wheel'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @features
 * - Automatic cache invalidation for spin history queries
 * - Toast notifications for success and error states
 * - Retry logic (1 retry with 1 second delay)
 * - Comprehensive error logging
 * - Type-safe mutation parameters
 *
 * @sideeffects
 * - Invalidates all randomizer history queries for the user
 * - Shows success/error toast notifications
 * - Logs mutation events for debugging
 */
export const useCreateSpin = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateSpinParams) => {
      logger.debug('Creating spin record', {
        userId: params.user,
        projectId: params.project,
        selectedCount: params.selected_projects.length,
      });

      return await createSpin(params);
    },
    onSuccess: (data, variables) => {
      logger.info('Spin record created successfully', {
        spinId: data.id,
        userId: variables.user,
      });

      // Invalidate and refetch spin history to include the new record
      queryClient.invalidateQueries({
        queryKey: ['randomizer', 'history', variables.user],
      });

      toast({
        title: 'Spin recorded!',
        description: `Selected: ${variables.project_title}`,
      });
    },
    onError: (error, variables) => {
      logger.error('Failed to create spin record', {
        error,
        userId: variables.user,
        projectId: variables.project,
      });

      toast({
        title: 'Failed to record spin',
        description: 'Your spin result was not saved to history.',
        variant: 'destructive',
      });
    },
    retry: 1, // Retry once on failure
    retryDelay: 1000, // 1 second delay before retry
  });
};
