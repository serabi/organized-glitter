/**
 * React Query hook for fetching companies with server-side pagination
 * @author @serabi
 * @created 2025-01-08
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, CompaniesResponse } from '@/types/pocketbase.types';
import { queryKeys, CompanyQueryParams } from './queryKeys';
import { ClientResponseError } from 'pocketbase';
import { createLogger } from '@/utils/secureLogger';
import { useAuth } from '@/hooks/useAuth';

const logger = createLogger('useCompanies');

export interface UseCompaniesParams {
  userId: string | undefined;
  currentPage: number;
  pageSize: number;
}

export interface CompaniesResult {
  companies: CompaniesResponse[];
  totalItems: number;
  totalPages: number;
}

/**
 * Fetches companies from PocketBase with pagination support
 * @author @serabi
 * @param params - Query parameters including userId, currentPage, and pageSize
 * @returns Promise resolving to paginated companies data
 */
async function fetchCompanies(
  params: CompanyQueryParams & { userId: string }
): Promise<CompaniesResult> {
  const { userId, currentPage, pageSize } = params;

  if (!userId) {
    throw new Error('User ID is required');
  }

  logger.debug(`Fetching companies for user ${userId} - page ${currentPage}, size ${pageSize}`);

  const startTime = performance.now();
  const requestKey = `companies-${userId}-page${currentPage}-size${pageSize}`;

  const resultList = await pb.collection(Collections.Companies).getList(currentPage, pageSize, {
    filter: `user = "${userId}"`,
    sort: 'name',
    requestKey,
  });

  const endTime = performance.now();
  logger.debug(
    `Companies query completed in ${Math.round(endTime - startTime)}ms - ${resultList.items.length} items`
  );

  logger.info(`Companies fetched: ${resultList.items.length} of ${resultList.totalItems}`);

  return {
    companies: resultList.items,
    totalItems: resultList.totalItems,
    totalPages: resultList.totalPages,
  };
}

/**
 * Hook for fetching companies with server-side pagination
 * @author @serabi
 * @param params - Parameters including userId, currentPage, and pageSize
 * @returns React Query result with paginated companies data
 */
export const useCompanies = (params: UseCompaniesParams) => {
  const { userId, currentPage, pageSize } = params;
  // Memoize query parameters to prevent unnecessary re-computations
  const queryParams: CompanyQueryParams = useMemo(
    () => ({
      currentPage,
      pageSize,
    }),
    [currentPage, pageSize]
  );

  // Debug logging to trace query execution
  logger.debug('🔄 useCompanies called', {
    userId,
    queryKey: queryKeys.companies.list(userId || '', queryParams),
    enabled: !!userId,
  });

  return useQuery({
    queryKey: queryKeys.companies.list(userId || '', queryParams),
    queryFn: () => fetchCompanies({ userId: userId || '', ...queryParams }),
    enabled: !!userId, // Only run when userId is available
    staleTime: 10 * 60 * 1000, // 10 minutes - companies don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    // Prevent blinking by keeping previous data while fetching new data
    placeholderData: previousData => previousData,
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    refetchOnReconnect: false, // Reduce blinking on reconnect
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
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

/**
 * Hook for fetching all companies data (non-paginated) - for MetadataContext
 * @author @serabi
 * @returns React Query result with all companies data
 */
export const useAllCompanies = () => {
  const { user } = useAuth();

  logger.debug('useAllCompanies called', { userId: user?.id });

  return useQuery({
    queryKey: queryKeys.companies.allForUser(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      logger.debug('Executing all companies query', { userId: user.id });

      try {
        const result = await pb.collection(Collections.Companies).getFullList({
          filter: `user = "${user.id}"`,
          sort: 'name',
          requestKey: `companies-all-${user.id}`, // Enable request deduplication with user context
        });

        logger.debug('All companies query successful:', {
          userId: user.id,
          itemsCount: result.length,
        });

        return result;
      } catch (error) {
        logger.error('All companies query failed:', error);
        throw error;
      }
    },
    enabled: !!user?.id, // Only run when user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error instanceof ClientResponseError && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    refetchOnReconnect: false, // Reduce blinking on reconnect
    // Add specific notification optimization
    notifyOnChangeProps: ['data', 'error', 'isLoading', 'isError'] as const,
  });
};
