/**
 * React Query hook for fetching artists data (modernized with queryOptions)
 * @author @serabi
 * @created 2025-07-16
 */

import { useQuery } from '@tanstack/react-query';
import { artistsOptions } from './shared/queryOptionsFactory';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook for fetching all artists for the current user (modernized with queryOptions)
 * Self-contained hook that automatically handles user authentication
 * @author @serabi
 * @returns React Query result with artists data
 */
export const useArtists = () => {
  const { user } = useAuth();
  return useQuery(artistsOptions(user?.id || ''));
};
