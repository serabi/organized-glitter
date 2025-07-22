/**
 * React Query hook for fetching artists data (modernized with queryOptions)
 * @author @serabi
 * @created 2025-07-16
 */

import { useQuery } from '@tanstack/react-query';
import { artistsOptions } from './shared/queryOptionsFactory';

/**
 * Hook for fetching all artists for the current user (modernized with queryOptions)
 * @author @serabi
 * @param userId - User ID to fetch artists for
 * @returns React Query result with artists data
 */
export const useArtists = (userId?: string) => {
  return useQuery(artistsOptions(userId || ''));
};
