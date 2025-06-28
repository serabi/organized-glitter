import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateSpinParams, createSpin } from '@/services/pocketbase/randomizerService';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useCreateSpin');

/**
 * Mutation hook for creating a new spin record
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