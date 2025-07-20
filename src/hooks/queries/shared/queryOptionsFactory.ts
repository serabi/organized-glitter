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
import { 
  getStandardQueryConfig, 
  getFrequentQueryConfig, 
  createRequestKey, 
  createQueryTimer 
} from './queryUtils';
import type { Tag } from '@/types/tag';

const logger = createLogger('QueryOptionsFactory');

/**
 * Companies data fetching with pagination
 */
async function fetchCompanies(params: CompanyQueryParams & { userId: string }): Promise<{
  companies: CompaniesResponse[];
  totalItems: number;
  totalPages: number;
}> {
  const { userId, currentPage, pageSize } = params;

  if (!userId) {
    throw new Error('User ID is required');
  }

  logger.debug(`Fetching companies for user ${userId} - page ${currentPage}, size ${pageSize}`);

  const timer = createQueryTimer('QueryOptionsFactory', 'fetchCompanies');
  const requestKey = createRequestKey('companies', userId, `page${currentPage}-size${pageSize}`);

  const resultList = await pb.collection(Collections.Companies).getList(currentPage, pageSize, {
    filter: `user = "${userId}"`,
    sort: 'name',
    requestKey,
  });

  timer.stop({ itemCount: resultList.items.length });

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

  const timer = createQueryTimer('QueryOptionsFactory', 'fetchAllCompanies');
  const requestKey = createRequestKey('companies', userId, 'all');

  const resultList = await pb.collection(Collections.Companies).getList(1, 500, {
    filter: `user = "${userId}"`,
    sort: 'name',
    requestKey,
  });

  timer.stop({ itemCount: resultList.items.length });

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

  const timer = createQueryTimer('QueryOptionsFactory', 'fetchArtists');
  const requestKey = createRequestKey('artists', userId, 'all');

  const resultList = await pb.collection(Collections.Artists).getList(1, 500, {
    filter: `user = "${userId}"`,
    sort: 'name',
    requestKey,
  });

  timer.stop({ itemCount: resultList.items.length });

  return resultList.items;
}

/**
 * All tags data fetching using TagService
 */
async function fetchTags(): Promise<Tag[]> {
  logger.debug('Fetching tags using TagService');

  const timer = createQueryTimer('QueryOptionsFactory', 'fetchTags');

  try {
    const result = await TagService.getUserTags();

    if (result.status === 'error') {
      logger.error('Tags fetch failed', result.error);
      const errorMessage = result.error instanceof Error ? result.error.message : result.error;
      throw new Error(errorMessage || 'Failed to fetch tags');
    }

    timer.stop({ itemCount: result.data.length });

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
  const config = getStandardQueryConfig();
  return queryOptions({
    queryKey: queryKeys.companies.list(userId, params),
    queryFn: () => fetchCompanies({ userId, ...params }),
    enabled: !!userId,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    refetchOnReconnect: config.refetchOnReconnect,
    retry: config.retry,
    retryDelay: config.retryDelay,
  });
}

/**
 * All companies query options factory (non-paginated)
 */
export function allCompaniesOptions(userId: string) {
  const config = getStandardQueryConfig();
  return queryOptions({
    queryKey: queryKeys.companies.allForUser(userId),
    queryFn: () => fetchAllCompanies(userId),
    enabled: !!userId,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    refetchOnReconnect: config.refetchOnReconnect,
    retry: config.retry,
    retryDelay: config.retryDelay,
  });
}

/**
 * Artists query options factory
 */
export function artistsOptions(userId: string) {
  const config = getFrequentQueryConfig();
  return queryOptions({
    queryKey: queryKeys.artists.list(userId),
    queryFn: () => fetchArtists(userId),
    enabled: !!userId,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    refetchOnReconnect: config.refetchOnReconnect,
    retry: config.retry,
    retryDelay: config.retryDelay,
  });
}

/**
 * Tags query options factory
 */
export function tagsOptions(userId: string) {
  const config = getFrequentQueryConfig();
  return queryOptions({
    queryKey: queryKeys.tags.list(userId),
    queryFn: fetchTags,
    enabled: !!userId,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    refetchOnReconnect: config.refetchOnReconnect,
    retry: config.retry,
    retryDelay: config.retryDelay,
  });
}
