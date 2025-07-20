/**
 * Generic list query factory for PocketBase collections
 * @author @serabi
 * @created 2025-07-16
 */

import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import {
  useUserAuth,
  getStandardQueryConfig,
  createRequestKey,
  logQueryError,
  logQuerySuccess,
  createQueryTimer,
} from './queryUtils';

/**
 * Configuration for list query factory
 * @author @serabi
 */
export interface ListQueryConfig<TData> {
  /** Collection name */
  collection: Collections;
  /** Query key factory function */
  queryKeyFactory: (userId: string) => readonly unknown[];
  /** Optional data transformation function */
  transform?: (items: unknown[]) => TData[];
  /** Optional sort field */
  sortField?: string;
  /** Optional additional filters */
  additionalFilters?: string;
  /** Request key suffix for deduplication */
  requestKeySuffix?: string;
  /** Hook name for logging */
  hookName: string;
  /** Optional page size for pagination (default: 200) */
  pageSize?: number;
}

/**
 * Helper function to execute list queries with shared logic
 * @param config - Configuration object
 * @param authenticatedUserId - Authenticated user ID
 * @param operationName - Name of the operation for logging
 * @param pocketbaseCall - Function that executes the PocketBase call
 * @returns Promise resolving to transformed data
 */
async function executeListQuery<TData>(
  config: ListQueryConfig<TData>,
  authenticatedUserId: string,
  operationName: string,
  pocketbaseCall: () => Promise<{ items: unknown[]; totalItems?: number }>
): Promise<TData[]> {
  const timer = createQueryTimer(config.hookName, operationName);

  try {
    const result = await pocketbaseCall();

    // Transform data if needed
    const transformedData = config.transform
      ? config.transform(result.items)
      : (result.items as TData[]);

    timer.stop({
      itemsCount: transformedData.length,
      totalItems: result.totalItems,
    });

    logQuerySuccess(config.hookName, operationName, transformedData, {
      userId: authenticatedUserId,
      itemsCount: transformedData.length,
      totalItems: result.totalItems,
    });

    return transformedData;
  } catch (error) {
    timer.stop({ error: true });
    logQueryError(config.hookName, operationName, error, {
      userId: authenticatedUserId,
      collection: config.collection,
    });
    throw error;
  }
}

/**
 * Generic hook factory for fetching user-scoped lists from PocketBase
 * @author @serabi
 * @param config - Configuration object
 * @returns React Query hook
 */
export function createListQuery<TData = unknown>(config: ListQueryConfig<TData>) {
  return function useListQuery() {
    const { userId, requireAuth } = useUserAuth();

    return useQuery<TData[], Error>({
      queryKey: config.queryKeyFactory(userId || ''),
      queryFn: async () => {
        const authenticatedUserId = requireAuth();

        // Build filter
        const filters = [`user = "${authenticatedUserId}"`];
        if (config.additionalFilters) {
          filters.push(config.additionalFilters);
        }

        return executeListQuery(config, authenticatedUserId, 'list query', () =>
          pb.collection(config.collection).getList(1, config.pageSize ?? 200, {
            filter: filters.join(' && '),
            sort: config.sortField || 'name',
            requestKey: createRequestKey(
              config.collection,
              authenticatedUserId,
              config.requestKeySuffix
            ),
          })
        );
      },
      enabled: !!userId,
      ...getStandardQueryConfig(),
    });
  };
}

/**
 * Generic hook factory for fetching complete user-scoped lists from PocketBase
 * @author @serabi
 * @param config - Configuration object
 * @returns React Query hook
 */
export function createFullListQuery<TData = unknown>(config: ListQueryConfig<TData>) {
  return function useFullListQuery() {
    const { userId, requireAuth } = useUserAuth();

    return useQuery<TData[], Error>({
      queryKey: config.queryKeyFactory(userId || ''),
      queryFn: async () => {
        const authenticatedUserId = requireAuth();

        // Build filter
        const filters = [`user = "${authenticatedUserId}"`];
        if (config.additionalFilters) {
          filters.push(config.additionalFilters);
        }

        return executeListQuery(config, authenticatedUserId, 'full list query', () =>
          pb.collection(config.collection).getFullList({
            filter: filters.join(' && '),
            sort: config.sortField || 'name',
            requestKey: createRequestKey(
              config.collection,
              authenticatedUserId,
              config.requestKeySuffix || 'all'
            ),
          })
        );
      },
      enabled: !!userId,
      ...getStandardQueryConfig(),
    });
  };
}
