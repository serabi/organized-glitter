/**
 * Organized Glitter - Diamond Art Project Management
 * Copyright (C) 2025 Sarah Wolff
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { BasePocketBaseService, PocketBaseRecord } from './baseService';
import {
  ProjectsResponse,
  CompaniesResponse,
  ArtistsResponse,
  ProjectTagsResponse,
  TagsResponse,
} from '@/types/pocketbase.types';
import { extractDateOnly } from '@/lib/utils';

// Extended project response with typed expand
interface ProjectWithExpand extends ProjectsResponse {
  expand?: {
    company?: CompaniesResponse;
    artist?: ArtistsResponse;
    user?: PocketBaseRecord;
    project_tags_via_project?: Array<
      ProjectTagsResponse & {
        expand?: {
          tag?: TagsResponse;
        };
      }
    >;
  };
}
import { ProjectType, ProjectFormValues, ProjectStatus } from '@/types/project';
import { requestDebugger } from '@/utils/requestDebugger';
import { ServiceResponse } from '@/types/shared';

export interface ToastHandlers {
  showSuccess?: (message: string) => void;
  showError?: (message: string) => void;
}

export class PocketBaseProjectService extends BasePocketBaseService {
  private readonly COLLECTION = 'projects';

  /**
   * Fetch a single project by ID
   */
  async fetchProject(
    projectId: string,
    toastHandlers?: ToastHandlers
  ): Promise<ServiceResponse<ProjectType>> {
    const requestId = requestDebugger.startRequest('PocketBase-fetchProject', { projectId });

    try {
      if (!this.checkAuth()) {
        const error = 'User not authenticated';
        toastHandlers?.showError?.(error);
        requestDebugger.errorRequest(requestId, error);
        return this.createErrorResponse(error);
      }

      this.logger.debug(`Fetching project ${projectId}`);

      const record = (await this.pb.collection(this.COLLECTION).getOne(projectId, {
        expand: 'company,artist,user,project_tags_via_project.tag',
        requestKey: `fetch-project-${projectId}-${Date.now()}`,
      })) as ProjectWithExpand;

      this.logger.debug(`Project ${projectId} fetched successfully`);
      toastHandlers?.showSuccess?.('Project loaded successfully');

      requestDebugger.completeRequest(requestId, { projectId });
      return this.createSuccessResponse(this.transformProject(record));
    } catch (error) {
      const errorMsg = `Failed to fetch project ${projectId}`;
      this.logger.error(errorMsg, error);
      toastHandlers?.showError?.(errorMsg);
      requestDebugger.errorRequest(requestId, error);
      return this.createErrorResponse(errorMsg);
    }
  }

  /**
   * Fetch projects for the current user
   */
  async fetchProjects(
    status?: ProjectStatus | 'all',
    userId?: string
  ): Promise<ServiceResponse<ProjectType[]>> {
    const requestId = requestDebugger.startRequest('PocketBase-fetchUserProjects', {
      userId: userId || 'current',
      status,
    });

    try {
      const currentUserId = userId || this.getCurrentUserId();
      if (!currentUserId) {
        const error = 'User not authenticated';
        requestDebugger.errorRequest(requestId, error);
        return this.createErrorResponse(error);
      }

      this.logger.debug(`Fetching projects for user ${currentUserId}, status: ${status}`);

      // Build filter
      let filter = `user = "${currentUserId}"`;
      if (status && status !== 'all') {
        filter += ` && status = "${status}"`;
      }

      const records = await this.pb.collection(this.COLLECTION).getList(1, 200, {
        filter,
        sort: '-updated',
        expand: 'company,artist,user',
        requestKey: `fetch-user-projects-${currentUserId}-${status}-${Date.now()}`,
      });

      this.logger.debug(`Found ${records.items.length} projects for user ${currentUserId}`);

      const projects = records.items.map(record =>
        this.transformProject(record as ProjectWithExpand)
      );
      requestDebugger.completeRequest(requestId, { projectsCount: projects.length });
      return this.createSuccessResponse(projects);
    } catch (error) {
      // Handle different types of errors more specifically
      let errorMsg = 'Failed to fetch projects';

      if (error && typeof error === 'object') {
        // Check for aborted requests (network issues, component unmounting, etc.)
        if ('isAbort' in error && error.isAbort) {
          this.logger.debug('Project fetch request was aborted');
          requestDebugger.abortRequest(requestId, 'Request aborted');
          return this.createErrorResponse('Request aborted');
        }

        // Check for status 0 (typically network issues or cancelled requests)
        if ('status' in error && error.status === 0) {
          this.logger.debug('Project fetch request failed with status 0 (likely cancelled)');
          requestDebugger.abortRequest(requestId, 'Request cancelled or network unavailable');
          return this.createErrorResponse('Request cancelled or network unavailable');
        }

        // Extract meaningful error messages
        if ('message' in error && error.message && typeof error.message === 'string') {
          errorMsg = error.message;
        } else if (
          'data' in error &&
          error.data &&
          typeof error.data === 'object' &&
          'message' in error.data &&
          typeof error.data.message === 'string'
        ) {
          errorMsg = error.data.message;
        }
      }

      this.logger.error(errorMsg, error);
      requestDebugger.errorRequest(requestId, error);
      return this.createErrorResponse(errorMsg);
    }
  }

  /**
   * Alias for fetchProjects for backward compatibility
   */
  async fetchUserProjects(
    userId?: string,
    status?: ProjectStatus | 'all'
  ): Promise<ServiceResponse<ProjectType[]>> {
    return this.fetchProjects(status, userId);
  }

  /**
   * Create a new project
   */
  async createProject(
    formData: ProjectFormValues,
    userId?: string,
    toastHandlers?: ToastHandlers
  ): Promise<ServiceResponse<ProjectType>> {
    try {
      const currentUserId = userId || this.getCurrentUserId();
      if (!currentUserId) {
        const error = 'User not authenticated';
        toastHandlers?.showError?.(error);
        return this.createErrorResponse(error);
      }

      this.logger.debug(`Creating project for user ${currentUserId}`);

      // Resolve company and artist names to IDs
      let companyId = null;
      let artistId = null;

      if (formData.company) {
        const companyRecord = await this.pb
          .collection('companies')
          .getFirstListItem(`name = "${formData.company}" && user = "${currentUserId}"`)
          .catch(() => null);
        companyId = companyRecord?.id || null;
      }

      if (formData.artist) {
        const artistRecord = await this.pb
          .collection('artists')
          .getFirstListItem(`name = "${formData.artist}" && user = "${currentUserId}"`)
          .catch(() => null);
        artistId = artistRecord?.id || null;
      }

      // Prepare project data
      const projectData: Record<string, unknown> = {
        title: formData.title,
        user: currentUserId,
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
        this.logger.debug(`Attaching image file: ${formData.imageFile.name}`);
        projectData.image = formData.imageFile;
      }

      const record = (await this.pb
        .collection(this.COLLECTION)
        .create(projectData)) as ProjectWithExpand;

      this.logger.debug(`Project created successfully: ${record.id}`);
      toastHandlers?.showSuccess?.('Project created successfully');

      return this.createSuccessResponse(this.transformProject(record));
    } catch (error) {
      const errorMsg = 'Failed to create project';
      this.logger.error(errorMsg, error);
      toastHandlers?.showError?.(errorMsg);
      return this.createErrorResponse(errorMsg);
    }
  }

  /**
   * Update an existing project with optional tag synchronization
   * @param projectId - The ID of the project to update
   * @param formData - The project form data including potential tagIds
   * @param toastHandlers - Optional toast handlers for user feedback
   * @returns Promise resolving to service response with updated project
   */
  async updateProject(
    projectId: string,
    formData: ProjectFormValues,
    toastHandlers?: ToastHandlers
  ): Promise<ServiceResponse<ProjectType>> {
    try {
      if (!this.checkAuth()) {
        const error = 'User not authenticated';
        toastHandlers?.showError?.(error);
        return this.createErrorResponse(error);
      }

      const currentUserId = this.getCurrentUserId();
      if (!currentUserId) {
        const error = 'User not authenticated';
        toastHandlers?.showError?.(error);
        return this.createErrorResponse(error);
      }

      this.logger.debug(`Updating project ${projectId}`);
      console.log('formData received in updateProject:', JSON.stringify(formData, null, 2));

      // Resolve company and artist names to IDs
      let companyId = null;
      let artistId = null;

      if (formData.company) {
        const companyRecord = await this.pb
          .collection('companies')
          .getFirstListItem(`name = "${formData.company}" && user = "${currentUserId}"`)
          .catch(() => null);
        companyId = companyRecord?.id || null;
      }

      if (formData.artist) {
        const artistRecord = await this.pb
          .collection('artists')
          .getFirstListItem(`name = "${formData.artist}" && user = "${currentUserId}"`)
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
        this.logger.debug(`Uploading new image: ${formData.imageFile.name}`);
        try {
          // For PocketBase file fields, pass the File object directly
          updateData.image = formData.imageFile;
          this.logger.debug(`Image file attached for upload`);
        } catch (error) {
          const errorMsg = 'Image preparation failed';
          this.logger.error(errorMsg, error);
          toastHandlers?.showError?.(errorMsg);
          return this.createErrorResponse(errorMsg);
        }
      } else if (formData._imageReplacement === true && !formData.imageFile) {
        this.logger.debug('Image removal requested');
        updateData.image = null; // Remove existing image
      }
      // If no new image and no removal requested, omit the image field entirely

      console.log('Data being sent to PocketBase for update:', JSON.stringify(updateData, null, 2));
      const record = (await this.pb
        .collection(this.COLLECTION)
        .update(projectId, updateData)) as ProjectWithExpand;

      // Handle tag synchronization if tags are provided
      if (formData.tagIds !== undefined) {
        // Deduplicate newTagIds to prevent multiple create calls for the same tag
        const deduplicatedNewTagIds = Array.from(new Set(formData.tagIds));
        this.logger.debug(
          `Synchronizing tags for project ${projectId}: ${deduplicatedNewTagIds.join(', ')}`
        );

        // Get current project tags
        const currentProjectTags = await this.pb.collection('project_tags').getFullList({
          filter: `project = "${projectId}"`,
          requestKey: null, // Prevent auto-cancellation
        });

        // Convert to Sets for efficient linear-time diffing
        const currentTagIdsSet = new Set(currentProjectTags.map(pt => pt.tag));
        const newTagIdsSet = new Set(deduplicatedNewTagIds);

        // Determine tags to add and remove using Set operations
        const tagsToAdd = deduplicatedNewTagIds.filter(tagId => !currentTagIdsSet.has(tagId));
        const tagsToRemove = Array.from(currentTagIdsSet).filter(tagId => !newTagIdsSet.has(tagId));

        // Perform tag operations in parallel for better performance
        const removePromises = tagsToRemove.map(async tagId => {
          // Handle all matching duplicates by filtering instead of using find
          const projectTagsToRemove = currentProjectTags.filter(pt => pt.tag === tagId);

          const deletePromises = projectTagsToRemove.map(async projectTag => {
            try {
              await this.pb.collection('project_tags').delete(projectTag.id, {
                requestKey: null, // Prevent auto-cancellation
              });
              this.logger.debug(
                `Removed tag ${tagId} from project ${projectId} (record ${projectTag.id})`
              );
            } catch (error) {
              this.logger.error(
                `Failed to remove tag ${tagId} from project ${projectId} (record ${projectTag.id})`,
                error
              );
              // Don't throw - continue with other operations
            }
          });

          // Wait for all deletes of this tag to complete
          await Promise.allSettled(deletePromises);
        });

        const addPromises = tagsToAdd.map(async tagId => {
          try {
            await this.pb.collection('project_tags').create(
              {
                project: projectId,
                tag: tagId,
                user: currentUserId,
              },
              {
                requestKey: null, // Prevent auto-cancellation
              }
            );
            this.logger.debug(`Added tag ${tagId} to project ${projectId}`);
          } catch (error) {
            // Check if it's a duplicate error (tag already exists)
            const errorMessage = error instanceof Error ? error.message : '';
            const DUPLICATE_CONSTRAINT_ERROR = 'UNIQUE constraint failed';
            if (!errorMessage.includes(DUPLICATE_CONSTRAINT_ERROR)) {
              this.logger.error(`Failed to add tag ${tagId} to project ${projectId}`, error);
            }
            // Don't throw - continue with other operations
          }
        });

        // Execute all operations in parallel and wait for completion
        await Promise.allSettled([...removePromises, ...addPromises]);
      }

      this.logger.debug(`Project ${projectId} updated successfully`);
      toastHandlers?.showSuccess?.('Project updated successfully');

      return this.createSuccessResponse(this.transformProject(record));
    } catch (error) {
      const errorMsg = `Failed to update project ${projectId}`;
      this.logger.error(errorMsg, error);
      console.error('PocketBase update error details:', error);

      // Try to extract more specific error information from PocketBase
      let specificError = errorMsg;
      if (error && typeof error === 'object' && 'data' in error) {
        const errorData = (error as Record<string, unknown>).data;
        console.error('PocketBase validation errors:', errorData);
        specificError = `${errorMsg}: ${JSON.stringify(errorData)}`;
      }

      toastHandlers?.showError?.(specificError);
      return this.createErrorResponse(specificError);
    }
  }

  /**
   * Delete a project with proper cascade deletion
   */
  async deleteProject(
    projectId: string,
    toastHandlers?: ToastHandlers
  ): Promise<ServiceResponse<boolean>> {
    try {
      if (!this.checkAuth()) {
        const error = 'User not authenticated';
        toastHandlers?.showError?.(error);
        return this.createErrorResponse(error);
      }

      this.logger.debug(`Deleting project ${projectId} with cascade deletion`);

      // Step 1: Delete all progress notes for this project
      try {
        const progressNotes = await this.pb.collection('progress_notes').getFullList({
          filter: `project = "${projectId}"`,
        });

        this.logger.debug(
          `Found ${progressNotes.length} progress notes to delete for project ${projectId}`
        );

        for (const note of progressNotes) {
          await this.pb.collection('progress_notes').delete(note.id);
        }
      } catch (progressNotesError) {
        this.logger.warn(
          `Error deleting progress notes for project ${projectId}:`,
          progressNotesError
        );
        // Continue with deletion attempt - not all projects have progress notes
      }

      // Step 2: Delete all project-tag associations for this project
      try {
        const projectTags = await this.pb.collection('project_tags').getFullList({
          filter: `project = "${projectId}"`,
        });

        this.logger.debug(
          `Found ${projectTags.length} project tags to delete for project ${projectId}`
        );

        for (const projectTag of projectTags) {
          await this.pb.collection('project_tags').delete(projectTag.id);
        }
      } catch (projectTagsError) {
        this.logger.warn(`Error deleting project tags for project ${projectId}:`, projectTagsError);
        // Continue with deletion attempt - the project tags might not exist
      }

      // Step 3: Delete the project itself
      await this.pb.collection(this.COLLECTION).delete(projectId);

      this.logger.debug(`Project ${projectId} deleted successfully with cascade`);
      toastHandlers?.showSuccess?.('Project deleted successfully');

      return this.createSuccessResponse(true);
    } catch (error) {
      const errorMsg = `Failed to delete project ${projectId}`;
      this.logger.error(errorMsg, error);
      toastHandlers?.showError?.(errorMsg);
      return this.createErrorResponse(errorMsg);
    }
  }

  /**
   * Update project status
   */
  async updateProjectStatus(
    projectId: string,
    newStatus: ProjectStatus,
    toastHandlers?: ToastHandlers
  ): Promise<ServiceResponse<ProjectType>> {
    try {
      if (!this.checkAuth()) {
        const error = 'User not authenticated';
        toastHandlers?.showError?.(error);
        return this.createErrorResponse(error);
      }

      this.logger.debug(`Updating project ${projectId} status to ${newStatus}`);

      const record = (await this.pb.collection(this.COLLECTION).update(projectId, {
        status: newStatus,
      })) as ProjectWithExpand;

      this.logger.debug(`Project ${projectId} status updated successfully`);
      toastHandlers?.showSuccess?.('Project status updated');

      return this.createSuccessResponse(this.transformProject(record));
    } catch (error) {
      const errorMsg = `Failed to update project status`;
      this.logger.error(errorMsg, error);
      toastHandlers?.showError?.(errorMsg);
      return this.createErrorResponse(errorMsg);
    }
  }

  /**
   * Fetch company names for dropdowns
   */
  async fetchCompanyNames(
    toastHandlers?: ToastHandlers
  ): Promise<ServiceResponse<Array<{ id: string; name: string }>>> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        return this.createErrorResponse('User not authenticated');
      }

      const records = await this.pb.collection('companies').getList(1, 200, {
        filter: `user = "${userId}"`,
        sort: 'name',
      });

      const companies = records.items.map(record => ({
        id: record.id,
        name: record.name,
      }));

      return this.createSuccessResponse(companies);
    } catch (error) {
      const errorMsg = 'Failed to fetch companies';
      this.logger.error(errorMsg, error);
      toastHandlers?.showError?.(errorMsg);
      return this.createErrorResponse(errorMsg);
    }
  }

  /**
   * Fetch artist names for dropdowns
   */
  async fetchArtistNames(
    toastHandlers?: ToastHandlers
  ): Promise<ServiceResponse<Array<{ id: string; name: string }>>> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        return this.createErrorResponse('User not authenticated');
      }

      const records = await this.pb.collection('artists').getList(1, 200, {
        filter: `user = "${userId}"`,
        sort: 'name',
      });

      const artists = records.items.map(record => ({
        id: record.id,
        name: record.name,
      }));

      return this.createSuccessResponse(artists);
    } catch (error) {
      const errorMsg = 'Failed to fetch artists';
      this.logger.error(errorMsg, error);
      toastHandlers?.showError?.(errorMsg);
      return this.createErrorResponse(errorMsg);
    }
  }

  /**
   * Transform PocketBase record to ProjectType
   */
  private transformProject(record: ProjectWithExpand): ProjectType {
    // Extract tags from expanded data
    let tags: Array<{
      id: string;
      userId: string;
      name: string;
      slug: string;
      color: string;
      createdAt: string;
      updatedAt: string;
    }> = [];

    const projectTagsExpand = record.expand?.['project_tags_via_project'];
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

    return {
      id: record.id,
      title: record.title,
      userId: record.user,
      company: record.expand?.company?.name || '',
      artist: record.expand?.artist?.name || '',
      status: record.status as ProjectStatus,
      kit_category: record.kit_category || undefined,
      drillShape: record.drill_shape || undefined,
      datePurchased: extractDateOnly(record.date_purchased), // Important for ommitting the time
      dateStarted: extractDateOnly(record.date_started),
      dateCompleted: extractDateOnly(record.date_completed),
      dateReceived: extractDateOnly(record.date_received),
      width: record.width || undefined,
      height: record.height || undefined,
      totalDiamonds: record.total_diamonds || undefined,
      generalNotes: record.general_notes || '',
      imageUrl: record.image ? this.pb.files.getURL(record, record.image) : undefined,
      sourceUrl: record.source_url || undefined,
      createdAt: record.created || '',
      updatedAt: record.updated || '',
      // Additional fields for compatibility
      progressNotes: [],
      progressImages: [],
      tags: tags,
    };
  }
}

// Create and export a singleton instance
export const projectService = new PocketBaseProjectService();
