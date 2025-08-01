import { ProjectType, ProjectStatus } from '@/types/project';
import Papa from 'papaparse';
import { logger } from './logger';
import { safeDateString } from '@/utils/dateHelpers';

export interface ParsedCsvData {
  projects: Partial<ProjectType>[];
  allUniqueTagNames: string[];
}

/**
 * Parse a single CSV row into a project object
 * @param row The CSV row data
 * @returns Partial project object or null if invalid
 */
const parseProjectFromRow = (row: Record<string, string>): Partial<ProjectType> | null => {
  const project: Partial<ProjectType> = {};

  // Map values to project object using flexible header matching
  const title = getFieldValue(row, ['title', 'name', 'project name', 'project title']);
  if (!title) {
    // Skip projects without a title (required field)
    return null;
  }
  project.title = title;

  const status = getFieldValue(row, ['status', 'state', 'project status']);
  if (status) {
    project.status = validateStatus(status);
  }

  const company = getFieldValue(row, ['company', 'manufacturer', 'brand']);
  if (company) {
    project.company = company;
  }

  const artist = getFieldValue(row, ['artist', 'creator', 'designer']);
  if (artist) {
    project.artist = artist;
  }

  // Handle dimensions - support both separate width/height and combined dimensions
  // Also support legacy "Length" header for backward compatibility
  const width = getFieldValue(row, ['width']);
  if (width) {
    const widthValue = parseFloat(width);
    if (!isNaN(widthValue)) {
      project.width = widthValue;
    }
  }

  const height = getFieldValue(row, ['height', 'length']); // Support legacy "Length" header
  if (height) {
    const heightValue = parseFloat(height);
    if (!isNaN(heightValue)) {
      project.height = heightValue;
    }
  }

  // Backwards compatibility: if dimensions column exists but width/height don't
  const dimensions = getFieldValue(row, ['dimensions']);
  if (dimensions && !project.width && !project.height) {
    // Try to extract width and height (format: "WxH" or "W x H")
    const match = dimensions.match(/(\d+)(?:\s*[xX]\s*)(\d+)/);
    if (match) {
      const widthValue = parseFloat(match[1]);
      const heightValue = parseFloat(match[2]);
      if (!isNaN(widthValue)) {
        project.width = widthValue;
      }
      if (!isNaN(heightValue)) {
        project.height = heightValue;
      }
    }
  }

  const drillShape = getFieldValue(row, ['drill shape', 'shape']);
  if (drillShape) {
    project.drillShape = drillShape;
  }

  const canvasType = getFieldValue(row, ['canvas type', 'canvas']);
  if (canvasType) {
    project.canvasType = canvasType;
  }

  const drillType = getFieldValue(row, ['drill type', 'drilltype']);
  if (drillType) {
    project.drillType = drillType;
  }

  const kitCategory = getFieldValue(row, [
    'type of kit',
    'kit category',
    'category',
    'kit_category',
  ]);
  if (kitCategory) {
    const validatedCategory = validateKitCategory(kitCategory);
    if (validatedCategory) {
      project.kit_category = validatedCategory;
    }
  }

  const datePurchased = getFieldValue(row, ['date purchased']);
  if (datePurchased) {
    project.datePurchased = validateDate(datePurchased);
  }

  const dateStarted = getFieldValue(row, ['date started']);
  if (dateStarted) {
    project.dateStarted = validateDate(dateStarted);
  }

  const dateCompleted = getFieldValue(row, ['date completed']);
  if (dateCompleted) {
    project.dateCompleted = validateDate(dateCompleted);
  }

  const notes = getFieldValue(row, ['notes', 'general notes']);
  if (notes) {
    project.generalNotes = notes;
  }

  const sourceUrl = getFieldValue(row, ['source url', 'url', 'source', 'link']);
  if (sourceUrl) {
    project.sourceUrl = sourceUrl;
  }

  const totalDiamonds = getFieldValue(row, [
    'total diamonds',
    'diamond count',
    'diamonds',
    'count',
  ]);
  if (totalDiamonds) {
    // Remove commas and other formatting characters, then parse as integer
    const cleanedValue = totalDiamonds.replace(/[,\s]/g, '');
    const diamondCount = parseInt(cleanedValue, 10);
    if (!isNaN(diamondCount) && diamondCount >= 0) {
      project.totalDiamonds = diamondCount;
    }
  }

  const dateReceived = getFieldValue(row, ['date received']);
  if (dateReceived) {
    project.dateReceived = validateDate(dateReceived);
  }

  // Handle tags - parse comma-separated tag names
  const tagsString = getFieldValue(row, ['tags', 'tag', 'labels']);
  if (tagsString) {
    // Debug: Log original tag string
    logger.log(`[CSV IMPORT] Original tag string for "${project.title}":`, tagsString);
    logger.log(`[CSV IMPORT] Raw tag string type:`, typeof tagsString);
    logger.log(`[CSV IMPORT] Raw tag string value (JSON):`, JSON.stringify(tagsString));

    // Split by comma and clean up tag names
    const tagNames = tagsString
      .split(';')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // Debug: Log parsed tag names
    logger.log(`[CSV IMPORT] After split by semicolon:`, tagsString.split(';'));
    logger.log(`[CSV IMPORT] After trim and filter:`, tagNames);
    logger.log(`[CSV IMPORT] Final tagNames array:`, JSON.stringify(tagNames));

    // Always set tagNames as array (empty if no valid tags found)
    // The actual tag creation/linking will be handled by the import service
    project.tagNames = tagNames;
  } else {
    // Ensure consistent behavior: always include tagNames as empty array when no tags
    project.tagNames = [];
  }

  return project;
};

/**
 * Parse CSV data into an array of project objects using Papa Parse
 * @param csvContent The CSV content as a string
 * @param onProgress Optional progress callback for large files
 * @returns Promise that resolves to an object containing projects and all unique tag names
 */
export const parseCsvToProjects = (
  csvContent: string,
  onProgress?: (progress: number) => void
): Promise<ParsedCsvData> => {
  return new Promise((resolve, reject) => {
    if (!csvContent.trim()) {
      reject(new Error('CSV content is empty'));
      return;
    }

    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.toLowerCase().trim(),
      step: onProgress
        ? (_results, parser) => {
            // Calculate progress based on bytes processed
            const progress = Math.round((parser.getCharIndex() / csvContent.length) * 100);
            onProgress(progress);
          }
        : undefined,
      complete: results => {
        try {
          if (results.errors.length > 0) {
            logger.warn('CSV parsing warnings:', results.errors);
          }

          const projects: Partial<ProjectType>[] = [];

          for (let i = 0; i < results.data.length; i++) {
            const row = results.data[i] as Record<string, string>;
            const project = parseProjectFromRow(row);
            if (project) {
              projects.push(project);
            }
          }

          const allTagNamesArrays = projects.map(p => p.tagNames || []);
          const allUniqueTagNames = Array.from(new Set(allTagNamesArrays.flat()));

          resolve({ projects, allUniqueTagNames });
        } catch (error) {
          reject(error);
        }
      },
      error: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        reject(new Error(`CSV parsing failed: ${errorMessage}`));
      },
    });
  });
};

/**
 * Parse CSV file with streaming support for large files
 * @param file The CSV file to parse
 * @param onProgress Optional progress callback
 * @returns Promise that resolves to an object containing projects and all unique tag names
 */
export const parseCsvFileToProjects = (
  file: File,
  onProgress?: (progress: number) => void
): Promise<ParsedCsvData> => {
  return new Promise((resolve, reject) => {
    const projects: Partial<ProjectType>[] = [];
    let rowCount = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.toLowerCase().trim(),
      step: (results, parser) => {
        // Process each row as it's parsed (streaming)
        const row = results.data as Record<string, string>;

        try {
          const project = parseProjectFromRow(row);
          if (project) {
            projects.push(project);
            rowCount++;
          }

          // Report progress every 100 rows
          if (onProgress && rowCount % 100 === 0) {
            // Approximate progress based on bytes read vs file size
            const progress = Math.round((parser.getCharIndex() / file.size) * 100);
            onProgress(Math.min(progress, 99)); // Cap at 99% until complete
          }
        } catch (error) {
          logger.warn('Error processing CSV row:', error, row);
        }
      },
      complete: () => {
        if (onProgress) {
          onProgress(100);
        }
        const allTagNamesArrays = projects.map(p => p.tagNames || []);
        const allUniqueTagNames = Array.from(new Set(allTagNamesArrays.flat()));
        resolve({ projects, allUniqueTagNames });
      },
      error: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        reject(new Error(`CSV file parsing failed: ${errorMessage}`));
      },
    });
  });
};

/**
 * For backwards compatibility - synchronous version
 */
export const parseCSV = (csvContent: string): ParsedCsvData => {
  if (!csvContent.trim()) {
    throw new Error('CSV content is empty');
  }

  let parsedProjects: Partial<ProjectType>[] = [];

  Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.toLowerCase().trim(),
    complete: results => {
      if (results.errors.length > 0) {
        logger.warn('CSV parsing warnings:', results.errors);
      }

      if (results.data.length === 0) {
        throw new Error('CSV must contain at least a header row and one data row');
      }

      const projects: Partial<ProjectType>[] = [];

      for (let i = 0; i < results.data.length; i++) {
        const row = results.data[i] as Record<string, string>;
        const project = parseProjectFromRow(row);
        if (project) {
          projects.push(project);
        }
      }

      parsedProjects = projects;
    },
  });

  const allTagNamesArrays = parsedProjects.map(p => p.tagNames || []);
  const allUniqueTagNames = Array.from(new Set(allTagNamesArrays.flat()));

  return { projects: parsedProjects, allUniqueTagNames };
};

/**
 * Get field value using flexible header matching
 */
const getFieldValue = (
  row: Record<string, string>,
  possibleHeaders: string[]
): string | undefined => {
  for (const header of possibleHeaders) {
    const value = row[header];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

/**
 * Validate and normalize the status field
 */
const validateStatus = (status: string): ProjectStatus => {
  const normalizedStatus = status.toLowerCase().trim();

  switch (normalizedStatus) {
    case 'wishlist':
      return 'wishlist';
    case 'purchased':
      return 'purchased';
    case 'stash':
      return 'stash';
    case 'progress':
    case 'in progress':
      return 'progress';
    case 'completed':
      return 'completed';
    case 'archived':
      return 'archived';
    case 'destashed':
      return 'destashed';
    default:
      // Default to wishlist for invalid status values
      return 'wishlist';
  }
};

/**
 * Validate and normalize the kit category field
 */
const validateKitCategory = (categoryStr: string): 'full' | 'mini' | undefined => {
  if (!categoryStr) return undefined;

  const normalizedCategory = categoryStr.toLowerCase().trim();

  // Full kit variations - check for terms that indicate full-sized kits
  const fullTerms = [
    'full',
    'full sized',
    'full_sized_kit',
    'full sized kit',
    'full coverage',
    'full size',
    'large',
    'big',
  ];

  // Mini kit variations - check for terms that indicate mini kits
  const miniTerms = ['mini', 'mini kit', 'mini_kit', 'small', 'tiny'];

  if (fullTerms.includes(normalizedCategory)) {
    return 'full';
  }
  if (miniTerms.includes(normalizedCategory)) {
    return 'mini';
  }

  return undefined;
};

/**
 * Validate and format a date string
 */
const validateDate = (dateStr: string): string | undefined => {
  if (!dateStr) return undefined;

  // Use timezone-safe conversion (defaults to UTC for backwards compatibility)
  const result = safeDateString(dateStr);
  return result || undefined;
};
