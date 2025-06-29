/**
 * In-Progress Projects Query Hook
 *
 * Simplified hook for fetching only in-progress projects for the Overview page.
 * Extracted from useOverviewStatsOptimized as part of stats caching simplification.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import {
  Collections,
  ProjectsResponse,
  CompaniesResponse,
  ArtistsResponse,
} from '@/types/pocketbase.types';
import { ProjectType } from '@/types/project';
import { queryKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';

// Type for expanded project response
interface ExpandedProjectsResponse extends ProjectsResponse {
  expand?: {
    company?: CompaniesResponse;
    artist?: ArtistsResponse;
  };
}

/**
 * Fetch in-progress projects for overview display
 * Optimized with minimal field selection and proper PocketBase filtering
 */
async function fetchInProgressProjects(userId: string): Promise<ProjectType[]> {
  try {
    const inProgressResult = await pb
      .collection(Collections.Projects)
      .getFullList<ExpandedProjectsResponse>({
        filter: pb.filter('user = {:userId} && status = {:status}', { userId, status: 'progress' }),
        fields: 'id,title,image,updated,created,status,company,artist',
        sort: '-updated',
        expand: 'company,artist',
        $autoCancel: false, // Prevent cancellation for better UX
      });

    // Convert to ProjectType format - optimized for overview display
    return inProgressResult.map(project => ({
      id: project.id,
      userId: userId,
      title: project.title,
      company: project.expand?.company?.name || undefined,
      artist: project.expand?.artist?.name || undefined,
      status: project.status,
      imageUrl: project.image
        ? pb.files.getURL({ ...project, collectionName: 'projects' }, project.image, {
            thumb: '300x200f',
          })
        : undefined,
      updatedAt: project.updated,
      createdAt: project.created,
      // Set non-fetched fields to undefined for performance
      drillShape: undefined,
      width: undefined,
      height: undefined,
      datePurchased: undefined,
      dateReceived: undefined,
      dateStarted: undefined,
      dateCompleted: undefined,
      generalNotes: undefined,
      sourceUrl: undefined,
      totalDiamonds: undefined,
      kit_category: undefined,
      progressNotes: [],
      tags: [],
    }));
  } catch (error) {
    console.warn('[useInProgressProjects] Error fetching in-progress projects:', error);
    throw error; // Let React Query manage the error state
  }
}

/**
 * React Query hook for fetching in-progress projects
 * Optimized for Overview page display with appropriate caching strategy
 */
export const useInProgressProjects = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: userId ? [...queryKeys.projects.lists(), 'in-progress', userId] : [],
    queryFn: () => fetchInProgressProjects(userId!),
    enabled: !!userId,
    // Cache settings optimized for frequently changing in-progress projects
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter than stats since projects change more frequently
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    // Reasonable refetch settings for project updates
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true,
    // Simplified retry logic
    retry: failureCount => failureCount < 2,
    retryDelay: attemptIndex => Math.min(1000 * Math.pow(2, attemptIndex), 3000),
  });

  return {
    inProgressProjects: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Hook for prefetching in-progress projects (useful for navigation)
 */
export const usePrefetchInProgressProjects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return async () => {
    if (user?.id) {
      await queryClient.prefetchQuery({
        queryKey: [...queryKeys.projects.lists(), 'in-progress', user.id],
        queryFn: () => fetchInProgressProjects(user.id),
        staleTime: 2 * 60 * 1000,
      });
    }
  };
};
