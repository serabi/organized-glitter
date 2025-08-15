/**
 * React Query hook for fetching tags data (modernized with queryOptions)
 * @author @serabi
 * @created 2025-07-16
 */

import { useQuery } from '@tanstack/react-query';
import { tagsOptions } from './shared/queryOptionsFactory';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook for fetching all tags for the current user using TagService (modernized with queryOptions)
 * Self-contained hook that automatically handles user authentication
 * @author @serabi
 * @returns React Query result with tags data
 */
export function useTags() {
  const { user } = useAuth();
  return useQuery(tagsOptions(user?.id || ''));
}
