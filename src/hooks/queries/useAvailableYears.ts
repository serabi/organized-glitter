import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAvailableYears');

async function fetchAvailableYears(userId: string): Promise<number[]> {
  logger.debug(`Fetching available years for user ${userId}`);
  const records = await pb.collection(Collections.Projects).getFullList({
    filter: `user = "${userId}" && date_completed != ""`,
    fields: 'date_completed',
    requestKey: `available-years-${userId}`,
  });

  const years = new Set<number>();
  for (const record of records) {
    if (record.date_completed) {
      try {
        const year = new Date(record.date_completed).getFullYear();
        if (!isNaN(year)) {
          years.add(year);
        }
      } catch (_e) {
        logger.error('Invalid date format for record:', record);
      }
    }
  }

  const sortedYears = Array.from(years).sort((a, b) => b - a);
  logger.debug(`Available years found: ${sortedYears.join(', ')}`);
  return sortedYears;
}

export const useAvailableYears = () => {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: queryKeys.stats.availableYears(userId || 'anonymous'),
    queryFn: () => fetchAvailableYears(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
