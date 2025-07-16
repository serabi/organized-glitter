/**
 * React Query hook for fetching artists data
 * @author @serabi
 * @created 2025-01-16
 */

import { Collections, ArtistsResponse } from '@/types/pocketbase.types';
import { queryKeys } from './queryKeys';
import { createListQuery } from './shared/listQueryFactory';

/**
 * Hook for fetching all artists for the current user
 * @author @serabi
 * @returns React Query result with artists data
 */
export const useArtists = createListQuery<ArtistsResponse>({
  collection: Collections.Artists,
  queryKeyFactory: (userId: string) => queryKeys.artists.list(userId),
  sortField: 'name',
  requestKeySuffix: 'all',
  hookName: 'useArtists',
});
