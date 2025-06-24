import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import {
  Collections,
  ProjectsResponse,
  ProjectTagsResponse,
  TagsResponse,
} from '@/types/pocketbase.types';
import { ProjectType, ProjectStatus, Tag } from '@/types/project';
import { queryKeys } from './queryKeys';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useAdvancedProjects');

interface ProjectWithExpand extends ProjectsResponse {
  expand?: {
    project_tags_via_project?: Array<
      ProjectTagsResponse & {
        expand?: {
          tag?: TagsResponse;
        };
      }
    >;
    company?: {
      id: string;
      name: string;
      website_url?: string;
    };
    artist?: {
      id: string;
      name: string;
    };
  };
}

interface AdvancedProjectsResult {
  projects: ProjectType[];
  totalItems: number;
}

export const useAdvancedProjects = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.projects.advanced(userId || ''),
    queryFn: async (): Promise<AdvancedProjectsResult> => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      logger.debug('Fetching advanced projects for user:', userId);

      // Fetch all projects with pagination to avoid rate limits and data truncation
      const allProjects: ProjectWithExpand[] = [];
      let currentPage = 1;
      const perPage = 200; // Smaller page size to reduce payload and avoid rate limits

      let hasMorePages = true;
      while (hasMorePages) {
        const projectsRecords = await pb
          .collection(Collections.Projects)
          .getList<ProjectWithExpand>(currentPage, perPage, {
            filter: `user = "${userId}"`,
            sort: '-updated',
            expand: 'project_tags_via_project.tag,company,artist',
          });

        if (projectsRecords.items && Array.isArray(projectsRecords.items)) {
          allProjects.push(...projectsRecords.items);
        }

        // Check if there are more pages to fetch
        hasMorePages = currentPage < projectsRecords.totalPages;
        currentPage++;

        logger.debug(
          `Fetched page ${currentPage - 1}/${projectsRecords.totalPages}, total items so far: ${allProjects.length}`
        );
      }

      logger.info('All projects data received:', allProjects.length);

      if (!allProjects || !Array.isArray(allProjects)) {
        throw new Error('Invalid projects data received from server');
      }

      // Advanced Dashboard doesn't need progress notes - skip fetching them for better performance

      // Process the data with proper type annotations and security validation
      const processedProjects = allProjects.map(
        (dbProject: ProjectWithExpand): ProjectType | null => {
          // Validate that this project belongs to the current user (security check)
          if (dbProject.user !== userId) {
            logger.warn('Project does not belong to current user, skipping:', dbProject.id);
            return null;
          }

          // Use width and height directly from the database
          const width = dbProject.width ?? undefined;
          const height = dbProject.height ?? undefined;

          // Transform project_tags from expanded data
          let tags: Tag[] = [];
          try {
            const projectTagsExpand = dbProject.expand?.['project_tags_via_project'];
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
          } catch (error) {
            logger.error('Error parsing project tags', error, { projectId: dbProject.id });
            tags = [];
          }

          // Convert from database structure to ProjectType
          return {
            id: dbProject.id,
            userId: dbProject.user,
            title: dbProject.title || 'Untitled Project',
            company:
              typeof dbProject.expand?.company === 'object' &&
              dbProject.expand.company &&
              'name' in dbProject.expand.company
                ? String(dbProject.expand.company.name)
                : undefined,
            artist:
              typeof dbProject.expand?.artist === 'object' &&
              dbProject.expand.artist &&
              'name' in dbProject.expand.artist
                ? String(dbProject.expand.artist.name)
                : undefined,
            width: width,
            height: height,
            drillShape: dbProject.drill_shape || undefined,
            status: dbProject.status as ProjectStatus,
            kit_category: dbProject.kit_category || undefined,
            datePurchased: dbProject.date_purchased || undefined,
            dateReceived: dbProject.date_received || undefined,
            dateStarted: dbProject.date_started || undefined,
            dateCompleted: dbProject.date_completed || undefined,
            generalNotes: dbProject.general_notes || undefined,
            imageUrl: dbProject.image
              ? pb.files.getURL({ ...dbProject, collectionName: 'projects' }, dbProject.image, { thumb: '300x200f' })
              : undefined,
            sourceUrl: dbProject.source_url || undefined,
            totalDiamonds: dbProject.total_diamonds || undefined,
            progressNotes: [], // Advanced Dashboard doesn't display progress notes
            tags: tags,
            createdAt: dbProject.created,
            updatedAt: dbProject.updated,
          };
        }
      );

      const validProjects = processedProjects.filter((p): p is ProjectType => p !== null);

      logger.info('Processed projects:', validProjects.length);

      return {
        projects: validProjects,
        totalItems: validProjects.length,
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter since this is detailed data
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      const errorMessage = error?.message || '';
      const isClientError =
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');

      if (isClientError) {
        return false;
      }

      // Retry once for other errors
      return failureCount < 1;
    },
  });
};
