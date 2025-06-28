import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '@/lib/pocketbase';
import { ProjectStatus, ProjectFormValues, ProjectType } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';
import { ProjectsResponse, CompaniesResponse, ArtistsResponse } from '@/types/pocketbase.types';
import { extractDateOnly } from '@/lib/utils';

const logger = createLogger('useProjectService');

interface ProjectWithExpand extends ProjectsResponse {
  expand?: {
    company?: CompaniesResponse;
    artist?: ArtistsResponse;
    user?: any;
    project_tags_via_project?: Array<any>;
  };
}

/**
 * Transform PocketBase record to ProjectType
 */
const transformProject = (record: ProjectWithExpand): ProjectType => {
  return {
    id: record.id,
    title: record.title,
    userId: record.user,
    company: record.expand?.company?.name || '',
    artist: record.expand?.artist?.name || '',
    status: record.status as ProjectStatus,
    kit_category: record.kit_category || undefined,
    drillShape: record.drill_shape || undefined,
    datePurchased: extractDateOnly(record.date_purchased),
    dateStarted: extractDateOnly(record.date_started),
    dateCompleted: extractDateOnly(record.date_completed),
    dateReceived: extractDateOnly(record.date_received),
    width: record.width || undefined,
    height: record.height || undefined,
    totalDiamonds: record.total_diamonds || undefined,
    generalNotes: record.general_notes || '',
    imageUrl: record.image ? pb.files.getURL(record, record.image) : undefined,
    sourceUrl: record.source_url || undefined,
    createdAt: record.created || '',
    updatedAt: record.updated || '',
    progressNotes: [],
    progressImages: [],
    tags: [], // Tags would need to be handled separately if needed
  };
};

/**
 * Hook for managing projects with direct PocketBase calls
 *
 * This hook provides functions for fetching, creating, updating, and deleting projects,
 * as well as managing loading states and error handling.
 */
export const useProjectService = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Fetch a single project by ID
   */
  const fetchProject = useCallback(
    async (projectId: string): Promise<ProjectType | null> => {
      if (!projectId) {
        toast({
          title: 'Error',
          description: 'Project ID is required',
          variant: 'destructive',
        });
        return null;
      }

      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive',
        });
        return null;
      }

      setLoading(true);
      try {
        logger.debug(`Fetching project ${projectId}`);

        const record = await pb.collection('projects').getOne(projectId, {
          expand: 'company,artist,user,project_tags_via_project.tag',
          requestKey: `fetch-project-${projectId}-${Date.now()}`,
        }) as ProjectWithExpand;

        logger.debug(`Project ${projectId} fetched successfully`);
        toast({
          title: 'Success',
          description: 'Project loaded successfully',
          variant: 'default',
        });

        return transformProject(record);
      } catch (error) {
        const errorMsg = `Failed to fetch project ${projectId}`;
        logger.error(errorMsg, error);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast, user?.id]
  );

  /**
   * Fetch all projects for the current user, with optional status filter
   */
  const fetchProjects = useCallback(
    async (status?: ProjectStatus | 'all'): Promise<ProjectType[]> => {
      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive',
        });
        return [];
      }

      setLoading(true);
      try {
        logger.debug(`Fetching projects for user ${user.id}, status: ${status}`);

        // Build filter using pb.filter for security
        let filter = pb.filter('user = {:userId}', { userId: user.id });
        if (status && status !== 'all') {
          filter = pb.filter('user = {:userId} && status = {:status}', { 
            userId: user.id, 
            status 
          });
        }

        const records = await pb.collection('projects').getList(1, 200, {
          filter,
          sort: '-updated',
          expand: 'company,artist,user',
          requestKey: `fetch-user-projects-${user.id}-${status}-${Date.now()}`,
        });

        logger.debug(`Found ${records.items.length} projects for user ${user.id}`);

        const projects = records.items.map(record =>
          transformProject(record as ProjectWithExpand)
        );
        
        return projects;
      } catch (error) {
        let errorMsg = 'Failed to fetch projects';

        // Handle different types of errors more specifically
        if (error && typeof error === 'object') {
          if ('isAbort' in error && error.isAbort) {
            logger.debug('Project fetch request was aborted');
            return [];
          }

          if ('status' in error && error.status === 0) {
            logger.debug('Project fetch request failed with status 0 (likely cancelled)');
            return [];
          }

          if ('message' in error && error.message && typeof error.message === 'string') {
            errorMsg = error.message;
          }
        }

        logger.error(errorMsg, error);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        return [];
      } finally {
        setLoading(false);
      }
    },
    [toast, user?.id]
  );

  /**
   * Create a new project
   */
  const createProject = useCallback(
    async (formData: ProjectFormValues): Promise<ProjectType | null> => {
      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive',
        });
        return null;
      }

      setLoading(true);
      try {
        logger.debug(`Creating project for user ${user.id}`);

        // Resolve company and artist names to IDs
        let companyId = null;
        let artistId = null;

        if (formData.company) {
          const companyRecord = await pb
            .collection('companies')
            .getFirstListItem(pb.filter('name = {:name} && user = {:userId}', {
              name: formData.company,
              userId: user.id
            }))
            .catch(() => null);
          companyId = companyRecord?.id || null;
        }

        if (formData.artist) {
          const artistRecord = await pb
            .collection('artists')
            .getFirstListItem(pb.filter('name = {:name} && user = {:userId}', {
              name: formData.artist,
              userId: user.id
            }))
            .catch(() => null);
          artistId = artistRecord?.id || null;
        }

        // Prepare project data
        const projectData: Record<string, unknown> = {
          title: formData.title,
          user: user.id,
          company: companyId,
          artist: artistId,
          status: formData.status || 'wishlist',
          kit_category: formData.kit_category || 'full',
          drill_shape: formData.drillShape || null,
          date_purchased: formData.datePurchased || null,
          date_started: formData.dateStarted || null,
          date_completed: formData.dateCompleted || null,
          date_received: formData.dateReceived || null,
          width: formData.width || null,
          height: formData.height || null,
          total_diamonds: formData.totalDiamonds || null,
          general_notes: formData.generalNotes || '',
          source_url: formData.sourceUrl || null,
        };

        // Handle image file if present
        if (formData.imageFile) {
          logger.debug(`Attaching image file: ${formData.imageFile.name}`);
          projectData.image = formData.imageFile;
        }

        const record = await pb.collection('projects').create(projectData) as ProjectWithExpand;

        logger.debug(`Project created successfully: ${record.id}`);
        toast({
          title: 'Success',
          description: 'Project created successfully',
          variant: 'default',
        });

        const project = transformProject(record);
        navigate(`/projects/${project.id}`);
        return project;
      } catch (error) {
        const errorMsg = 'Failed to create project';
        logger.error(errorMsg, error);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [navigate, toast, user?.id]
  );

  /**
   * Update an existing project
   */
  const updateProject = useCallback(
    async (projectId: string, formData: ProjectFormValues): Promise<ProjectType | null> => {
      if (!projectId) {
        toast({
          title: 'Error',
          description: 'Project ID is required',
          variant: 'destructive',
        });
        return null;
      }

      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive',
        });
        return null;
      }

      setLoading(true);
      try {
        logger.debug(`Updating project ${projectId}`);

        // Resolve company and artist names to IDs
        let companyId = null;
        let artistId = null;

        if (formData.company) {
          const companyRecord = await pb
            .collection('companies')
            .getFirstListItem(pb.filter('name = {:name} && user = {:userId}', {
              name: formData.company,
              userId: user.id
            }))
            .catch(() => null);
          companyId = companyRecord?.id || null;
        }

        if (formData.artist) {
          const artistRecord = await pb
            .collection('artists')
            .getFirstListItem(pb.filter('name = {:name} && user = {:userId}', {
              name: formData.artist,
              userId: user.id
            }))
            .catch(() => null);
          artistId = artistRecord?.id || null;
        }

        // Prepare update data (excluding image field initially)
        const updateData: Record<string, unknown> = {
          title: formData.title,
          company: companyId,
          artist: artistId,
          status: formData.status,
          kit_category: formData.kit_category || 'full',
          drill_shape: formData.drillShape || null,
          date_purchased: formData.datePurchased || null,
          date_started: formData.dateStarted || null,
          date_completed: formData.dateCompleted || null,
          date_received: formData.dateReceived || null,
          width: formData.width || null,
          height: formData.height || null,
          total_diamonds: formData.totalDiamonds || null,
          general_notes: formData.generalNotes || '',
          source_url: formData.sourceUrl || null,
        };

        // Handle image upload if a new image is provided
        if (formData.imageFile) {
          logger.debug(`Uploading new image: ${formData.imageFile.name}`);
          updateData.image = formData.imageFile;
        } else if (formData._imageReplacement === true && !formData.imageFile) {
          logger.debug('Image removal requested');
          updateData.image = null; // Remove existing image
        }

        const record = await pb.collection('projects').update(projectId, updateData) as ProjectWithExpand;

        // Handle tag synchronization if tags are provided
        if (formData.tagIds !== undefined) {
          const deduplicatedNewTagIds = Array.from(new Set(formData.tagIds));
          logger.debug(
            `Synchronizing tags for project ${projectId}: ${deduplicatedNewTagIds.join(', ')}`
          );

          // Get current project tags
          const currentProjectTags = await pb.collection('project_tags').getFullList({
            filter: pb.filter('project = {:projectId}', { projectId }),
            requestKey: null,
          });

          // Convert to Sets for efficient diffing
          const currentTagIdsSet = new Set(currentProjectTags.map(pt => pt.tag));
          const newTagIdsSet = new Set(deduplicatedNewTagIds);

          // Determine tags to add and remove
          const tagsToAdd = deduplicatedNewTagIds.filter(tagId => !currentTagIdsSet.has(tagId));
          const tagsToRemove = Array.from(currentTagIdsSet).filter(tagId => !newTagIdsSet.has(tagId));

          // Perform tag operations in parallel
          const removePromises = tagsToRemove.map(async tagId => {
            const projectTagsToRemove = currentProjectTags.filter(pt => pt.tag === tagId);
            const deletePromises = projectTagsToRemove.map(async projectTag => {
              try {
                await pb.collection('project_tags').delete(projectTag.id, {
                  requestKey: null,
                });
                logger.debug(`Removed tag ${tagId} from project ${projectId}`);
              } catch (error) {
                logger.error(`Failed to remove tag ${tagId} from project ${projectId}`, error);
              }
            });
            await Promise.allSettled(deletePromises);
          });

          const addPromises = tagsToAdd.map(async tagId => {
            try {
              await pb.collection('project_tags').create(
                {
                  project: projectId,
                  tag: tagId,
                  user: user.id,
                },
                {
                  requestKey: null,
                }
              );
              logger.debug(`Added tag ${tagId} to project ${projectId}`);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : '';
              const DUPLICATE_CONSTRAINT_ERROR = 'UNIQUE constraint failed';
              if (!errorMessage.includes(DUPLICATE_CONSTRAINT_ERROR)) {
                logger.error(`Failed to add tag ${tagId} to project ${projectId}`, error);
              }
            }
          });

          await Promise.allSettled([...removePromises, ...addPromises]);
        }

        logger.debug(`Project ${projectId} updated successfully`);
        toast({
          title: 'Success',
          description: 'Project updated successfully',
          variant: 'default',
        });

        return transformProject(record);
      } catch (error) {
        const errorMsg = `Failed to update project ${projectId}`;
        logger.error(errorMsg, error);

        let specificError = errorMsg;
        if (error && typeof error === 'object' && 'data' in error) {
          const errorData = (error as Record<string, unknown>).data;
          logger.error('PocketBase validation errors:', errorData);
          specificError = `${errorMsg}: ${JSON.stringify(errorData)}`;
        }

        toast({
          title: 'Error',
          description: specificError,
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast, user?.id]
  );

  /**
   * Update a project's status
   */
  const updateProjectStatus = useCallback(
    async (projectId: string, newStatus: ProjectStatus): Promise<boolean> => {
      if (!projectId) {
        toast({
          title: 'Error',
          description: 'Project ID is required',
          variant: 'destructive',
        });
        return false;
      }

      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive',
        });
        return false;
      }

      setLoading(true);
      try {
        logger.debug(`Updating project ${projectId} status to ${newStatus}`);

        await pb.collection('projects').update(projectId, {
          status: newStatus,
        });

        logger.debug(`Project ${projectId} status updated successfully`);
        toast({
          title: 'Success',
          description: 'Project status updated',
          variant: 'default',
        });

        return true;
      } catch (error) {
        const errorMsg = 'Failed to update project status';
        logger.error(errorMsg, error);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast, user?.id]
  );

  /**
   * Delete a project with proper cascade deletion
   */
  const deleteProject = useCallback(
    async (projectId: string, redirectTo?: string): Promise<boolean> => {
      if (!projectId) {
        toast({
          title: 'Error',
          description: 'Project ID is required',
          variant: 'destructive',
        });
        return false;
      }

      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive',
        });
        return false;
      }

      setLoading(true);
      try {
        logger.debug(`Deleting project ${projectId} with cascade deletion`);

        // Step 1: Delete all progress notes for this project
        try {
          const progressNotes = await pb.collection('progress_notes').getFullList({
            filter: pb.filter('project = {:projectId}', { projectId }),
          });

          logger.debug(
            `Found ${progressNotes.length} progress notes to delete for project ${projectId}`
          );

          for (const note of progressNotes) {
            await pb.collection('progress_notes').delete(note.id);
          }
        } catch (progressNotesError) {
          logger.warn(
            `Error deleting progress notes for project ${projectId}:`,
            progressNotesError
          );
          // Continue with deletion attempt - not all projects have progress notes
        }

        // Step 2: Delete all project-tag associations for this project
        try {
          const projectTags = await pb.collection('project_tags').getFullList({
            filter: pb.filter('project = {:projectId}', { projectId }),
          });

          logger.debug(
            `Found ${projectTags.length} project tags to delete for project ${projectId}`
          );

          for (const projectTag of projectTags) {
            await pb.collection('project_tags').delete(projectTag.id);
          }
        } catch (projectTagsError) {
          logger.warn(`Error deleting project tags for project ${projectId}:`, projectTagsError);
          // Continue with deletion attempt - the project tags might not exist
        }

        // Step 3: Delete the project itself
        await pb.collection('projects').delete(projectId);

        logger.debug(`Project ${projectId} deleted successfully with cascade`);
        toast({
          title: 'Success',
          description: 'Project deleted successfully',
          variant: 'default',
        });

        if (redirectTo) {
          navigate(redirectTo);
        }

        return true;
      } catch (error) {
        const errorMsg = `Failed to delete project ${projectId}`;
        logger.error(errorMsg, error);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [navigate, toast, user?.id]
  );

  /**
   * Fetch available company names
   */
  const fetchCompanyNames = useCallback(async (): Promise<string[]> => {
    if (!user?.id) {
      return [];
    }

    try {
      const records = await pb.collection('companies').getList(1, 200, {
        filter: pb.filter('user = {:userId}', { userId: user.id }),
        sort: 'name',
      });

      const companies = records.items.map(record => record.name);
      return companies;
    } catch (error) {
      const errorMsg = 'Failed to fetch companies';
      logger.error(errorMsg, error);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return [];
    }
  }, [toast, user?.id]);

  /**
   * Fetch available artist names
   */
  const fetchArtistNames = useCallback(async (): Promise<string[]> => {
    if (!user?.id) {
      return [];
    }

    try {
      const records = await pb.collection('artists').getList(1, 200, {
        filter: pb.filter('user = {:userId}', { userId: user.id }),
        sort: 'name',
      });

      const artists = records.items.map(record => record.name);
      return artists;
    } catch (error) {
      const errorMsg = 'Failed to fetch artists';
      logger.error(errorMsg, error);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return [];
    }
  }, [toast, user?.id]);

  return {
    loading,
    fetchProject,
    fetchProjects,
    createProject,
    updateProject,
    updateProjectStatus,
    deleteProject,
    fetchCompanyNames,
    fetchArtistNames,
  };
};
