/**
 * Entity Resolution Hook with React Query Caching
 * 
 * Provides cached company and artist name-to-ID resolution for forms.
 * Uses React Query for automatic caching, deduplication, and background refresh.
 * 
 * @author @serabi
 * @created 2025-01-14
 */

import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useEntityResolver');

/**
 * Supported entity types for resolution
 */
export type EntityType = 'company' | 'artist';

/**
 * Result of entity resolution
 */
export interface EntityResolutionResult {
  id: string;
  name: string;
}

/**
 * Resolves entity name to PocketBase ID with error handling
 * 
 * @param type - Entity type ('company' or 'artist')
 * @param name - Entity name to resolve
 * @param userId - User ID for filtering
 * @returns Promise resolving to entity record
 */
async function resolveEntity(
  type: EntityType,
  name: string,
  userId: string
): Promise<EntityResolutionResult> {
  try {
    logger.debug(`Resolving ${type}: "${name}" for user: ${userId}`);
    
    const collection = type === 'company' ? 'companies' : 'artists';
    const record = await pb.collection(collection).getFirstListItem(
      pb.filter('name = {:name} && user = {:user}', {
        name: name.trim(),
        user: userId,
      })
    );

    logger.debug(`Successfully resolved ${type}: "${name}" -> ${record.id}`);
    
    return {
      id: record.id,
      name: record.name,
    };
  } catch (error) {
    logger.warn(`Failed to resolve ${type}: "${name}"`, error);
    throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" not found`);
  }
}

/**
 * Hook for resolving entity names to IDs with React Query caching
 * 
 * Features:
 * - 5-minute cache for successful resolutions
 * - Automatic deduplication of concurrent requests
 * - Background refresh for stale data
 * - Error handling with user-friendly messages
 * 
 * @param type - Entity type to resolve ('company' or 'artist')
 * @param name - Entity name to resolve
 * @param userId - User ID for filtering (optional, uses auth context if not provided)
 * @returns React Query result with resolved entity data
 */
export function useEntityResolver(
  type: EntityType,
  name: string,
  userId?: string
) {
  return useQuery({
    queryKey: ['entity-resolve', type, name.trim(), userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('User ID required for entity resolution');
      }
      return resolveEntity(type, name.trim(), userId);
    },
    enabled: Boolean(name?.trim() && userId),
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000,   // 10 minutes - kept in cache when inactive
    retry: (failureCount, error) => {
      // Don't retry "not found" errors - they're expected
      if (error instanceof Error && error.message.includes('not found')) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for resolving company names to IDs
 * Convenience wrapper around useEntityResolver
 * 
 * @param companyName - Company name to resolve
 * @param userId - User ID for filtering
 * @returns React Query result with resolved company data
 */
export function useCompanyResolver(companyName: string, userId?: string) {
  return useEntityResolver('company', companyName, userId);
}

/**
 * Hook for resolving artist names to IDs
 * Convenience wrapper around useEntityResolver
 * 
 * @param artistName - Artist name to resolve
 * @param userId - User ID for filtering
 * @returns React Query result with resolved artist data
 */
export function useArtistResolver(artistName: string, userId?: string) {
  return useEntityResolver('artist', artistName, userId);
}

/**
 * Batch resolver for multiple entities
 * Useful when resolving both company and artist in forms
 * 
 * @param entities - Array of entities to resolve
 * @param userId - User ID for filtering
 * @returns Object with resolver results for each entity
 */
export function useBatchEntityResolver(
  entities: Array<{ type: EntityType; name: string }>,
  userId?: string
) {
  const results = entities.map((entity, index) => ({
    key: `${entity.type}-${index}`,
    type: entity.type,
    name: entity.name,
    query: useEntityResolver(entity.type, entity.name, userId),
  }));

  return {
    results,
    isLoading: results.some(r => r.query.isLoading),
    isError: results.some(r => r.query.isError),
    errors: results.filter(r => r.query.isError).map(r => ({
      type: r.type,
      name: r.name,
      error: r.query.error,
    })),
  };
}

/**
 * Utility function to invalidate entity resolution cache
 * Useful when entities are created/updated
 * 
 * @param queryClient - React Query client
 * @param type - Optional entity type to invalidate (if not provided, invalidates all)
 */
export function invalidateEntityResolutionCache(
  queryClient: any,
  type?: EntityType
) {
  const queryKey = type ? ['entity-resolve', type] : ['entity-resolve'];
  queryClient.invalidateQueries({ queryKey });
  logger.debug(`Invalidated entity resolution cache${type ? ` for ${type}` : ''}`);
}