import { pb } from '@/lib/pocketbase';
import { Tag, TagFormValues, TagFilterOptions } from '@/types/tag';
import { ServiceResponse, createSuccessResponse, createErrorResponse } from '@/types/shared';
import { TAG_COLOR_PALETTE } from '@/utils/tagColors';
import { Collections, ProjectTagsResponse, TagsResponse } from '@/types/pocketbase.types';
import { withAuthentication } from '@/lib/tagAuth';

// Extract hex colors from the centralized color palette
const TAG_COLORS = TAG_COLOR_PALETTE.map(color => color.hex);

// Transform PocketBase tag to frontend format
const transformPbTagToTag = (pbTag: TagsResponse): Tag => ({
  id: pbTag.id,
  userId: pbTag.user,
  name: pbTag.name,
  slug: pbTag.slug,
  color: pbTag.color,
  createdAt: pbTag.created,
  updatedAt: pbTag.updated,
});

export class TagService {
  // Get all user's tags
  static async getUserTags(options: TagFilterOptions = {}): Promise<ServiceResponse<Tag[]>> {
    return withAuthentication(async (userId: string) => {
      try {
        let filter = pb.filter('user = {:userId}', { userId });
        if (options.search) {
          filter += pb.filter(' && name ~ {:search}', { search: options.search });
        }

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

  // Generate slug from tag name
  private static generateSlug(tagName: string): string {
    return tagName
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  // Create new tag
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
          console.error('[TagService.createTag] Error checking for existing tag:', error);
          return createErrorResponse(new Error('Failed to check for existing tags'));
        }

        // Generate slug client-side
        const slug = this.generateSlug(trimmedName);

        // Assign random color if not provided
        const color = tagData.color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

        const newTag = await pb.collection(Collections.Tags).create({
          user: userId,
          name: trimmedName,
          slug: slug,
          color,
        });

        if (!newTag) {
          console.error('[TagService.createTag] No tag data returned after creation');
          return createErrorResponse(new Error('Failed to retrieve tag data after creation'));
        }

        const tag = transformPbTagToTag(newTag);
        return createSuccessResponse(tag);
      } catch (error) {
        console.error('[TagService.createTag] Unexpected error:', error);

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

  // Get tags for specific project
  static async getProjectTags(projectId: string): Promise<ServiceResponse<Tag[]>> {
    console.log(`[TagService.getProjectTags] Attempting to fetch tags for projectId: ${projectId}`);
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
          console.error('[TagService.getProjectTags] Error verifying project access:', error);
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

        console.log(
          `[TagService.getProjectTags] Successfully fetched ${tags.length} tags for project ${projectId}`
        );
        return createSuccessResponse(tags);
      } catch (error) {
        console.error('[TagService.getProjectTags] Error:', error);
        return createErrorResponse(error as Error);
      }
    });
  }

  // Update tag
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
            console.error('[TagService.updateTag] Error checking for existing tag:', error);
            return createErrorResponse(new Error('Failed to check for existing tags'));
          }

          updateData.name = trimmedName;
          updateData.slug = this.generateSlug(trimmedName);
        }

        if (updates.color !== undefined) {
          updateData.color = updates.color;
        }

        const updatedTag = await pb.collection(Collections.Tags).update(tagId, updateData);

        const tag = transformPbTagToTag(updatedTag);
        return createSuccessResponse(tag);
      } catch (error) {
        console.error('[TagService.updateTag] Error:', error);

        // Check if it's a duplicate error
        if (error instanceof Error && error.message.includes('duplicate')) {
          const tagName = updates.name?.trim() || 'this tag';
          return createErrorResponse(new Error(`A tag named "${tagName}" already exists`));
        }

        return createErrorResponse(error as Error);
      }
    });
  }

  // Delete tag
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
        console.error('[TagService.deleteTag] Error:', error);
        return createErrorResponse(error as Error);
      }
    });
  }

  // Add tag to project
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
        console.error('[TagService.addTagToProject] Error:', error);
        return createErrorResponse(error as Error);
      }
    });
  }

  // Remove tag from project
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
        console.error('[TagService.removeTagFromProject] Error:', error);
        return createErrorResponse(error as Error);
      }
    });
  }

  // Get tag statistics (project count)
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
        console.error('[TagService.getTagStats] Error:', error);
        return createErrorResponse(error as Error);
      }
    });
  }

  // Get bulk tag statistics (project counts) - Uses reverse expansion approach
  static async getBulkTagStats(tagIds: string[]): Promise<ServiceResponse<Record<string, number>>> {
    console.log(
      '[TagService.getBulkTagStats] Starting with reverse expansion approach for tagIds:',
      tagIds
    );

    return withAuthentication(async (userId: string) => {
      try {
        if (tagIds.length === 0) {
          console.log('[TagService.getBulkTagStats] No tag IDs provided, returning empty results');
          return createSuccessResponse({});
        }

        // Initialize counts to 0 for all tags
        const counts: Record<string, number> = {};
        tagIds.forEach(tagId => {
          counts[tagId] = 0;
        });

        // Use reverse expansion from projects to get tag usage counts
        // This avoids the API rules issue with project_tags collection
        console.log(
          '[TagService.getBulkTagStats] Using reverse expansion from projects collection...'
        );

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

        console.log(
          '[TagService.getBulkTagStats] Found',
          projects.length,
          'projects with tag relationships'
        );

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

        console.log('[TagService.getBulkTagStats] Final counts using reverse expansion:', counts);
        return createSuccessResponse(counts);
      } catch (error) {
        console.error(
          '[TagService.getBulkTagStats] Reverse expansion failed, falling back to individual queries:',
          error
        );

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
                console.log(
                  '[TagService.getBulkTagStats] Fallback: Tag',
                  tagId,
                  'has',
                  counts[tagId],
                  'projects'
                );
              }
            } catch (individualError) {
              console.warn(
                '[TagService.getBulkTagStats] Error counting projects for tag',
                tagId,
                ':',
                individualError
              );
              // Keep count at 0 for this tag
            }
          }

          console.log(
            '[TagService.getBulkTagStats] Fallback individual queries completed:',
            counts
          );
          return createSuccessResponse(counts);
        } catch (fallbackError) {
          console.error(
            '[TagService.getBulkTagStats] Both reverse expansion and fallback failed:',
            fallbackError
          );
          return createErrorResponse(fallbackError as Error);
        }
      }
    });
  }
}
