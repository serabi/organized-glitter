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
  // First, fetch the basic project record without expand to ensure it exists
  let projectRecord: ProjectWithExpand;
  
  try {
    // Try the full expand query first
    projectRecord = await pb
      .collection(Collections.Projects)
      .getOne<ProjectWithExpand>(projectId, {
        expand: 'company,artist,project_tags_via_project.tag',
        requestKey: `project-detail-${projectId}`,
      });
  } catch (error) {
    // If expand fails, try without expand to get basic project data
    console.warn('Full expand failed, trying basic query:', error);
    
    projectRecord = await pb
      .collection(Collections.Projects)
      .getOne<ProjectWithExpand>(projectId, {
        requestKey: `project-detail-basic-${projectId}`,
      });
    
    // Now try to expand relationships individually to see which ones work
    try {
      if (projectRecord.company) {
        const companyExpanded = await pb
          .collection(Collections.Projects)
          .getOne<ProjectWithExpand>(projectId, {
            expand: 'company',
            requestKey: `project-company-${projectId}`,
          });
        if (companyExpanded.expand?.company) {
          projectRecord.expand = { ...projectRecord.expand, company: companyExpanded.expand.company };
        }
      }
    } catch (companyError) {
      console.warn('Company expand failed:', companyError);
    }
    
    try {
      if (projectRecord.artist) {
        const artistExpanded = await pb
          .collection(Collections.Projects)
          .getOne<ProjectWithExpand>(projectId, {
            expand: 'artist',
            requestKey: `project-artist-${projectId}`,
          });
        if (artistExpanded.expand?.artist) {
          projectRecord.expand = { ...projectRecord.expand, artist: artistExpanded.expand.artist };
        }
      }
    } catch (artistError) {
      console.warn('Artist expand failed:', artistError);
    }
    
    try {
      const tagsExpanded = await pb
        .collection(Collections.Projects)
        .getOne<ProjectWithExpand>(projectId, {
          expand: 'project_tags_via_project.tag',
          requestKey: `project-tags-${projectId}`,
        });
      if (tagsExpanded.expand?.project_tags_via_project) {
        projectRecord.expand = { 
          ...projectRecord.expand, 
          project_tags_via_project: tagsExpanded.expand.project_tags_via_project 
        };
      }
    } catch (tagsError) {
      console.warn('Tags expand failed:', tagsError);
    }
  }

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
 * Now includes authentication state dependencies to prevent race conditions
 */
export const useProjectDetailQuery = (
  projectId: string | undefined,
  isAuthenticated?: boolean,
  initialCheckComplete?: boolean
) => {
  // Log auth state for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[useProjectDetailQuery] Auth state:', {
      projectId,
      isAuthenticated,
      initialCheckComplete,
      enabled: !!projectId && (isAuthenticated ?? true) && (initialCheckComplete ?? true)
    });
  }

  return useQuery({
    queryKey: queryKeys.projects.detail(projectId!),
    queryFn: () => fetchProjectDetail(projectId!),
    enabled: !!projectId && (isAuthenticated ?? true) && (initialCheckComplete ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Log retry attempts for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[useProjectDetailQuery] Retry attempt:', {
          failureCount,
          error,
          errorStatus: error && typeof error === 'object' && 'status' in error ? error.status : 'unknown'
        });
      }

      // Handle authentication errors - retry up to 2 times
      if (error && typeof error === 'object' && 'status' in error) {
        if (error.status === 401 || error.status === 403) {
          console.log('[useProjectDetailQuery] Auth error detected, retrying...', { failureCount });
          return failureCount < 2;
        }
        
        // Handle 404 errors more carefully
        if (error.status === 404) {
          // If the error message suggests it's an expand issue, allow retry
          const errorMessage = 'message' in error ? String(error.message) : '';
          if (errorMessage.includes('expand') || errorMessage.includes('relation')) {
            console.log('[useProjectDetailQuery] Expand-related 404, retrying...', { failureCount });
            return failureCount < 2; // Allow some retries for expand failures
          }
          console.log('[useProjectDetailQuery] True 404 - project not found, not retrying');
          return false; // True 404 - project doesn't exist
        }
      }
      
      // Default retry logic for other errors
      return failureCount < 3;
    },
  });
};
