import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, CompaniesResponse } from '@/types/pocketbase.types';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { ClientResponseError } from 'pocketbase';

async function fetchCompanies(userId: string): Promise<CompaniesResponse[]> {
  const result = await pb.collection(Collections.Companies).getList(1, 200, {
    filter: `user = "${userId}"`,
    sort: 'name',
    requestKey: `companies-${userId}`,
  });

  return result.items;
}

export function useCompanies() {
  const { user } = useAuth();

  return useQuery<CompaniesResponse[], Error>({
    queryKey: queryKeys.companies.list(user?.id || ''),
    queryFn: () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return fetchCompanies(user.id);
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - companies don't change often
    retry: (failureCount, error: Error) => {
      // Don't retry on client errors (4xx)
      if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
