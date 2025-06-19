/**
 * Utility functions for converting between database models and application models.
 * These functions handle the transformation between snake_case (database) and camelCase (application).
 *
 * The database uses snake_case field names (e.g., user_id, date_purchased)
 * The application uses camelCase field names (e.g., userId, datePurchased)
 *
 * These conversion functions ensure data consistency across the application.
 */

import { DbProject } from '@/types/db-project';
import { Project, ProjectStatus, ProgressNote, ProjectFormValues } from '@/types/shared';
import { Tag } from '@/types/tag';
import { logger } from '@/utils/logger';

/**
 * Extended DbProject interface for handling joined data from database queries
 * This includes additional fields that may be present when fetching projects with joins
 */
interface DbProjectWithJoins extends DbProject {
  project_tags?: Array<{
    id: string;
    project_id: string;
    tag_id: string;
    created_at: string;
    tags: {
      id: string;
      user_id: string;
      name: string;
      slug: string;
      color: string;
      created_at: string;
      updated_at: string;
    };
  }>;
}

/**
 * Type alias for Project to maintain backward compatibility
 * This allows older code to use ProjectType while newer code uses Project
 */
type ProjectType = Project;

/**
 * Converts an application project model to a database project model
 * Transforms camelCase field names to snake_case and handles data type conversions
 *
 * @param project - The application project model to convert
 * @returns A database project model with snake_case field names suitable for database operations
 *
 * @example
 * // Convert a project form to database format
 * const formValues = {
 *   title: "Diamond Painting",
 *   status: "in_progress",
 *   datePurchased: "2025-01-15"
 * };
 * const dbProject = toDbProject(formValues);
 * // Result: { title: "Diamond Painting", status: "in_progress", date_purchased: "2025-01-15" }
 */
/**
 * Maps application status values to standardized database status values
 * This ensures consistency in the database
 * @param appStatus The status value from the application
 * @returns The standardized database status value
 */
export function mapAppStatusToDbStatus(appStatus: ProjectStatus | null | undefined): ProjectStatus {
  if (!appStatus) return 'purchased';

  // Always use the standardized values in the database
  // For 'progress', we consistently use 'progress' (not 'in_progress')
  return appStatus;
}

/**
 * Converts an application project model to a database project model
 * Transforms camelCase field names to snake_case and handles data type conversions
 *
 * @param project - The application project model to convert
 * @returns A database project model with snake_case field names suitable for database operations
 *
 * @example
 * // Convert a project form to database format
 * const formValues = {
 *   title: "Diamond Painting",
 *   status: "progress",
 *   datePurchased: "2025-01-15"
 * };
 * const dbProject = toDbProject(formValues);
 * // Result: { title: "Diamond Painting", status: "progress", date_purchased: "2025-01-15" }
 */
export function toDbProject(project: ProjectFormValues): Partial<DbProject> {
  // Convert totalDiamonds to number if needed
  const totalDiamonds =
    project.totalDiamonds !== undefined && project.totalDiamonds !== null
      ? typeof project.totalDiamonds === 'string'
        ? parseInt(project.totalDiamonds) || null
        : project.totalDiamonds
      : null;

  // Convert width and height from string to number
  const width = project.width ? parseFloat(project.width) : null;
  const height = project.height ? parseFloat(project.height) : null;

  // Ensure date fields are correctly formatted for the database
  // An empty string should be converted to null
  const datePurchased = project.datePurchased === '' ? null : project.datePurchased;
  const dateReceived = project.dateReceived === '' ? null : project.dateReceived;
  const dateStarted = project.dateStarted === '' ? null : project.dateStarted;
  const dateCompleted = project.dateCompleted === '' ? null : project.dateCompleted;

  // Create a copy of the project object and remove fields that don't exist in the database
  const { _imageReplacement, imageFile, ...projectData } = project;

  // Standardize the status value to ensure consistency in the database
  const standardizedStatus = mapAppStatusToDbStatus(projectData.status);

  // Ensure image_url is properly set - handle both undefined and empty string cases
  const imageUrl = projectData.imageUrl === '' ? null : projectData.imageUrl;

  const result = {
    title: projectData.title,
    company: projectData.company || null,
    artist: projectData.artist || null,
    drill_shape: projectData.drillShape || null,
    width: width,
    height: height,
    status: standardizedStatus,
    date_purchased: datePurchased,
    date_received: dateReceived,
    date_started: dateStarted,
    date_completed: dateCompleted,
    general_notes: projectData.generalNotes || null,
    image_url: imageUrl,
    source_url: projectData.sourceUrl || null,
    total_diamonds: totalDiamonds,
    kit_category: projectData.kit_category || 'full', // Added kit_category mapping with proper default
    // Removing imageFile and notes fields as they don't exist in DbProject type
  };

  return result;
}

/**
 * Normalizes database response to a single DbProject object
 * Handles both single objects and arrays from Supabase responses
 *
 * @param dbProject - The database response (single object or array)
 * @returns A single DbProject object
 * @throws Error if the input is null, undefined, or empty array
 */
function normalizeDbProject(
  dbProject: DbProject | DbProject[] | DbProjectWithJoins | DbProjectWithJoins[]
): DbProject | DbProjectWithJoins {
  if (!dbProject) {
    throw new Error('Cannot convert null or undefined to ProjectType');
  }

  if (Array.isArray(dbProject)) {
    if (dbProject.length === 0) {
      throw new Error('Empty array provided to fromDbProject');
    }
    return dbProject[0];
  }

  return dbProject;
}

/**
 * Converts a database project model to an application project model
 * Transforms snake_case field names to camelCase and provides default values for missing fields
 *
 * @param dbProject - The database project model to convert
 * @returns An application project model with camelCase field names and all required fields
 * @throws Error if the input is null or undefined
 *
 * @example
 * // Convert a database project to application format
 * const dbProject = {
 *   id: "123",
 *   user_id: "user456",
 *   title: "Diamond Painting",
 *   status: "progress",
 *   date_purchased: "2025-01-15"
 * };
 * const project = fromDbProject(dbProject);
 * // Result: { id: "123", userId: "user456", title: "Diamond Painting", status: "progress", datePurchased: "2025-01-15", ... }
 */
/**
 * Maps database status values to application status values
 * This ensures consistency between database and application
 * @param dbStatus The status value from the database
 * @returns The corresponding application status value
 */
function mapDbStatusToAppStatus(dbStatus: string | null): ProjectStatus {
  if (!dbStatus) return 'purchased';

  // Map database status values to application status values
  const statusMap: Record<string, ProjectStatus> = {
    progress: 'progress',
    in_progress: 'progress', // Legacy value, standardized to 'progress'
    completed: 'completed',
    wishlist: 'wishlist',
    purchased: 'purchased',
    stash: 'stash',
    archived: 'archived',
    destashed: 'destashed',
  };

  // Return the mapped status or default to 'purchased' if not found
  return statusMap[dbStatus.toLowerCase()] || 'purchased';
}

export function fromDbProject(
  dbProject: DbProject | DbProject[] | DbProjectWithJoins | DbProjectWithJoins[]
): ProjectType {
  // Normalize the input to a single DbProject object
  const projectData = normalizeDbProject(dbProject);

  logger.dbConversion('Converting DB project to app format', {
    projectId: projectData.id,
    title: projectData.title,
    fieldsAvailable: Object.keys(projectData),
  });

  // Log the raw project_tags received by fromDbProject before processing
  logger.debug('[fromDbProject] Raw project_tags from projectData:', {
    project_tags: (projectData as DbProjectWithJoins).project_tags,
  });

  // Create defensive copies of values to prevent undefined values
  const id = projectData.id ?? crypto.randomUUID();

  // Use the actual title from the database, not the default
  // This ensures that enriched data is properly displayed in the UI
  const title = projectData.title || 'Untitled Project';

  // Map the database status to application status
  const status = mapDbStatusToAppStatus(projectData.status);

  // Parse progress notes from JSON string if available
  let progressNotes: ProgressNote[] = [];
  try {
    if (
      projectData.notes &&
      typeof projectData.notes === 'string' &&
      (projectData.notes.trim().startsWith('{') || projectData.notes.trim().startsWith('['))
    ) {
      const notesObj = JSON.parse(projectData.notes);
      // Define a type for the raw note from JSON
      interface RawProgressNote {
        id?: string;
        date?: string;
        content?: string;
        imageUrl?: string;
      }

      // Map the parsed notes to the ProgressNote type with required fields
      if (notesObj.progressNotes && Array.isArray(notesObj.progressNotes)) {
        progressNotes = notesObj.progressNotes.map((note: RawProgressNote) => ({
          id: note.id || crypto.randomUUID(),
          projectId: projectData.id, // Add the project ID
          content: note.content || '',
          date: note.date || new Date().toISOString().split('T')[0],
          imageUrl: note.imageUrl,
          createdAt: projectData.created_at || new Date().toISOString(),
          updatedAt: projectData.updated_at || new Date().toISOString(),
        }));
      }
    }
  } catch (error) {
    logger.error('Error parsing progress notes', error, { projectId: projectData.id });
  }

  // Transform joined tag data from project_tags array to flat tags array
  let tags: Tag[] = [];
  try {
    // Handle the joined project_tags data structure
    const projectTags = (projectData as DbProjectWithJoins).project_tags;

    if (Array.isArray(projectTags)) {
      tags = projectTags
        .filter((projectTag: unknown) => {
          return (
            projectTag &&
            typeof projectTag === 'object' &&
            projectTag !== null &&
            'tags' in projectTag
          );
        }) // Only include project_tags that have associated tag data
        .map((projectTag: unknown) => {
          const projectTagObj = projectTag as Record<string, unknown>;
          const tagData = projectTagObj.tags as Record<string, unknown>;
          return {
            id: tagData.id,
            userId: tagData.user_id,
            name: tagData.name,
            slug: tagData.slug,
            color: tagData.color,
            createdAt: tagData.created_at,
            updatedAt: tagData.updated_at,
          } as Tag;
        });

      logger.dbConversion('Transformed tag data', {
        projectId: projectData.id,
        tagCount: tags.length,
        tagNames: tags.map(tag => tag.name),
      });
    }
  } catch (error) {
    logger.error('Error parsing project tags', error, { projectId: projectData.id });
    tags = []; // Fallback to empty array if parsing fails
  }

  // Create the project object with all available data
  const project: ProjectType = {
    id,
    userId: projectData.user_id || '',
    title,
    company: projectData.company || undefined,
    artist: projectData.artist || undefined,
    drillShape: projectData.drill_shape || undefined,
    width: projectData.width || undefined,
    height: projectData.height || undefined,
    status,
    datePurchased: projectData.date_purchased || undefined,
    dateReceived: projectData.date_received || undefined,
    dateStarted: projectData.date_started || undefined,
    dateCompleted: projectData.date_completed || undefined,
    generalNotes: projectData.general_notes || undefined,
    imageUrl: projectData.image_url || undefined,
    sourceUrl: projectData.source_url || undefined,
    totalDiamonds: projectData.total_diamonds || undefined,
    kit_category: projectData.kit_category || undefined, // Added kit_category mapping
    progressNotes,
    tags, // Add the transformed tags array
    createdAt: projectData.created_at || new Date().toISOString(),
    updatedAt: projectData.updated_at || new Date().toISOString(),
  };

  logger.dbConversion('Project conversion completed', {
    projectId: project.id,
    title: project.title,
    status: project.status,
    tagCount: tags.length,
  });

  return project;
}
