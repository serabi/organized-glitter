/**
 * @fileoverview CSV import validation and normalization utilities
 * 
 * Provides validation and data cleaning functions for CSV import to ensure
 * data meets PocketBase schema constraints and validation rules.
 * 
 * @version 1.0.0
 * @since 2025-07-01
 */

import { ProjectsDrillShapeOptions, ProjectsStatusOptions, ProjectsKitCategoryOptions } from '@/types/pocketbase.types';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('CSVValidation');

// Maximum field lengths (conservative estimates based on typical database constraints)
export const FIELD_LIMITS = {
  TAG_NAME_MAX_LENGTH: 100,
  PROJECT_TITLE_MAX_LENGTH: 200,
  GENERAL_NOTES_MAX_LENGTH: 1000,
  SOURCE_URL_MAX_LENGTH: 500,
} as const;

// Validation error types
export interface ValidationIssue {
  field: string;
  originalValue: string;
  correctedValue?: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface CorrectedProjectData {
  title: string;
  drillShape: ProjectsDrillShapeOptions | null;
  status: ProjectsStatusOptions;
  kit_category: ProjectsKitCategoryOptions;
  datePurchased: string | null;
  dateReceived: string | null;
  dateStarted: string | null;
  dateCompleted: string | null;
  generalNotes: string | null;
  sourceUrl: string | null;
  [key: string]: unknown; // For other fields that pass through unchanged
}

export interface ValidationResult {
  isValid: boolean;
  correctedData: CorrectedProjectData;
  issues: ValidationIssue[];
}

/**
 * Case-insensitive mapping for drill shape values
 */
const DRILL_SHAPE_MAPPING: Record<string, ProjectsDrillShapeOptions> = {
  'round': ProjectsDrillShapeOptions.round,
  'square': ProjectsDrillShapeOptions.square,
  'Round': ProjectsDrillShapeOptions.round,
  'Square': ProjectsDrillShapeOptions.square,
  'ROUND': ProjectsDrillShapeOptions.round,
  'SQUARE': ProjectsDrillShapeOptions.square,
  'r': ProjectsDrillShapeOptions.round,
  'R': ProjectsDrillShapeOptions.round,
  's': ProjectsDrillShapeOptions.square,
  'S': ProjectsDrillShapeOptions.square,
};

/**
 * Case-insensitive mapping for project status values
 */
const STATUS_MAPPING: Record<string, ProjectsStatusOptions> = {
  'wishlist': ProjectsStatusOptions.wishlist,
  'purchased': ProjectsStatusOptions.purchased,
  'stash': ProjectsStatusOptions.stash,
  'progress': ProjectsStatusOptions.progress,
  'completed': ProjectsStatusOptions.completed,
  'archived': ProjectsStatusOptions.archived,
  'destashed': ProjectsStatusOptions.destashed,
  // Case variations
  'Wishlist': ProjectsStatusOptions.wishlist,
  'Purchased': ProjectsStatusOptions.purchased,
  'Stash': ProjectsStatusOptions.stash,
  'Progress': ProjectsStatusOptions.progress,
  'Completed': ProjectsStatusOptions.completed,
  'Archived': ProjectsStatusOptions.archived,
  'Destashed': ProjectsStatusOptions.destashed,
  'WISHLIST': ProjectsStatusOptions.wishlist,
  'PURCHASED': ProjectsStatusOptions.purchased,
  'STASH': ProjectsStatusOptions.stash,
  'PROGRESS': ProjectsStatusOptions.progress,
  'COMPLETED': ProjectsStatusOptions.completed,
  'ARCHIVED': ProjectsStatusOptions.archived,
  'DESTASHED': ProjectsStatusOptions.destashed,
  // Common variations
  'wish list': ProjectsStatusOptions.wishlist,
  'in progress': ProjectsStatusOptions.progress,
  'in_progress': ProjectsStatusOptions.progress,
  'done': ProjectsStatusOptions.completed,
  'finished': ProjectsStatusOptions.completed,
  'complete': ProjectsStatusOptions.completed,
  'bought': ProjectsStatusOptions.purchased,
  'owned': ProjectsStatusOptions.stash,
};

/**
 * Case-insensitive mapping for kit category values
 */
const KIT_CATEGORY_MAPPING: Record<string, ProjectsKitCategoryOptions> = {
  'full': ProjectsKitCategoryOptions.full,
  'mini': ProjectsKitCategoryOptions.mini,
  'Full': ProjectsKitCategoryOptions.full,
  'Mini': ProjectsKitCategoryOptions.mini,
  'FULL': ProjectsKitCategoryOptions.full,
  'MINI': ProjectsKitCategoryOptions.mini,
  // Common variations
  'full drill': ProjectsKitCategoryOptions.full,
  'full-drill': ProjectsKitCategoryOptions.full,
  'Full Drill': ProjectsKitCategoryOptions.full,
  'partial': ProjectsKitCategoryOptions.mini,
  'Partial': ProjectsKitCategoryOptions.mini,
  'small': ProjectsKitCategoryOptions.mini,
  'Small': ProjectsKitCategoryOptions.mini,
};

/**
 * Normalize drill shape value with case-insensitive matching
 */
export function normalizeDrillShape(value: string | null | undefined): {
  normalized: ProjectsDrillShapeOptions | null;
  issue?: ValidationIssue;
} {
  if (!value || typeof value !== 'string') {
    return { normalized: null };
  }

  const trimmed = value.trim();
  const normalized = DRILL_SHAPE_MAPPING[trimmed];

  if (normalized) {
    const issue = trimmed !== normalized ? {
      field: 'drill_shape',
      originalValue: value,
      correctedValue: normalized,
      severity: 'info' as const,
      message: `Normalized "${value}" to "${normalized}"`
    } : undefined;

    return { normalized, issue };
  }

  return {
    normalized: null,
    issue: {
      field: 'drill_shape',
      originalValue: value,
      severity: 'warning' as const,
      message: `Invalid drill shape "${value}". Valid options: round, square. Leaving empty.`
    }
  };
}

/**
 * Normalize project status value with case-insensitive matching
 */
export function normalizeStatus(value: string | null | undefined): {
  normalized: ProjectsStatusOptions;
  issue?: ValidationIssue;
} {
  if (!value || typeof value !== 'string') {
    return { normalized: ProjectsStatusOptions.wishlist };
  }

  const trimmed = value.trim();
  const normalized = STATUS_MAPPING[trimmed];

  if (normalized) {
    const issue = trimmed !== normalized ? {
      field: 'status',
      originalValue: value,
      correctedValue: normalized,
      severity: 'info' as const,
      message: `Normalized "${value}" to "${normalized}"`
    } : undefined;

    return { normalized, issue };
  }

  return {
    normalized: ProjectsStatusOptions.wishlist,
    issue: {
      field: 'status',
      originalValue: value,
      correctedValue: ProjectsStatusOptions.wishlist,
      severity: 'warning' as const,
      message: `Invalid status "${value}". Defaulting to "wishlist". Valid options: ${Object.values(ProjectsStatusOptions).join(', ')}`
    }
  };
}

/**
 * Normalize kit category value with case-insensitive matching
 */
export function normalizeKitCategory(value: string | null | undefined): {
  normalized: ProjectsKitCategoryOptions;
  issue?: ValidationIssue;
} {
  if (!value || typeof value !== 'string') {
    return { normalized: ProjectsKitCategoryOptions.full };
  }

  const trimmed = value.trim();
  const normalized = KIT_CATEGORY_MAPPING[trimmed];

  if (normalized) {
    const issue = trimmed !== normalized ? {
      field: 'kit_category',
      originalValue: value,
      correctedValue: normalized,
      severity: 'info' as const,
      message: `Normalized "${value}" to "${normalized}"`
    } : undefined;

    return { normalized, issue };
  }

  return {
    normalized: ProjectsKitCategoryOptions.full,
    issue: {
      field: 'kit_category',
      originalValue: value,
      correctedValue: ProjectsKitCategoryOptions.full,
      severity: 'warning' as const,
      message: `Invalid kit category "${value}". Defaulting to "full". Valid options: full, mini`
    }
  };
}

/**
 * Validate and potentially truncate tag name
 */
export function validateTagName(value: string | null | undefined): {
  normalized: string;
  issue?: ValidationIssue;
} {
  if (!value || typeof value !== 'string') {
    return { normalized: '' };
  }

  const trimmed = value.trim();
  
  if (trimmed.length <= FIELD_LIMITS.TAG_NAME_MAX_LENGTH) {
    return { normalized: trimmed };
  }

  // Truncate at word boundary if possible
  const truncated = truncateAtWordBoundary(trimmed, FIELD_LIMITS.TAG_NAME_MAX_LENGTH);
  
  return {
    normalized: truncated,
    issue: {
      field: 'tag_name',
      originalValue: value,
      correctedValue: truncated,
      severity: 'warning' as const,
      message: `Tag name too long (${trimmed.length} chars). Truncated to: "${truncated}"`
    }
  };
}

/**
 * Validate and potentially truncate project title
 */
export function validateProjectTitle(value: string | null | undefined): {
  normalized: string;
  issue?: ValidationIssue;
} {
  if (!value || typeof value !== 'string') {
    return { normalized: 'Untitled Project' };
  }

  const trimmed = value.trim();
  
  if (trimmed.length <= FIELD_LIMITS.PROJECT_TITLE_MAX_LENGTH) {
    return { normalized: trimmed };
  }

  const truncated = truncateAtWordBoundary(trimmed, FIELD_LIMITS.PROJECT_TITLE_MAX_LENGTH);
  
  return {
    normalized: truncated,
    issue: {
      field: 'title',
      originalValue: value,
      correctedValue: truncated,
      severity: 'warning' as const,
      message: `Project title too long (${trimmed.length} chars). Truncated to: "${truncated}"`
    }
  };
}

/**
 * Validate and correct date format
 */
export function validateDate(value: string | null | undefined, fieldName: string): {
  normalized: string | null;
  issue?: ValidationIssue;
} {
  if (!value || typeof value !== 'string') {
    return { normalized: null };
  }

  const trimmed = value.trim();
  
  // Handle common date format issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // Check for invalid years like "0242"
    const year = parseInt(trimmed.substring(0, 4));
    if (year < 1900 || year > 2100) {
      // Try to fix obvious typos like 0242 -> 2024
      const correctedYear = fixCommonYearTypos(year);
      if (correctedYear) {
        const correctedDate = `${correctedYear}${trimmed.substring(4)}`;
        return {
          normalized: correctedDate,
          issue: {
            field: fieldName,
            originalValue: value,
            correctedValue: correctedDate,
            severity: 'warning' as const,
            message: `Invalid year ${year} corrected to ${correctedYear}`
          }
        };
      }
    } else {
      // Valid date format
      return { normalized: trimmed };
    }
  }

  // Invalid date format
  return {
    normalized: null,
    issue: {
      field: fieldName,
      originalValue: value,
      severity: 'error' as const,
      message: `Invalid date format "${value}". Expected YYYY-MM-DD format. Date cleared.`
    }
  };
}

/**
 * Helper function to truncate text at word boundary
 */
function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Try to find last space before the limit
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    // If we can find a good word boundary (not too far back), use it
    return truncated.substring(0, lastSpace).trim();
  }
  
  // Otherwise, hard truncate with ellipsis, ensuring we don't end mid-word
  const hardTruncated = text.substring(0, maxLength - 3);
  const lastSpaceInHard = hardTruncated.lastIndexOf(' ');
  
  if (lastSpaceInHard > (maxLength - 3) * 0.8) {
    // Use word boundary if close enough
    return hardTruncated.substring(0, lastSpaceInHard).trim() + '...';
  }
  
  // Otherwise just add ellipsis
  return hardTruncated + '...';
}

/**
 * Fix common year typos
 */
function fixCommonYearTypos(year: number): number | null {
  const yearStr = year.toString();
  
  // Handle cases like 242 -> 2024 (interpreted from 0242)
  if (yearStr.length === 3 && year < 100) {
    // Likely missing leading 20
    const candidate = 2000 + year;
    if (candidate >= 1900 && candidate <= 2100) {
      return candidate;
    }
  }
  
  // Handle cases like 242 -> 2024 (when from 0242 pattern)
  if (yearStr.length === 3 && year >= 100) {
    // Specific pattern fixes for common typos like 0242 -> 2024
    if (year === 242) return 2024;
    if (year === 232) return 2023;
    if (year === 252) return 2025;
  }
  
  // Handle cases like 0242 -> 2024 (first digit wrong)
  if (yearStr.length === 4 && yearStr.startsWith('0')) {
    const withoutFirst = yearStr.substring(1);
    const candidate = parseInt(`2${withoutFirst}`);
    if (candidate >= 1900 && candidate <= 2100) {
      return candidate;
    }
  }
  
  // Handle cases like 2042 -> 2024 (digit swap)
  if (yearStr.length === 4 && yearStr.startsWith('20')) {
    // Common pattern: 2042 instead of 2024
    if (yearStr === '2042') return 2024;
    if (yearStr === '2032') return 2023;
  }
  
  return null;
}

/**
 * Comprehensive validation for a CSV row representing a project
 */
export function validateProjectData(data: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const correctedData: CorrectedProjectData = { ...data } as CorrectedProjectData;

  // Validate title
  const titleResult = validateProjectTitle(data.title as string);
  correctedData.title = titleResult.normalized;
  if (titleResult.issue) issues.push(titleResult.issue);

  // Validate drill shape
  const drillShapeResult = normalizeDrillShape((data.drillShape || data.drill_shape) as string);
  correctedData.drillShape = drillShapeResult.normalized;
  if (drillShapeResult.issue) issues.push(drillShapeResult.issue);

  // Validate status
  const statusResult = normalizeStatus(data.status as string);
  correctedData.status = statusResult.normalized;
  if (statusResult.issue) issues.push(statusResult.issue);

  // Validate kit category
  const kitCategoryResult = normalizeKitCategory((data.kit_category || data.kitCategory) as string);
  correctedData.kit_category = kitCategoryResult.normalized;
  if (kitCategoryResult.issue) issues.push(kitCategoryResult.issue);

  // Validate dates
  const dateFields = ['datePurchased', 'dateReceived', 'dateStarted', 'dateCompleted'] as const;
  for (const field of dateFields) {
    const dateResult = validateDate(data[field] as string, field);
    correctedData[field] = dateResult.normalized;
    if (dateResult.issue) issues.push(dateResult.issue);
  }

  // Validate general notes length
  const generalNotes = data.generalNotes as string;
  if (generalNotes && typeof generalNotes === 'string') {
    if (generalNotes.length > FIELD_LIMITS.GENERAL_NOTES_MAX_LENGTH) {
      const truncated = truncateAtWordBoundary(generalNotes, FIELD_LIMITS.GENERAL_NOTES_MAX_LENGTH);
      correctedData.generalNotes = truncated;
      issues.push({
        field: 'generalNotes',
        originalValue: generalNotes,
        correctedValue: truncated,
        severity: 'warning',
        message: `General notes too long (${generalNotes.length} chars). Truncated.`
      });
    } else {
      correctedData.generalNotes = generalNotes;
    }
  } else {
    correctedData.generalNotes = null;
  }

  // Validate source URL length
  const sourceUrl = data.sourceUrl as string;
  if (sourceUrl && typeof sourceUrl === 'string') {
    if (sourceUrl.length > FIELD_LIMITS.SOURCE_URL_MAX_LENGTH) {
      const truncated = sourceUrl.substring(0, FIELD_LIMITS.SOURCE_URL_MAX_LENGTH);
      correctedData.sourceUrl = truncated;
      issues.push({
        field: 'sourceUrl',
        originalValue: sourceUrl,
        correctedValue: truncated,
        severity: 'warning',
        message: `Source URL too long. Truncated to ${FIELD_LIMITS.SOURCE_URL_MAX_LENGTH} characters.`
      });
    } else {
      correctedData.sourceUrl = sourceUrl;
    }
  } else {
    correctedData.sourceUrl = null;
  }

  const hasErrors = issues.some(issue => issue.severity === 'error');

  logger.debug('Project validation completed', {
    originalTitle: data.title,
    correctedTitle: correctedData.title,
    issueCount: issues.length,
    hasErrors
  });

  return {
    isValid: !hasErrors,
    correctedData,
    issues
  };
}

/**
 * Validate tag names from CSV and return normalized versions
 */
export function validateTagNames(tagNames: string[]): {
  validatedTags: Array<{ original: string; normalized: string }>;
  issues: ValidationIssue[];
} {
  const validatedTags: Array<{ original: string; normalized: string }> = [];
  const issues: ValidationIssue[] = [];

  for (const tagName of tagNames) {
    const result = validateTagName(tagName);
    validatedTags.push({
      original: tagName,
      normalized: result.normalized
    });
    if (result.issue) {
      issues.push(result.issue);
    }
  }

  return { validatedTags, issues };
}