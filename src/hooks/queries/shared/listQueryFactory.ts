/**
 * Generic list query factory for PocketBase collections
 * @author @serabi
 * @created 2025-01-16
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
  createQueryTimer 
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
        const timer = createQueryTimer(config.hookName, 'list query');
        
        try {
          // Build filter
          const filters = [`user = "${authenticatedUserId}"`];
          if (config.additionalFilters) {
            filters.push(config.additionalFilters);
          }
          
          // Execute query
          const result = await pb.collection(config.collection).getList(1, 200, {
            filter: filters.join(' && '),
            sort: config.sortField || 'name',
            requestKey: createRequestKey(
              config.collection, 
              authenticatedUserId, 
              config.requestKeySuffix
            ),
          });
          
          // Transform data if needed
          const transformedData = config.transform ? config.transform(result.items) : result.items as TData[];
          
          timer.stop({
            itemsCount: transformedData.length,
            totalItems: result.totalItems,
          });
          
          logQuerySuccess(config.hookName, 'list query', transformedData, {
            userId: authenticatedUserId,
            itemsCount: transformedData.length,
            totalItems: result.totalItems,
          });
          
          return transformedData;
        } catch (error) {
          timer.stop({ error: true });
          logQueryError(config.hookName, 'list query', error, {
            userId: authenticatedUserId,
            collection: config.collection,
          });
          throw error;
        }
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
        const timer = createQueryTimer(config.hookName, 'full list query');
        
        try {
          // Build filter
          const filters = [`user = "${authenticatedUserId}"`];
          if (config.additionalFilters) {
            filters.push(config.additionalFilters);
          }
          
          // Execute query
          const result = await pb.collection(config.collection).getFullList({
            filter: filters.join(' && '),
            sort: config.sortField || 'name',
            requestKey: createRequestKey(
              config.collection, 
              authenticatedUserId, 
              config.requestKeySuffix || 'all'
            ),
          });
          
          // Transform data if needed
          const transformedData = config.transform ? config.transform(result) : result as TData[];
          
          timer.stop({
            itemsCount: transformedData.length,
          });
          
          logQuerySuccess(config.hookName, 'full list query', transformedData, {
            userId: authenticatedUserId,
            itemsCount: transformedData.length,
          });
          
          return transformedData;
        } catch (error) {
          timer.stop({ error: true });
          logQueryError(config.hookName, 'full list query', error, {
            userId: authenticatedUserId,
            collection: config.collection,
          });
          throw error;
        }
      },
      enabled: !!userId,
      ...getStandardQueryConfig(),
    });
  };
}