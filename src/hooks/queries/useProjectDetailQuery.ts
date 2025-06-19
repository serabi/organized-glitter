import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import {
  Collections,
  ProjectsResponse,
  ProjectTagsResponse,
  TagsResponse,
  CompaniesResponse,
  ArtistsResponse,
} from '@/types/pocketbase.types';
import { ProjectType } from '@/types/project';
import { ProjectStatus } from '@/types/project-status';
import { queryKeys } from './queryKeys';

// Define interface for project with expanded data
interface ProjectWithExpand extends ProjectsResponse {
  expand?: {
    project_tags_via_project?: Array<
      ProjectTagsResponse & {
        expand?: {
          tag?: TagsResponse;
        };
      }
    >;
    company?: CompaniesResponse;
    artist?: ArtistsResponse;
  };
}

/**
 * Fetches a single project with all related data (company, artist, tags, progress notes)
 */
const fetchProjectDetail = async (projectId: string): Promise<ProjectType> => {
  // Fetch project with related data
  const projectRecord = await pb
    .collection(Collections.Projects)
    .getOne<ProjectWithExpand>(projectId, {
      expand: 'company,artist,project_tags_via_project.tag',
      requestKey: `project-detail-${projectId}`,
    });

  // Process tags from expanded data
  let tags: Array<{
    id: string;
    userId: string;
    name: string;
    slug: string;
    color: string;
    createdAt: string;
    updatedAt: string;
  }> = [];

  const projectTagsExpand = projectRecord.expand?.['project_tags_via_project'];
  if (projectTagsExpand) {
    const projectTagsArray = Array.isArray(projectTagsExpand)
      ? projectTagsExpand
      : [projectTagsExpand];

    tags = projectTagsArray
      .filter(pt => pt?.expand?.tag)
      .map(pt => {
        const tagData = pt.expand!.tag!;
        return {
          id: tagData.id,
          userId: tagData.user,
          name: tagData.name,
          slug: tagData.slug,
          color: tagData.color,
          createdAt: tagData.created,
          updatedAt: tagData.updated,
        };
      });
  }

  // Progress notes are now fetched separately by the ProgressNotes component
  // This eliminates duplicate fetching and improves loading performance

  // Convert to ProjectType
  const projectData: ProjectType = {
    id: projectRecord.id,
    userId: projectRecord.user,
    title: projectRecord.title || 'Untitled Project',
    company: projectRecord.expand?.company?.name || undefined,
    artist: projectRecord.expand?.artist?.name || undefined,
    width: projectRecord.width || undefined,
    height: projectRecord.height || undefined,
    drillShape: projectRecord.drill_shape || undefined,
    status: projectRecord.status as ProjectStatus,
    kit_category: projectRecord.kit_category || undefined,
    datePurchased: projectRecord.date_purchased || undefined,
    dateReceived: projectRecord.date_received || undefined,
    dateStarted: projectRecord.date_started || undefined,
    dateCompleted: projectRecord.date_completed || undefined,
    generalNotes: projectRecord.general_notes || undefined,
    imageUrl: projectRecord.image
      ? pb.files.getURL({ ...projectRecord, collectionName: 'projects' }, projectRecord.image)
      : undefined,
    sourceUrl: projectRecord.source_url || undefined,
    totalDiamonds: projectRecord.total_diamonds || undefined,
    progressNotes: [], // Now fetched separately
    tags: tags,
    createdAt: projectRecord.created,
    updatedAt: projectRecord.updated,
  };

  return projectData;
};

/**
 * React Query hook for fetching project detail data
 */
export const useProjectDetailQuery = (projectId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId!),
    queryFn: () => fetchProjectDetail(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (project not found)
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};
