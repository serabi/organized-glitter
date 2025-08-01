import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';
// import { toUserDateString, fromUserDateString } from '@/utils/timezoneUtils';

const projectDetailLogger = createLogger('useProjectDetailQuery');
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
 * Helper function to convert database date strings to user timezone
 * Database stores dates in YYYY-MM-DD format, typically in UTC context
 */
const convertDatabaseDateToUserTimezone = (
  dbDate: string | null | undefined,
  userTimezone: string
): string | undefined => {
  if (!dbDate) return undefined;

  try {
    // Convert database dates to YYYY-MM-DD format for HTML5 date inputs
    // Handle both YYYY-MM-DD and ISO datetime formats from database
    let converted: string;

    if (dbDate.includes('T') || dbDate.includes(' ')) {
      // ISO datetime format - extract just the date part and ignore timezone
      // For "2024-12-12 00:00:00.000Z" or "2024-12-12T00:00:00.000Z"
      converted = dbDate.split('T')[0].split(' ')[0];
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dbDate)) {
      // Already YYYY-MM-DD format
      converted = dbDate;
    } else {
      // Fallback: try to parse and extract date
      const date = new Date(dbDate);
      if (!isNaN(date.getTime())) {
        converted = date.toISOString().split('T')[0];
      } else {
        converted = dbDate; // Last resort fallback
      }
    }

    projectDetailLogger.debug('📅 Date conversion during project load', {
      dbDate,
      userTimezone,
      converted,
      isDifferent: dbDate !== converted,
      inputFormat: dbDate.includes('T') || dbDate.includes(' ') ? 'datetime' : 'dateonly',
    });

    return converted;
  } catch (error) {
    projectDetailLogger.warn('Failed to convert database date to user timezone', {
      dbDate,
      userTimezone,
      error,
    });
    return dbDate; // Fallback to original value
  }
};

/**
 * Fetches a single project with all related data (company, artist, tags, progress notes)
 * @param projectId - Project ID to fetch
 * @param userTimezone - User's timezone for date conversion (defaults to UTC)
 */
const fetchProjectDetail = async (
  projectId: string,
  userTimezone: string = 'UTC'
): Promise<ProjectType> => {
  // First, fetch the basic project record without expand to ensure it exists
  let projectRecord: ProjectWithExpand;

  try {
    // Try the full expand query first
    projectRecord = await pb.collection(Collections.Projects).getOne<ProjectWithExpand>(projectId, {
      expand: 'company,artist,project_tags_via_project.tag',
      requestKey: `project-detail-${projectId}`,
    });
  } catch (error) {
    // If expand fails, try without expand to get basic project data
    projectDetailLogger.warn('Full expand failed, trying basic query:', error);

    projectRecord = await pb.collection(Collections.Projects).getOne<ProjectWithExpand>(projectId, {
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
          projectRecord.expand = {
            ...projectRecord.expand,
            company: companyExpanded.expand.company,
          };
        }
      }
    } catch (companyError) {
      projectDetailLogger.warn('Company expand failed:', companyError);
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
      projectDetailLogger.warn('Artist expand failed:', artistError);
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
          project_tags_via_project: tagsExpanded.expand.project_tags_via_project,
        };
      }
    } catch (tagsError) {
      projectDetailLogger.warn('Tags expand failed:', tagsError);
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

  // Helper function to clean up expanded names (handles corrupted/concatenated values)
  const cleanExpandedName = (expandedName: string | undefined): string | undefined => {
    if (!expandedName) return undefined;

    // Handle concatenated duplicates like "OtherOther" -> "Other"
    const knownSpecialValues = ['Other', 'None', 'Unknown'];
    for (const special of knownSpecialValues) {
      // Check if the string is a repeated special value
      const pattern = new RegExp(`^(${special})+$`, 'i');
      if (pattern.test(expandedName)) {
        return special;
      }
    }

    return expandedName;
  };

  // Convert to ProjectType
  const projectData: ProjectType = {
    id: projectRecord.id,
    userId: projectRecord.user,
    title: projectRecord.title || 'Untitled Project',
    company: cleanExpandedName(projectRecord.expand?.company?.name),
    artist: cleanExpandedName(projectRecord.expand?.artist?.name),
    width: projectRecord.width || undefined,
    height: projectRecord.height || undefined,
    drillShape: projectRecord.drill_shape || undefined,
    status: projectRecord.status as ProjectStatus,
    kit_category: projectRecord.kit_category || undefined,
    datePurchased: convertDatabaseDateToUserTimezone(projectRecord.date_purchased, userTimezone),
    dateReceived: convertDatabaseDateToUserTimezone(projectRecord.date_received, userTimezone),
    dateStarted: convertDatabaseDateToUserTimezone(projectRecord.date_started, userTimezone),
    dateCompleted: convertDatabaseDateToUserTimezone(projectRecord.date_completed, userTimezone),
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
  initialCheckComplete?: boolean,
  userTimezone: string = 'UTC'
) => {
  // Only log auth state once when query is first enabled
  const isQueryEnabled = !!projectId && (isAuthenticated ?? true) && (initialCheckComplete ?? true);

  return useQuery({
    queryKey: queryKeys.projects.detail(projectId!),
    queryFn: () => fetchProjectDetail(projectId!, userTimezone),
    enabled: isQueryEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Log retry attempts for debugging
      projectDetailLogger.debug('Retry attempt:', {
        failureCount,
        error,
        errorStatus:
          error && typeof error === 'object' && 'status' in error ? error.status : 'unknown',
      });

      // Handle authentication errors - retry up to 2 times
      if (error && typeof error === 'object' && 'status' in error) {
        if (error.status === 401 || error.status === 403) {
          projectDetailLogger.debug('Auth error detected, retrying...', { failureCount });
          return failureCount < 2;
        }

        // Handle 404 errors more carefully
        if (error.status === 404) {
          // If the error message suggests it's an expand issue, allow retry
          const errorMessage = 'message' in error ? String(error.message) : '';
          if (errorMessage.includes('expand') || errorMessage.includes('relation')) {
            projectDetailLogger.debug('Expand-related 404, retrying...', {
              failureCount,
            });
            return failureCount < 2; // Allow some retries for expand failures
          }
          projectDetailLogger.debug('True 404 - project not found, not retrying');
          return false; // True 404 - project doesn't exist
        }
      }

      // Default retry logic for other errors
      return failureCount < 3;
    },
  });
};
