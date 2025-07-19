/**
 * TanStack Query v5 queryOptions factories for improved type inference
 * @author @serabi
 * @created 2025-07-19
 */

import { queryOptions } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, CompaniesResponse, ArtistsResponse } from '@/types/pocketbase.types';
import { TagService } from '@/lib/tags';
import { queryKeys, CompanyQueryParams } from '../queryKeys';
import { createLogger } from '@/utils/secureLogger';
import type { Tag } from '@/types/tag';

const logger = createLogger('QueryOptionsFactory');

/**
 * Companies data fetching with pagination
 */
async function fetchCompanies(
  params: CompanyQueryParams & { userId: string }
): Promise<{
  companies: CompaniesResponse[];
  totalItems: number;
  totalPages: number;
}> {
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

  return {
    companies: resultList.items,
    totalItems: resultList.totalItems,
    totalPages: resultList.totalPages,
  };
}

/**
 * All companies data fetching (non-paginated)
 */
async function fetchAllCompanies(userId: string): Promise<CompaniesResponse[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  logger.debug(`Fetching all companies for user ${userId}`);

  const startTime = performance.now();
  const requestKey = `companies-${userId}-all`;

  const resultList = await pb.collection(Collections.Companies).getList(1, 500, {
    filter: `user = "${userId}"`,
    sort: 'name',
    requestKey,
  });

  const endTime = performance.now();
  logger.debug(
    `All companies query completed in ${Math.round(endTime - startTime)}ms - ${resultList.items.length} items`
  );

  return resultList.items;
}

/**
 * All artists data fetching
 */
async function fetchArtists(userId: string): Promise<ArtistsResponse[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  logger.debug(`Fetching artists for user ${userId}`);

  const startTime = performance.now();
  const requestKey = `artists-${userId}-all`;

  const resultList = await pb.collection(Collections.Artists).getList(1, 500, {
    filter: `user = "${userId}"`,
    sort: 'name',
    requestKey,
  });

  const endTime = performance.now();
  logger.debug(
    `Artists query completed in ${Math.round(endTime - startTime)}ms - ${resultList.items.length} items`
  );

  return resultList.items;
}

/**
 * All tags data fetching using TagService
 */
async function fetchTags(): Promise<Tag[]> {
  logger.debug('Fetching tags using TagService');

  const startTime = performance.now();

  try {
    const result = await TagService.getUserTags();

    if (result.status === 'error') {
      logger.error('Tags fetch failed', result.error);
      throw new Error(result.error || 'Failed to fetch tags');
    }

    const endTime = performance.now();
    logger.debug(
      `Tags query completed in ${Math.round(endTime - startTime)}ms - ${result.data.length} items`
    );

    return result.data;
  } catch (error) {
    logger.error('Tags fetch error', error);
    throw error;
  }
}

/**
 * Companies query options factory for paginated data
 */
export function companiesOptions(userId: string, params: CompanyQueryParams) {
  return queryOptions({
    queryKey: queryKeys.companies.list(userId, params),
    queryFn: () => fetchCompanies({ userId, ...params }),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      const errorMessage = error?.message || '';
      const isClientError =
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');

      if (isClientError) {
        return false;
      }

      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * All companies query options factory (non-paginated)
 */
export function allCompaniesOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.companies.allForUser(userId),
    queryFn: () => fetchAllCompanies(userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      const errorMessage = error?.message || '';
      const isClientError =
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');

      if (isClientError) {
        return false;
      }

      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Artists query options factory
 */
export function artistsOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.artists.list(userId),
    queryFn: () => fetchArtists(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      const errorMessage = error?.message || '';
      const isClientError =
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');

      if (isClientError) {
        return false;
      }

      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Tags query options factory
 */
export function tagsOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.tags.list(userId),
    queryFn: fetchTags,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      const errorMessage = error?.message || '';
      const isClientError =
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');

      if (isClientError) {
        return false;
      }

      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}