import { useState } from 'react';
import { ProjectCreateDTO } from '@/types/project';
import { pb } from '@/lib/pocketbase';
// import { TAG_COLOR_PALETTE } from '@/utils/tagColors'; // Unused
import { logger } from '@/utils/logger';
import { queuedPbRequest } from '@/utils/rateLimit';

// Type for tag import results
export interface TagImportResult {
  totalTags: number;
  successfulTags: number;
  failedTags: number;
  errors: string[];
}

// Type for project creation result with tag import info
export interface ProjectCreationResult {
  project: Record<string, unknown>; // PocketBase record
  tagImportResult?: TagImportResult;
}

export const useImportCreateProject = () => {
  const [loading, setLoading] = useState(false);

  const createProject = async (data: ProjectCreateDTO): Promise<ProjectCreationResult> => {
    setLoading(true);

    try {
      // Get current user from PocketBase
      if (!pb.authStore.isValid || !pb.authStore.model) {
        logger.error('No user found when creating project');
        throw new Error('User not authenticated');
      }

      const user = pb.authStore.model;
      const userId = user.id;

      // Prepare data object for PocketBase
      // Only include fields that exist in the database schema
      const projectData = {
        title: data.title || '', // Ensure title is always a string
        user: userId,
        // Handle company and artist IDs - we'll need to resolve these
        company: null as string | null, // Will be resolved below if needed
        artist: null as string | null, // Will be resolved below if needed
        width: data.width || null,
        height: data.height || null,
        drill_shape: data.drillShape || null,
        status: data.status || 'wishlist',
        date_purchased: data.datePurchased || null,
        date_received: data.dateReceived || null,
        date_started: data.dateStarted || null,
        date_completed: data.dateCompleted || null,
        general_notes: data.generalNotes || null,
        image: data.imageUrl || null,
        source_url: data.sourceUrl || null,
        total_diamonds: data.totalDiamonds ? Number(data.totalDiamonds) : null,
        kit_category: data.kit_category || 'full',
      };

      // DEBUG: Log kit_category field specifically
      logger.debug(`Kit category debug for project "${data.title}":`, {
        inputKitCategory: data.kit_category,
        finalKitCategory: projectData.kit_category,
      });
      logger.debug('Full projectData object:', { projectData });

      // Resolve company ID if company name is provided
      if (data.company && data.company !== 'other') {
        try {
          // Check if company exists
          const existingCompanies = await queuedPbRequest(() =>
            pb.collection('companies').getList(1, 1, {
              filter: pb.filter('name = {:companyName} && user = {:userId}', {
                companyName: data.company,
                userId,
              }),
            })
          );

          if (existingCompanies.items.length > 0) {
            projectData.company = existingCompanies.items[0].id;
          } else {
            // Create new company
            const newCompany = await queuedPbRequest(() =>
              pb.collection('companies').create({
                name: data.company,
                user: userId,
              })
            );
            projectData.company = newCompany.id;
          }
        } catch (error) {
          logger.warn('Failed to resolve/create company:', error);
          // Continue without company reference
        }
      }

      // Resolve artist ID if artist name is provided
      if (data.artist && !['other', 'unknown'].includes(data.artist)) {
        try {
          // Check if artist exists
          const existingArtists = await queuedPbRequest(() =>
            pb.collection('artists').getList(1, 1, {
              filter: pb.filter('name = {:artistName} && user = {:userId}', {
                artistName: data.artist,
                userId,
              }),
            })
          );

          if (existingArtists.items.length > 0) {
            projectData.artist = existingArtists.items[0].id;
          } else {
            // Create new artist
            const newArtist = await queuedPbRequest(() =>
              pb.collection('artists').create({
                name: data.artist,
                user: userId,
              })
            );
            projectData.artist = newArtist.id;
          }
        } catch (error) {
          logger.warn('Failed to resolve/create artist:', error);
          // Continue without artist reference
        }
      }

      // Save new project to PocketBase
      const newProject = await queuedPbRequest(() => pb.collection('projects').create(projectData));

      if (!newProject || !newProject.id) {
        logger.error('Project creation failed: no valid project data returned', {
          projectData,
          newProject,
        });
        throw new Error('Project creation failed: no valid project ID returned');
      }

      // DEBUG: Log what came back from database
      logger.debug(`Database insert result for "${data.title}":`, {
        returnedKitCategory: newProject.kit_category,
        fullReturnedProject: newProject,
      });

      // Company and artist creation is now handled above in the project creation process

      // Handle tags if provided (now expecting tagIds)
      if (data.tagIds && data.tagIds.length > 0) {
        logger.debug(
          `Processing ${data.tagIds.length} pre-resolved tags for project "${data.title}":`,
          { tagIds: data.tagIds }
        );
        const tagResults: TagImportResult = {
          totalTags: data.tagIds.length,
          successfulTags: 0,
          failedTags: 0,
          errors: [] as string[],
        };

        // Safety check: ensure project ID exists
        if (!newProject?.id) {
          logger.error(
            `Cannot link tags: project ID is undefined for project "${data.title}"`,
            null,
            {
              newProject,
              projectKeys: Object.keys(newProject || {}),
            }
          );
          tagResults.failedTags = data.tagIds.length;
          tagResults.errors.push(
            `Cannot link tags: project ID is undefined for project "${data.title}"`
          );
          return {
            project: newProject,
            tagImportResult: tagResults,
          };
        }

        for (const tagId of data.tagIds) {
          if (!tagId.trim()) {
            logger.debug('Skipping empty tag ID'); // Should not happen if tagIds are validated
            tagResults.failedTags++;
            tagResults.errors.push('Encountered an empty tag ID during linking.');
            continue;
          }

          const tagProcessingStart = Date.now();
          logger.debug(`Attempting to link tag ${tagId} to project ${newProject.id}`);

          try {
            await queuedPbRequest(() =>
              pb.collection('project_tags').create({
                project: newProject.id,
                tag: tagId,
              })
            );
            logger.debug(`Successfully linked tag ${tagId} to project ${newProject.id}`);
            tagResults.successfulTags++;
          } catch (linkError) {
            logger.error(`Error linking tag ${tagId} to project ${newProject.id}`, linkError, {
              project: newProject.id,
              tag: tagId,
              user: userId,
            });
            tagResults.failedTags++;
            tagResults.errors.push(
              `Tag linking failed for tag ID "${tagId}": ${linkError instanceof Error ? linkError.message : 'Unknown error'}`
            );
          }
          const tagProcessingTime = Date.now() - tagProcessingStart;
          logger.debug(`Tag ID "${tagId}" linking processing completed in ${tagProcessingTime}ms`);
        }

        logger.debug(`Tag linking summary for project "${data.title}":`, {
          totalTags: tagResults.totalTags,
          successfulTags: tagResults.successfulTags,
          failedTags: tagResults.failedTags,
          successRate:
            tagResults.totalTags > 0
              ? `${((tagResults.successfulTags / tagResults.totalTags) * 100).toFixed(1)}%`
              : 'N/A',
          errors: tagResults.errors,
        });

        if (tagResults.failedTags > 0) {
          logger.warn(
            `${tagResults.failedTags} out of ${tagResults.totalTags} tags failed to link for project "${data.title}"`,
            {
              projectTitle: data.title,
              failedLinks: tagResults.failedTags,
              totalTags: tagResults.totalTags,
            }
          );
        }

        return {
          project: newProject,
          tagImportResult: tagResults,
        };
      } else {
        logger.debug(`No tag IDs provided for project "${data.title}"`);
        return {
          project: newProject,
          tagImportResult: undefined,
        };
      }
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProject,
    loading,
  };
};
