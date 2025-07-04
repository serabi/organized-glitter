/**
 * @fileoverview Tag Service for PocketBase Integration
 *
 * Comprehensive service layer for managing tags and project-tag relationships.
 * Uses secure FilterBuilder utility for all PocketBase queries to prevent SQL injection.
 * Features user-scoped data access, tag creation, project association, and bulk operations.
 *
 * Security Features:
 * - All queries use secure parameterized filtering
 * - User-scoped data access ensures isolation
 * - Authentication validation for all operations
 * - SQL injection prevention through FilterBuilder utility
 *
 * @author Generated with Claude Code
 * @version 1.0.0
 * @since 2024-06-29
 */

import { pb } from '@/lib/pocketbase';
import { Tag, TagFormValues, TagFilterOptions } from '@/types/tag';
import { ServiceResponse, createSuccessResponse, createErrorResponse } from '@/types/shared';
import { TAG_COLOR_PALETTE } from '@/utils/tagColors';
import { Collections, ProjectTagsResponse, TagsResponse } from '@/types/pocketbase.types';
import { withAuthentication } from '@/lib/tagAuth';
import { createFilter } from '@/utils/filterBuilder';
import { createLogger } from '@/utils/secureLogger';
import { generateSlug } from '@/utils/slugify';

const logger = createLogger('TagService');

/**
 * Extract hex colors from the centralized color palette for random tag assignment
 */
const TAG_COLORS = TAG_COLOR_PALETTE.map(color => color.hex);

/**
 * Transform PocketBase tag record to frontend Tag format
 *
 * Converts a PocketBase TagsResponse record to the standardized Tag interface
 * used throughout the frontend application. Normalizes field names and ensures
 * consistent data structure for UI components.
 *
 * @function
 * @param {TagsResponse} pbTag - Raw tag record from PocketBase
 * @returns {Tag} Normalized tag object for frontend use
 */
const transformPbTagToTag = (pbTag: TagsResponse): Tag => ({
  id: pbTag.id,
  userId: pbTag.user,
  name: pbTag.name,
  slug: pbTag.slug,
  color: pbTag.color,
  createdAt: pbTag.created,
  updatedAt: pbTag.updated,
});

/**
 * TagService - Comprehensive tag management for PocketBase
 *
 * Provides secure, user-scoped tag operations including CRUD operations,
 * project associations, and bulk statistics. All methods use authenticated
 * requests and secure parameter injection to prevent security vulnerabilities.
 *
 * @class TagService
 */
export class TagService {
  /**
   * Get all user's tags with optional filtering
   */
  static async getUserTags(options: TagFilterOptions = {}): Promise<ServiceResponse<Tag[]>> {
    return withAuthentication(async (userId: string) => {
      try {
        const filterBuilder = createFilter().userScope(userId);
        if (options.search) {
          filterBuilder.like('name', options.search);
        }
        const filter = filterBuilder.build();

        const records = await pb.collection(Collections.Tags).getList(1, 200, {
          filter,
          sort: 'name',
        });

        // Transform PocketBase records to frontend format
        const tags = records.items.map(transformPbTagToTag);
        return createSuccessResponse(tags);
      } catch (error) {
        return createErrorResponse(error as Error);
      }
    });
  }

<<<<<<< HEAD
=======

>>>>>>> main
  /**
   * Create new tag with secure validation
   */
  static async createTag(tagData: TagFormValues): Promise<ServiceResponse<Tag>> {
    return withAuthentication(async (userId: string) => {
      try {
        const trimmedName = tagData.name.trim();

        // Check for existing tag with the same name for this user
        try {
          const existingTags = await pb.collection(Collections.Tags).getList(1, 1, {
            filter: pb.filter('user = {:userId} && name = {:name}', { userId, name: trimmedName }),
          });

          if (existingTags.items.length > 0) {
            return createErrorResponse(new Error(`A tag named "${trimmedName}" already exists`));
          }
        } catch (error) {
          logger.error('Error checking for existing tag:', error);
          return createErrorResponse(new Error('Failed to check for existing tags'));
        }

        // Generate slug client-side using shared utility
        const slug = generateSlug(trimmedName);

        // Assign random color if not provided
        const color = tagData.color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

        const newTag = await pb.collection(Collections.Tags).create({
          user: userId,
          name: trimmedName,
          slug: slug,
          color,
        });

        if (!newTag) {
          logger.error('No tag data returned after creation');
          return createErrorResponse(new Error('Failed to retrieve tag data after creation'));
        }

        const tag = transformPbTagToTag(newTag);
        return createSuccessResponse(tag);
      } catch (error) {
        logger.error('Unexpected error during tag creation:', error);

        // Check if it's a duplicate error
        if (error instanceof Error && error.message.includes('duplicate')) {
          return createErrorResponse(
            new Error(`A tag named "${tagData.name.trim()}" already exists`)
          );
        }

        return createErrorResponse(error as Error);
      }
    });
  }

  /**
   * Get tags for specific project with security validation
   */
  static async getProjectTags(projectId: string): Promise<ServiceResponse<Tag[]>> {
    logger.debug('Attempting to fetch tags for project:', { projectId });
    return withAuthentication(async (userId: string) => {
      try {
        // Verify the current user has access to this project
        try {
          const project = await pb.collection(Collections.Projects).getOne(projectId, {
            fields: 'id,user',
          });

          if (project.user !== userId) {
            return createErrorResponse(new Error('Unauthorized access to project'));
          }
        } catch (error) {
          logger.error('Error verifying project access:', error);
          return createErrorResponse(new Error('Project not found or access denied'));
        }

        // Get project tags with expanded tag data
        interface ProjectTagWithExpand extends ProjectTagsResponse {
          expand?: {
            tag?: TagsResponse;
          };
        }

        const projectTags = await pb
          .collection(Collections.ProjectTags)
          .getList<ProjectTagWithExpand>(1, 200, {
            filter: pb.filter('project = {:projectId}', { projectId }),
            expand: 'tag',
          });

        const tags: Tag[] = [];
        projectTags.items.forEach(pt => {
          if (pt.expand?.tag) {
            tags.push(transformPbTagToTag(pt.expand.tag));
          }
        });

        logger.debug('Successfully fetched tags for project:', {
          projectId,
          tagCount: tags.length,
        });
        return createSuccessResponse(tags);
      } catch (error) {
        logger.error('Error fetching project tags:', error);
        return createErrorResponse(error as Error);
      }
    });
  }

  /**
   * Update tag with secure validation and duplicate checking
   */
  static async updateTag(
    tagId: string,
    updates: Partial<TagFormValues>
  ): Promise<ServiceResponse<Tag>> {
    return withAuthentication(async (userId: string) => {
      try {
        // Verify the tag belongs to the current user
        try {
          const existingTag = await pb.collection(Collections.Tags).getOne(tagId, {
            fields: 'id,user',
          });

          if (existingTag.user !== userId) {
            return createErrorResponse(new Error('Unauthorized access to tag'));
          }
        } catch (error) {
          return createErrorResponse(new Error('Tag not found or access denied'));
        }

        const updateData: Partial<{ name: string; slug: string; color: string }> = {};

        if (updates.name !== undefined) {
          const trimmedName = updates.name.trim();

          // Check for existing tag with the same name for this user (excluding current tag)
          try {
            const existingTags = await pb.collection(Collections.Tags).getList(1, 1, {
              filter: pb.filter('user = {:userId} && name = {:name} && id != {:tagId}', {
                userId,
                name: trimmedName,
                tagId,
              }),
            });

            if (existingTags.items.length > 0) {
              return createErrorResponse(new Error(`A tag named "${trimmedName}" already exists`));
            }
          } catch (error) {
            logger.error('Error checking for existing tag during update:', error);
            return createErrorResponse(new Error('Failed to check for existing tags'));
          }

          updateData.name = trimmedName;
          updateData.slug = generateSlug(trimmedName);
        }

        if (updates.color !== undefined) {
          updateData.color = updates.color;
        }

        const updatedTag = await pb.collection(Collections.Tags).update(tagId, updateData);

        const tag = transformPbTagToTag(updatedTag);
        return createSuccessResponse(tag);
      } catch (error) {
        logger.error('Error updating tag:', error);

        // Check if it's a duplicate error
        if (error instanceof Error && error.message.includes('duplicate')) {
          const tagName = updates.name?.trim() || 'this tag';
          return createErrorResponse(new Error(`A tag named "${tagName}" already exists`));
        }

        return createErrorResponse(error as Error);
      }
    });
  }

  /**
   * Delete tag and all associated project relationships
   */
  static async deleteTag(tagId: string): Promise<ServiceResponse<void>> {
    return withAuthentication(async (userId: string) => {
      try {
        // Verify the tag belongs to the current user
        try {
          const existingTag = await pb.collection(Collections.Tags).getOne(tagId, {
            fields: 'id,user',
          });

          if (existingTag.user !== userId) {
            return createErrorResponse(new Error('Unauthorized access to tag'));
          }
        } catch (error) {
          return createErrorResponse(new Error('Tag not found or access denied'));
        }

        // Delete all project_tag relationships first
        const projectTags = await pb.collection(Collections.ProjectTags).getList(1, 1000, {
          filter: pb.filter('tag = {:tagId}', { tagId }),
        });

        for (const pt of projectTags.items) {
          await pb.collection(Collections.ProjectTags).delete(pt.id);
        }

        // Delete the tag
        await pb.collection(Collections.Tags).delete(tagId);

        return createSuccessResponse(undefined);
      } catch (error) {
        logger.error('Error deleting tag:', error);
        return createErrorResponse(error as Error);
      }
    });
  }

  /**
   * Add tag to project with security validation
   */
  static async addTagToProject(projectId: string, tagId: string): Promise<ServiceResponse<void>> {
    return withAuthentication(async (userId: string) => {
      try {
        // Verify both project and tag belong to the current user
        const [project, tag] = await Promise.all([
          pb.collection(Collections.Projects).getOne(projectId, { fields: 'id,user' }),
          pb.collection(Collections.Tags).getOne(tagId, { fields: 'id,user' }),
        ]);

        if (project.user !== userId || tag.user !== userId) {
          return createErrorResponse(new Error('Unauthorized access'));
        }

        // Check if relationship already exists
        const existing = await pb.collection(Collections.ProjectTags).getList(1, 1, {
          filter: pb.filter('project = {:projectId} && tag = {:tagId}', { projectId, tagId }),
        });

        if (existing.items.length === 0) {
          // Use a unique request key to prevent auto-cancellation
          const requestKey = `add-tag-${projectId}-${tagId}`;
          await pb.collection(Collections.ProjectTags).create(
            {
              project: projectId,
              tag: tagId,
            },
            { requestKey }
          );
        }

        return createSuccessResponse(undefined);
      } catch (error) {
        logger.error('Error adding tag to project:', error);
        return createErrorResponse(error as Error);
      }
    });
  }

  /**
   * Remove tag from project with security validation
   */
  static async removeTagFromProject(
    projectId: string,
    tagId: string
  ): Promise<ServiceResponse<void>> {
    return withAuthentication(async (userId: string) => {
      try {
        // Verify both project and tag belong to the current user
        const [project, tag] = await Promise.all([
          pb.collection(Collections.Projects).getOne(projectId, { fields: 'id,user' }),
          pb.collection(Collections.Tags).getOne(tagId, { fields: 'id,user' }),
        ]);

        if (project.user !== userId || tag.user !== userId) {
          return createErrorResponse(new Error('Unauthorized access'));
        }

        // Find and delete the project_tag relationship
        const projectTags = await pb.collection(Collections.ProjectTags).getList(1, 1, {
          filter: pb.filter('project = {:projectId} && tag = {:tagId}', { projectId, tagId }),
        });

        if (projectTags.items.length > 0) {
          // Use a unique request key to prevent auto-cancellation
          const requestKey = `remove-tag-${projectId}-${tagId}`;
          await pb
            .collection(Collections.ProjectTags)
            .delete(projectTags.items[0].id, { requestKey });
        }

        return createSuccessResponse(undefined);
      } catch (error) {
        logger.error('Error removing tag from project:', error);
        return createErrorResponse(error as Error);
      }
    });
  }

  /**
   * Get tag statistics including project count
   */
  static async getTagStats(tagId: string): Promise<ServiceResponse<{ projectCount: number }>> {
    return withAuthentication(async (userId: string) => {
      try {
        // Verify the tag belongs to the current user
        try {
          const tag = await pb.collection(Collections.Tags).getOne(tagId, {
            fields: 'id,user',
          });

          if (tag.user !== userId) {
            return createErrorResponse(new Error('Unauthorized access to tag'));
          }
        } catch (error) {
          return createErrorResponse(new Error('Tag not found or access denied'));
        }

        // Count projects using this tag
        const projectTags = await pb.collection(Collections.ProjectTags).getList(1, 1, {
          filter: pb.filter('tag = {:tagId}', { tagId }),
          fields: 'id',
        });

        return createSuccessResponse({ projectCount: projectTags.totalItems });
      } catch (error) {
        logger.error('Error getting tag stats:', error);
        return createErrorResponse(error as Error);
      }
    });
  }

  /**
   * Get bulk tag statistics using reverse expansion for performance
   */
  static async getBulkTagStats(tagIds: string[]): Promise<ServiceResponse<Record<string, number>>> {
    logger.debug('Starting bulk tag stats with reverse expansion:', { tagIds });

    return withAuthentication(async (userId: string) => {
      try {
        if (tagIds.length === 0) {
          logger.debug('No tag IDs provided, returning empty results');
          return createSuccessResponse({});
        }

        // Initialize counts to 0 for all tags
        const counts: Record<string, number> = {};
        tagIds.forEach(tagId => {
          counts[tagId] = 0;
        });

        // Use reverse expansion from projects to get tag usage counts
        // This avoids the API rules issue with project_tags collection
        logger.debug('Using reverse expansion from projects collection');

        interface ProjectWithTagsExpansion {
          id: string;
          expand?: {
            project_tags_via_project?: Array<{
              id: string;
              tag: string;
            }>;
          };
        }

        const projects = await pb
          .collection(Collections.Projects)
          .getFullList<ProjectWithTagsExpansion>({
            filter: pb.filter('user = {:userId}', { userId }),
            expand: 'project_tags_via_project',
            fields: 'id,expand.project_tags_via_project.tag',
            requestKey: `bulk-tag-stats-expansion-${userId}`,
          });

        logger.debug('Found projects with tag relationships:', { projectCount: projects.length });

        // Count tag usage across all projects
        projects.forEach(project => {
          if (project.expand?.project_tags_via_project) {
            project.expand.project_tags_via_project.forEach(projectTag => {
              if (projectTag.tag && Object.prototype.hasOwnProperty.call(counts, projectTag.tag)) {
                counts[projectTag.tag]++;
              }
            });
          }
        });

        logger.debug('Final counts using reverse expansion:', { counts });
        return createSuccessResponse(counts);
      } catch (error) {
        logger.warn('Reverse expansion failed, falling back to individual queries:', error);

        // Fallback to individual queries if reverse expansion fails
        try {
          const counts: Record<string, number> = {};
          tagIds.forEach(tagId => {
            counts[tagId] = 0;
          });

          for (const tagId of tagIds) {
            try {
              const result = await this.getTagStats(tagId);
              if (result.status === 'success') {
                counts[tagId] = result.data.projectCount;
                logger.debug('Fallback: Tag stats retrieved:', {
                  tagId,
                  projectCount: counts[tagId],
                });
              }
            } catch (individualError) {
              logger.warn('Error counting projects for tag:', { tagId, error: individualError });
              // Keep count at 0 for this tag
            }
          }

          logger.debug('Fallback individual queries completed:', { counts });
          return createSuccessResponse(counts);
        } catch (fallbackError) {
          logger.error('Both reverse expansion and fallback failed:', fallbackError);
          return createErrorResponse(fallbackError as Error);
        }
      }
    });
  }
}
