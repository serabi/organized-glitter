import { useState, useEffect, useCallback, useRef } from 'react';
import { secureLogger } from '@/utils/secureLogger';
import { pb } from '@/lib/pocketbase';
import {
  Collections,
  ProjectsResponse,
  ProjectsStatusOptions,
  CompaniesResponse,
  ArtistsResponse,
} from '@/types/pocketbase.types';
import { ProjectType } from '@/types/project';

// Type for expanded project response
interface ExpandedProjectsResponse extends ProjectsResponse {
  expand?: {
    company?: CompaniesResponse;
    artist?: ArtistsResponse;
  };
}

interface OverviewStats {
  completedCount: number;
  estimatedDrills: number;
  startedCount: number;
  inProgressCount: number;
  totalDiamonds: number;
}

interface UseOptimizedOverviewStatsResult {
  stats: OverviewStats;
  inProgressProjects: ProjectType[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Optimized hook that fetches only the necessary data for overview stats
 * instead of fetching ALL projects and processing client-side
 */
export function useOptimizedOverviewStats(
  userId: string | undefined
): UseOptimizedOverviewStatsResult {
  const [stats, setStats] = useState<OverviewStats>({
    completedCount: 0,
    estimatedDrills: 0,
    startedCount: 0,
    inProgressCount: 0,
    totalDiamonds: 0,
  });
  const [inProgressProjects, setInProgressProjects] = useState<ProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!userId || fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const currentYear = new Date().getFullYear();

      // OPTIMIZATION: Single query to get ALL projects for accurate statistics
      // Using getFullList() to ensure complete data for overview stats calculation
      // This reduces 4 API calls to 1, significantly improving performance
      const projectsResult = await pb
        .collection(Collections.Projects)
        .getFullList<ExpandedProjectsResponse>({
          filter: `user = "${userId}"`,
          fields:
            'id,status,date_completed,date_started,total_diamonds,title,image,updated,user,company,artist,drill_shape,width,height,date_purchased,date_received,general_notes,source_url,kit_category,created',
          sort: '-updated',
          expand: 'company,artist',
          batch: 200, // Fetch in batches of 200 for performance
          requestKey: `overview-optimized-${userId}-${currentYear}`,
        });

      // Process all stats from single result set
      let completedCount = 0;
      let startedCount = 0;
      let totalDiamonds = 0;
      const allInProgressProjects: ProjectType[] = [];
      let inProgressCount = 0;

      projectsResult.forEach(project => {
        // Count completed projects this year
        if (project.status === 'completed' && project.date_completed) {
          const completedDate = new Date(project.date_completed);
          if (completedDate.getFullYear() === currentYear) {
            completedCount++;
            if (project.total_diamonds) {
              totalDiamonds += project.total_diamonds;
            }
          }
        }

        // Count started projects this year
        if (project.date_started) {
          const startedDate = new Date(project.date_started);
          if (startedDate.getFullYear() === currentYear) {
            startedCount++;
          }
        }

        // Collect ALL in-progress projects, then take the first 6 most recently updated
        if (project.status === ProjectsStatusOptions.progress) {
          inProgressCount++;
          // Convert PocketBase project to ProjectType
          const convertedProject: ProjectType = {
            id: project.id,
            userId: project.user,
            title: project.title,
            company: project.expand?.company?.name || undefined,
            artist: project.expand?.artist?.name || undefined,
            drillShape: project.drill_shape || undefined,
            width: project.width || undefined,
            height: project.height || undefined,
            status: project.status,
            datePurchased: project.date_purchased || undefined,
            dateReceived: project.date_received || undefined,
            dateStarted: project.date_started || undefined,
            dateCompleted: project.date_completed || undefined,
            generalNotes: project.general_notes || undefined,
            imageUrl: project.image
              ? `${pb.baseUrl}/api/files/${Collections.Projects}/${project.id}/${project.image}`
              : undefined,
            sourceUrl: project.source_url || undefined,
            totalDiamonds: project.total_diamonds || undefined,
            kit_category: project.kit_category || undefined,
            progressNotes: [], // Will be populated separately if needed
            tags: [], // Will be populated separately if needed
            createdAt: project.created,
            updatedAt: project.updated,
          };
          allInProgressProjects.push(convertedProject);
        }
      });

      // Take the first 6 in-progress projects (already sorted by most recently updated)
      const inProgressProjectsData = allInProgressProjects.slice(0, 6);

      setStats({
        completedCount,
        estimatedDrills: totalDiamonds,
        startedCount,
        inProgressCount,
        totalDiamonds,
      });
      setInProgressProjects(inProgressProjectsData);
    } catch (err) {
      secureLogger.error('Error fetching overview stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    inProgressProjects,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
