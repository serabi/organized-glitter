/**
 * React Query hook for fetching tags data (modernized with queryOptions)
 * @author @serabi
 * @created 2025-07-16
 */

import { useQuery } from '@tanstack/react-query';
import { tagsOptions } from './shared/queryOptionsFactory';

/**
 * Hook for fetching all tags for the current user using TagService (modernized with queryOptions)
 * @author @serabi
 * @param userId - User ID to fetch tags for
 * @returns React Query result with tags data
 */
export function useTags(userId?: string) {
  return useQuery(tagsOptions(userId || ''));
}
