/**
 * React Query hook for fetching companies with server-side pagination
 * @author @serabi
 * @created 2025-07-08
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CompaniesResponse } from '@/types/pocketbase.types';
import { queryKeys, CompanyQueryParams } from './queryKeys';
import { createLogger } from '@/utils/logger';
import { companiesOptions, allCompaniesOptions } from './shared/queryOptionsFactory';

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
 * Hook for fetching companies with server-side pagination (modernized with queryOptions)
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

  // Use TanStack Query v5 queryOptions for better type inference
  return useQuery({
    ...companiesOptions(userId || '', queryParams),
    // Prevent blinking by keeping previous data while fetching new data
    placeholderData: previousData => previousData,
  });
};

/**
 * Hook for fetching all companies data (non-paginated) - for MetadataContext (modernized with queryOptions)
 * @author @serabi
 * @returns React Query result with all companies data
 */
export const useAllCompanies = (userId?: string) => {
  return useQuery(allCompaniesOptions(userId || ''));
};
