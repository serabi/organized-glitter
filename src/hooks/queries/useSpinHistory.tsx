import { useQuery } from '@tanstack/react-query';
import { SpinRecord, getSpinHistory } from '@/services/pocketbase/randomizerService';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useSpinHistory');

export interface UseSpinHistoryParams {
  userId: string | undefined;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch spin history for a user with pagination support
 */
export const useSpinHistory = ({ userId, limit = 8, enabled = true }: UseSpinHistoryParams) => {
  return useQuery({
    queryKey: ['randomizer', 'history', userId, { limit }],
    queryFn: async (): Promise<SpinRecord[]> => {
      if (!userId) {
        logger.debug('No userId provided, returning empty history');
        return [];
      }

      logger.debug('Fetching spin history', { userId, limit });
      const history = await getSpinHistory(userId, limit);
      
      logger.debug('Spin history fetched', { 
        userId, 
        recordCount: history.length 
      });
      
      return history;
    },
    enabled: enabled && !!userId,
    staleTime: 30 * 1000, // 30 seconds - relatively fresh since it's user activity
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      const errorMessage = error?.message || '';
      const isClientError = 
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');

      if (isClientError) {
        return false;
      }

      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};