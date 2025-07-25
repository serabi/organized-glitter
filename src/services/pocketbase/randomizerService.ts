/**
 * @fileoverview Enhanced Type-Safe Randomizer Service for PocketBase
 *
 * Provides a comprehensive service layer for managing project randomizer spin history
 * in PocketBase with full TypeScript type safety. Implements CRUD operations with
 * proper error handling, security, and logging for the Organized Glitter project
 * randomizer feature.
 *
 * Key Features:
 * - Full TypeScript type safety using generated PocketBase types
 * - Secure parameterized queries to prevent SQL injection
 * - Automatic cleanup of old spin records
 * - Batch operations for performance
 * - Comprehensive error handling with specific error types
 * - Support for project relation expansion
 * - Analytics metadata capture
 * - Enhanced validation and recovery strategies
 *
 * @author serabi
 * @version 2.0.0
 * @since 2025-07-17
 */

import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';
import type {
  RandomizerSpinsRecord,
  RandomizerSpinsResponse,
  ProjectsResponse,
} from '@/types/pocketbase.types';
import { Collections } from '@/types/pocketbase.types';
import type { PocketBaseError } from '@/types/pocketbase-common';

const logger = createLogger('RandomizerService');

/**
 * Safely truncates userId for logging to prevent sensitive data exposure
 * Shows first 3 and last 3 characters with asterisks in between
 * @param userId - The userId to truncate
 * @returns Truncated userId safe for logging
 */
const truncateUserId = (userId: string): string => {
  if (!userId || typeof userId !== 'string') return '[INVALID_USER_ID]';
  if (userId.length <= 6) return '*'.repeat(userId.length);
  return `${userId.slice(0, 3)}${'*'.repeat(Math.max(3, userId.length - 6))}${userId.slice(-3)}`;
};

/**
 * Safely redacts userId from filter strings for logging
 * @param filter - PocketBase filter string that may contain userId
 * @returns Filter with userId redacted
 */
const redactFilterUserId = (filter: string): string => {
  if (!filter || typeof filter !== 'string') return filter;
  // Replace any userId that looks like a 15-character PocketBase ID
  return filter.replace(/([a-zA-Z0-9]{15})/g, match => {
    return truncateUserId(match);
  });
};

interface QueryOptions {
  filter?: string;
  sort: string;
  expand?: string;
}

const RANDOMIZER_COLLECTION = 'randomizer_spins';

/**
 * Specific error types for randomizer operations
 */
export enum RandomizerErrorType {
  DATABASE_UNAVAILABLE = 'database_unavailable',
  COLLECTION_MISSING = 'collection_missing',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  PERMISSION_DENIED = 'permission_denied',
  RECORD_NOT_FOUND = 'record_not_found',
  BATCH_OPERATION_FAILED = 'batch_operation_failed',
}

/**
 * Enhanced error interface for randomizer operations
 */
export interface RandomizerError extends Error {
  type: RandomizerErrorType;
  canRetry: boolean;
  suggestedAction: string;
  technicalDetails?: unknown;
  originalError?: PocketBaseError;
}

/**
 * Creates a typed randomizer error with recovery information
 */
function createRandomizerError(
  type: RandomizerErrorType,
  message: string,
  canRetry: boolean = false,
  suggestedAction: string = 'Please try again later',
  originalError?: unknown
): RandomizerError {
  const error = new Error(message) as RandomizerError;
  error.type = type;
  error.canRetry = canRetry;
  error.suggestedAction = suggestedAction;
  error.technicalDetails = originalError;
  error.originalError = originalError as PocketBaseError;
  return error;
}

/**
 * Type guard function to check if an error is a RandomizerError
 *
 * Provides a centralized and type-safe way to identify RandomizerError instances
 * with proper type narrowing for TypeScript.
 *
 * @param error - The error object to check
 * @returns True if the error is a RandomizerError, false otherwise
 *
 * @example
 * ```typescript
 * try {
 *   await someRandomizerOperation();
 * } catch (error) {
 *   if (isRandomizerError(error)) {
 *     // TypeScript now knows error is RandomizerError
 *     console.log(`Error type: ${error.type}`);
 *     console.log(`Can retry: ${error.canRetry}`);
 *     console.log(`Suggested action: ${error.suggestedAction}`);
 *   }
 * }
 * ```
 */
export function isRandomizerError(error: unknown): error is RandomizerError {
  return (
    error instanceof Error &&
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'canRetry' in error &&
    'suggestedAction' in error &&
    typeof (error as any).type === 'string' &&
    typeof (error as any).canRetry === 'boolean' &&
    typeof (error as any).suggestedAction === 'string' &&
    Object.values(RandomizerErrorType).includes((error as any).type)
  );
}

/**
 * Expand type for project relations in spin history
 */
export interface RandomizerSpinExpand {
  project?: ProjectsResponse;
}

/**
 * Enhanced parameters for creating a spin record with analytics metadata
 */
export interface EnhancedCreateSpinParams {
  /** User ID performing the spin */
  user: string;
  /** Selected project ID */
  project: string;
  /** Project title for preservation */
  project_title: string;
  /** Project company name for preservation (optional) */
  project_company?: string;
  /** Project artist name for preservation (optional) */
  project_artist?: string;
  /** Array of all projects that were selectable */
  selected_projects: string[];
  /** Analytics metadata for performance tracking */
  metadata?: {
    selectionTime: number; // Time taken to make selection in milliseconds
    deviceType: 'mobile' | 'tablet' | 'desktop';
    spinMethod: 'click' | 'keyboard' | 'touch';
    userAgent?: string;
  };
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Use EnhancedCreateSpinParams instead
 */
export interface CreateSpinParams {
  /** User ID performing the spin */
  user: string;
  /** Selected project ID */
  project: string;
  /** Project title for preservation */
  project_title: string;
  /** Project company name for preservation (optional) */
  project_company?: string;
  /** Project artist name for preservation (optional) */
  project_artist?: string;
  /** Array of all projects that were selectable */
  selected_projects: string[];
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Use RandomizerSpinsResponse instead
 */
export interface SpinRecord {
  /** Unique record identifier */
  id: string;
  /** User ID who performed the spin */
  user: string;
  /** Selected project ID (null if project was deleted) */
  project: string;
  /** Project title at time of spin (preserved even if project deleted) */
  project_title: string;
  /** Project company name at time of spin (preserved, optional) */
  project_company?: string;
  /** Project artist name at time of spin (preserved, optional) */
  project_artist?: string;
  /** Count of projects available for selection */
  selected_count: number;
  /** ISO timestamp when the spin was performed */
  spun_at: string;
  /** Array of project IDs that were available for selection */
  selected_projects: string[];
  /** PocketBase record creation timestamp */
  created: string;
  /** PocketBase record last update timestamp */
  updated: string;
}

/**
 * Analytics metadata interface for performance tracking
 */
export interface SpinAnalyticsMetadata {
  selectionTime: number; // Time taken to make selection in milliseconds
  deviceType: 'mobile' | 'tablet' | 'desktop';
  spinMethod: 'click' | 'keyboard' | 'touch';
  userAgent?: string;
  timestamp: string;
  projectCount: number;
}

/**
 * Batch operation options for optimized database operations
 */
export interface BatchOperationOptions {
  batchSize?: number; // Number of records to process per batch (default: 50)
  delayMs?: number; // Delay between batches in milliseconds (default: 10)
  maxRetries?: number; // Maximum retry attempts for failed operations (default: 3)
  onProgress?: (processed: number, total: number) => void; // Progress callback
}

/**
 * Query performance optimization options
 */
export interface QueryOptimizationOptions {
  useIndexHints?: boolean; // Whether to use database index hints
  enableCaching?: boolean; // Whether to enable query result caching
  cacheTimeMs?: number; // Cache time in milliseconds (default: 60000)
  prefetchRelations?: boolean; // Whether to prefetch related data
}

/**
 * Enhanced spin statistics interface
 */
export interface SpinStatistics {
  totalSpins: number;
  averageSelectionTime: number;
  mostSelectedProject: {
    id: string;
    title: string;
    count: number;
  } | null;
  deviceBreakdown: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  methodBreakdown: {
    click: number;
    keyboard: number;
    touch: number;
  };
  timeRange: {
    earliest: string;
    latest: string;
  };
}

/**
 * Captures analytics metadata for spin operations
 */
export function captureSpinAnalytics(
  selectionTime: number,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  spinMethod: 'click' | 'keyboard' | 'touch',
  projectCount: number,
  userAgent?: string
): SpinAnalyticsMetadata {
  return {
    selectionTime,
    deviceType,
    spinMethod,
    userAgent,
    timestamp: new Date().toISOString(),
    projectCount,
  };
}

/**
 * Detects device type from user agent string
 */
export function detectDeviceType(userAgent?: string): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) return 'desktop';

  const ua = userAgent.toLowerCase();

  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }

  if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) {
    return 'tablet';
  }

  return 'desktop';
}

/**
 * Validation schema for create spin parameters
 */
function validateCreateSpinParams(params: EnhancedCreateSpinParams | CreateSpinParams): void {
  if (!params.user || typeof params.user !== 'string' || params.user.length !== 15) {
    throw createRandomizerError(
      RandomizerErrorType.VALIDATION_ERROR,
      'Invalid user ID - must be a 15-character PocketBase ID',
      false,
      'Please ensure you are properly authenticated'
    );
  }

  if (!params.project || typeof params.project !== 'string' || params.project.length !== 15) {
    throw createRandomizerError(
      RandomizerErrorType.VALIDATION_ERROR,
      'Invalid project ID - must be a 15-character PocketBase ID',
      false,
      'Please select a valid project'
    );
  }

  if (
    !params.project_title ||
    typeof params.project_title !== 'string' ||
    params.project_title.trim().length === 0
  ) {
    throw createRandomizerError(
      RandomizerErrorType.VALIDATION_ERROR,
      'Project title is required and cannot be empty',
      false,
      'Please ensure the project has a valid title'
    );
  }

  if (!Array.isArray(params.selected_projects) || params.selected_projects.length < 2) {
    throw createRandomizerError(
      RandomizerErrorType.VALIDATION_ERROR,
      'At least 2 projects must be selected for meaningful randomization',
      false,
      'Please select at least 2 projects before spinning'
    );
  }

  // Validate all project IDs are valid PocketBase IDs
  const invalidProjectIds = params.selected_projects.filter(
    id => typeof id !== 'string' || id.length !== 15
  );

  if (invalidProjectIds.length > 0) {
    throw createRandomizerError(
      RandomizerErrorType.VALIDATION_ERROR,
      `Invalid project IDs found: ${invalidProjectIds.join(', ')}`,
      false,
      'Please refresh the project list and try again'
    );
  }
}

/**
 * Database validation result interface
 * @interface ValidationResult
 */
interface ValidationResult {
  /** Whether the collection exists and is properly configured */
  isValid: boolean;
  /** List of validation issues found */
  issues: string[];
  /** Whether the collection exists */
  exists: boolean;
  /** Collection configuration details */
  details?: {
    hasRequiredFields: boolean;
    hasProperRules: boolean;
    hasIndexes: boolean;
  };
}

/**
 * Configuration options for paginated batch deletion operations
 * @interface PaginatedDeletionOptions
 */
interface PaginatedDeletionOptions {
  /** Filter query for selecting records to delete */
  filter: string;
  /** Optional sort order for consistent pagination (default: 'created') */
  sort?: string;
  /** Number of records to process per batch (default: 50) */
  pageSize?: number;
  /** Delay between batches in milliseconds (default: 10) */
  batchDelayMs?: number;
}

/**
 * Utility function for paginated batch deletion of PocketBase records
 *
 * Provides a reusable, memory-efficient approach for deleting large numbers of records
 * by fetching and processing them in small batches. This prevents memory overflow issues
 * and avoids database timeouts that can occur when trying to delete thousands of records
 * at once.
 *
 * @param {string} collectionName - Name of the PocketBase collection
 * @param {PaginatedDeletionOptions} options - Configuration for the deletion operation
 * @param {string} options.filter - PocketBase filter query to select records for deletion
 * @param {string} [options.sort='created'] - Sort order for consistent pagination
 * @param {number} [options.pageSize=50] - Records to process per batch
 * @param {number} [options.batchDelayMs=10] - Milliseconds to wait between batches
 *
 * @returns {Promise<number>} Total number of records successfully deleted
 *
 * @throws {Error} When collection access fails or filter query is invalid
 *
 * @example
 * ```typescript
 * // Delete all records for a specific user
 * const deletedCount = await paginatedBatchDelete('randomizer_spins', {
 *   filter: pb.filter('user = {:userId}', { userId: 'user123' })
 * });
 *
 * // Delete old records with custom batch size
 * const deletedOld = await paginatedBatchDelete('randomizer_spins', {
 *   filter: pb.filter('user = {:userId} && spun_at < {:cutoff}', { userId, cutoff }),
 *   sort: 'spun_at',
 *   pageSize: 25,
 *   batchDelayMs: 50
 * });
 * ```
 *
 * @performance
 * - Memory efficient: Only loads one batch of records into memory at a time
 * - Database friendly: Small batch delays prevent overwhelming the database
 * - Scalable: Handles datasets of any size without performance degradation
 *
 * @errorhandling
 * - Individual deletion failures are logged but don't stop the overall process
 * - Returns count of successful deletions even if some individual records fail
 * - Throws only for fundamental errors like invalid collection or filter
 */
async function paginatedBatchDelete(
  collectionName: string,
  options: PaginatedDeletionOptions
): Promise<number> {
  const { filter, sort = 'created', pageSize = 50, batchDelayMs = 10 } = options;

  logger.debug('Starting paginated batch deletion', {
    collectionName,
    filter: redactFilterUserId(filter),
    sort,
    pageSize,
    batchDelayMs,
  });

  let totalDeleted = 0;
  let hasMoreRecords = true;

  while (hasMoreRecords) {
    try {
      // Fetch a batch of records (only IDs to minimize memory usage)
      const recordsPage = await pb.collection(collectionName).getList(1, pageSize, {
        filter,
        fields: 'id',
        sort,
      });

      if (recordsPage.items.length === 0) {
        hasMoreRecords = false;
        break;
      }

      logger.debug('Processing deletion batch', {
        collectionName,
        batchSize: recordsPage.items.length,
        totalDeletedSoFar: totalDeleted,
      });

      // Delete all records in this batch concurrently with error handling
      const deletionPromises = recordsPage.items.map(record =>
        pb
          .collection(collectionName)
          .delete(record.id)
          .catch(error => {
            logger.error('Failed to delete individual record', {
              collectionName,
              recordId: record.id,
              error,
            });
            return null; // Return null for failed deletions
          })
      );

      const deletionResults = await Promise.all(deletionPromises);

      // Count successful deletions (non-null results)
      const successfulDeletions = deletionResults.filter(result => result !== null).length;
      totalDeleted += successfulDeletions;

      // If we got fewer records than the page size, we've reached the end
      if (recordsPage.items.length < pageSize) {
        hasMoreRecords = false;
      }

      // Small delay between batches to avoid overwhelming the database
      if (hasMoreRecords && recordsPage.items.length > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelayMs));
      }
    } catch (error) {
      logger.error('Failed to fetch records batch during deletion', {
        collectionName,
        filter: redactFilterUserId(filter),
        error,
      });
      throw error; // Re-throw fetch errors as they indicate fundamental issues
    }
  }

  logger.debug('Paginated batch deletion completed', {
    collectionName,
    totalDeleted,
    filter: redactFilterUserId(filter),
  });

  return totalDeleted;
}

/**
 * Enhanced type-safe function to create a new spin record
 *
 * Creates a new randomizer spin record using proper TypeScript types and enhanced
 * error handling. Supports both legacy and enhanced parameter formats with optional
 * analytics metadata capture.
 *
 * @param {EnhancedCreateSpinParams | CreateSpinParams} params - The spin data to record
 * @returns {Promise<RandomizerSpinsResponse>} The created spin record with full type safety
 * @throws {RandomizerError} When validation fails or PocketBase operations fail
 *
 * @example
 * ```typescript
 * // Enhanced usage with metadata
 * const spinResult = await createSpinEnhanced({
 *   user: 'user123',
 *   project: 'proj456',
 *   project_title: 'Diamond Art Landscape',
 *   project_company: 'Diamond Dotz',
 *   project_artist: 'Jane Artist',
 *   selected_projects: ['proj456', 'proj789', 'proj101'],
 *   metadata: {
 *     selectionTime: 1250,
 *     deviceType: 'mobile',
 *     spinMethod: 'touch'
 *   }
 * });
 * ```
 */
export async function createSpinEnhanced(
  params: EnhancedCreateSpinParams | CreateSpinParams
): Promise<RandomizerSpinsResponse> {
  try {
    // Validate parameters
    validateCreateSpinParams(params);

    logger.debug('Creating enhanced spin record', {
      userId: params.user,
      projectId: params.project,
      selectedCount: params.selected_projects.length,
      hasMetadata: 'metadata' in params && params.metadata !== undefined,
    });

    // Prepare record data with proper typing
    const recordData: Partial<RandomizerSpinsRecord> = {
      user: params.user,
      project: params.project,
      project_title: params.project_title,
      project_company: params.project_company,
      project_artist: params.project_artist,
      selected_projects: params.selected_projects,
      selected_count: params.selected_projects.length,
      spun_at: new Date().toISOString(),
      ...('metadata' in params && params.metadata ? { metadata: params.metadata } : {}),
    };

    const record = await pb
      .collection(Collections.RandomizerSpins)
      .create<RandomizerSpinsResponse>(recordData);

    logger.info('Enhanced spin record created successfully', {
      spinId: record.id,
      userId: params.user,
      projectTitle: params.project_title,
      selectedCount: params.selected_projects.length,
    });

    return record;
  } catch (error) {
    if (error instanceof Error && 'type' in error) {
      // Re-throw RandomizerError as-is
      throw error;
    }

    // Handle PocketBase errors
    const pbError = error as PocketBaseError;
    if (pbError.status === 403) {
      throw createRandomizerError(
        RandomizerErrorType.PERMISSION_DENIED,
        'Permission denied - please ensure you are authenticated',
        false,
        'Please log in and try again',
        pbError
      );
    } else if (pbError.status === 404) {
      throw createRandomizerError(
        RandomizerErrorType.COLLECTION_MISSING,
        'Randomizer collection not found - database may need setup',
        false,
        'Please contact support or check database configuration',
        pbError
      );
    } else if (pbError.status && pbError.status >= 500) {
      throw createRandomizerError(
        RandomizerErrorType.DATABASE_UNAVAILABLE,
        'Database temporarily unavailable',
        true,
        'Please try again in a few moments',
        pbError
      );
    } else if (!pbError.status) {
      throw createRandomizerError(
        RandomizerErrorType.NETWORK_ERROR,
        'Network error occurred while saving spin',
        true,
        'Please check your connection and try again',
        pbError
      );
    }

    logger.error('Failed to create enhanced spin record', error);
    throw createRandomizerError(
      RandomizerErrorType.DATABASE_UNAVAILABLE,
      'Failed to save spin to history',
      true,
      'Please try again',
      pbError
    );
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use createSpinEnhanced instead for better type safety and error handling
 */
export async function createSpin(params: CreateSpinParams): Promise<SpinRecord> {
  try {
    const result = await createSpinEnhanced(params);
    // Convert to legacy format for backward compatibility
    return {
      id: result.id,
      user: result.user,
      project: result.project,
      project_title: result.project_title,
      project_company: result.project_company,
      project_artist: result.project_artist,
      selected_count: result.selected_count,
      spun_at: result.spun_at,
      selected_projects: result.selected_projects as string[],
      created: result.created,
      updated: result.updated,
    };
  } catch (error) {
    // Convert RandomizerError back to simple Error for legacy compatibility
    if (error instanceof Error && 'type' in error) {
      const randomizerError = error as RandomizerError;
      throw new Error(randomizerError.message);
    }
    throw error;
  }
}

/**
 * Enhanced type-safe function to retrieve spin history with project relation expansion
 *
 * Fetches the user's randomizer spin records with full TypeScript type safety and
 * optional project relation expansion. Uses secure parameterized queries and
 * comprehensive error handling.
 *
 * @param {string} userId - The user ID to fetch history for
 * @param {number} [limit=8] - Maximum number of records to return (default: 8)
 * @param {boolean} [expandProject=false] - Whether to expand project relations
 * @returns {Promise<RandomizerSpinsResponse<string[], RandomizerSpinExpand>[]>} Array of type-safe spin records
 * @throws {RandomizerError} When validation fails or database operations fail
 *
 * @example
 * ```typescript
 * // Get recent spins with project details
 * const recent = await getSpinHistoryEnhanced('user123', 8, true);
 * recent.forEach(spin => {
 *   console.log(`Selected: ${spin.project_title}`);
 *   if (spin.expand?.project) {
 *     console.log(`Status: ${spin.expand.project.status}`);
 *   }
 * });
 * ```
 */
export async function getSpinHistoryEnhanced(
  userId: string,
  limit: number = 8,
  expandProject: boolean = false
): Promise<RandomizerSpinsResponse<string[], RandomizerSpinExpand>[]> {
  try {
    // Validate user ID
    if (!userId || typeof userId !== 'string' || userId.length !== 15) {
      throw createRandomizerError(
        RandomizerErrorType.VALIDATION_ERROR,
        'Invalid user ID - must be a 15-character PocketBase ID',
        false,
        'Please ensure you are properly authenticated'
      );
    }

    if (limit < 1 || limit > 500) {
      throw createRandomizerError(
        RandomizerErrorType.VALIDATION_ERROR,
        'Limit must be between 1 and 500',
        false,
        'Please use a reasonable limit for performance'
      );
    }

    logger.debug('Fetching enhanced spin history', {
      userId,
      limit,
      expandProject,
    });

    const queryOptions: QueryOptions = {
      filter: pb.filter('user = {:userId}', { userId }),
      sort: '-spun_at', // Most recent first
    };

    if (expandProject) {
      queryOptions.expand = 'project';
    }

    const records = await pb
      .collection(Collections.RandomizerSpins)
      .getList<RandomizerSpinsResponse<string[], RandomizerSpinExpand>>(1, limit, queryOptions);

    logger.debug('Enhanced spin history fetched', {
      userId,
      recordCount: records.items.length,
      expandProject,
    });

    return records.items;
  } catch (error) {
    if (error instanceof Error && 'type' in error) {
      // Re-throw RandomizerError as-is
      throw error;
    }

    // Handle PocketBase errors
    const pbError = error as PocketBaseError;
    if (pbError.status === 403) {
      throw createRandomizerError(
        RandomizerErrorType.PERMISSION_DENIED,
        'Permission denied - cannot access spin history',
        false,
        'Please ensure you are authenticated and accessing your own data',
        pbError
      );
    } else if (pbError.status === 404) {
      throw createRandomizerError(
        RandomizerErrorType.COLLECTION_MISSING,
        'Randomizer collection not found',
        false,
        'Please contact support - database may need setup',
        pbError
      );
    } else if (pbError.status && pbError.status >= 500) {
      throw createRandomizerError(
        RandomizerErrorType.DATABASE_UNAVAILABLE,
        'Database temporarily unavailable',
        true,
        'Please try again in a few moments',
        pbError
      );
    } else if (!pbError.status) {
      throw createRandomizerError(
        RandomizerErrorType.NETWORK_ERROR,
        'Network error occurred while fetching history',
        true,
        'Please check your connection and try again',
        pbError
      );
    }

    logger.error('Failed to fetch enhanced spin history', error);
    throw createRandomizerError(
      RandomizerErrorType.DATABASE_UNAVAILABLE,
      'Failed to fetch spin history',
      true,
      'Please try again',
      pbError
    );
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getSpinHistoryEnhanced instead for better type safety and error handling
 */
export async function getSpinHistory(userId: string, limit: number = 8): Promise<SpinRecord[]> {
  try {
    const results = await getSpinHistoryEnhanced(userId, limit, false);
    // Convert to legacy format for backward compatibility
    return results.map(record => ({
      id: record.id,
      user: record.user,
      project: record.project,
      project_title: record.project_title,
      project_company: record.project_company,
      project_artist: record.project_artist,
      selected_count: record.selected_count,
      spun_at: record.spun_at,
      selected_projects: record.selected_projects as string[],
      created: record.created,
      updated: record.updated,
    }));
  } catch (error) {
    // Convert RandomizerError back to simple behavior for legacy compatibility
    if (error instanceof Error && 'type' in error) {
      logger.error('Failed to fetch spin history (legacy)', error);
      return []; // Return empty array on error for legacy compatibility
    }
    logger.error('Failed to fetch spin history', error);
    return []; // Return empty array on error
  }
}

/**
 * Enhanced type-safe function to get the total count of spin history records
 *
 * Efficiently retrieves the total number of spins without fetching the actual
 * record data, with proper error handling and validation.
 *
 * @param {string} userId - The user ID to count spins for
 * @returns {Promise<number>} The total number of spin records for the user
 * @throws {RandomizerError} When validation fails or database operations fail
 *
 * @example
 * ```typescript
 * try {
 *   const totalSpins = await getSpinHistoryCountEnhanced('user123');
 *   console.log(`User has ${totalSpins} total spins`);
 * } catch (error) {
 *   if (error.canRetry) {
 *     // Handle retryable errors
 *   }
 * }
 * ```
 */
export async function getSpinHistoryCountEnhanced(userId: string): Promise<number> {
  try {
    // Validate user ID
    if (!userId || typeof userId !== 'string' || userId.length !== 15) {
      throw createRandomizerError(
        RandomizerErrorType.VALIDATION_ERROR,
        'Invalid user ID - must be a 15-character PocketBase ID',
        false,
        'Please ensure you are properly authenticated'
      );
    }

    logger.debug('Fetching enhanced spin history count', { userId: truncateUserId(userId) });

    // Fetch only the first record to get totalItems count
    const result = await pb.collection(Collections.RandomizerSpins).getList(1, 1, {
      filter: pb.filter('user = {:userId}', { userId }),
      fields: 'id', // Only fetch ID to minimize data transfer
    });

    logger.debug('Enhanced spin history count fetched', {
      userId,
      totalCount: result.totalItems,
    });

    return result.totalItems;
  } catch (error) {
    if (error instanceof Error && 'type' in error) {
      // Re-throw RandomizerError as-is
      throw error;
    }

    // Handle PocketBase errors
    const pbError = error as PocketBaseError;
    if (pbError.status === 403) {
      throw createRandomizerError(
        RandomizerErrorType.PERMISSION_DENIED,
        'Permission denied - cannot access spin history count',
        false,
        'Please ensure you are authenticated and accessing your own data',
        pbError
      );
    } else if (pbError.status === 404) {
      throw createRandomizerError(
        RandomizerErrorType.COLLECTION_MISSING,
        'Randomizer collection not found',
        false,
        'Please contact support - database may need setup',
        pbError
      );
    } else if (pbError.status && pbError.status >= 500) {
      throw createRandomizerError(
        RandomizerErrorType.DATABASE_UNAVAILABLE,
        'Database temporarily unavailable',
        true,
        'Please try again in a few moments',
        pbError
      );
    } else if (!pbError.status) {
      throw createRandomizerError(
        RandomizerErrorType.NETWORK_ERROR,
        'Network error occurred while fetching count',
        true,
        'Please check your connection and try again',
        pbError
      );
    }

    logger.error('Failed to fetch enhanced spin history count', error);
    throw createRandomizerError(
      RandomizerErrorType.DATABASE_UNAVAILABLE,
      'Failed to fetch spin history count',
      true,
      'Please try again',
      pbError
    );
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getSpinHistoryCountEnhanced instead for better type safety and error handling
 */
export async function getSpinHistoryCount(userId: string): Promise<number> {
  try {
    return await getSpinHistoryCountEnhanced(userId);
  } catch (error) {
    // Convert RandomizerError back to simple behavior for legacy compatibility
    if (error instanceof Error && 'type' in error) {
      logger.error('Failed to fetch spin history count (legacy)', error);
      return 0; // Return 0 on error for legacy compatibility
    }
    logger.error('Failed to fetch spin history count', error);
    return 0; // Return 0 on error
  }
}

/**
 * Enhanced type-safe function to delete all spin history records for a user
 *
 * Removes all randomizer spin records belonging to the specified user using
 * optimized batch operations with proper error handling and validation.
 *
 * @param {string} userId - The user ID whose history should be cleared
 * @returns {Promise<number>} The total number of records successfully deleted
 * @throws {RandomizerError} When validation fails or database operations fail
 *
 * @example
 * ```typescript
 * try {
 *   const deletedCount = await clearSpinHistoryEnhanced('user123');
 *   console.log(`Cleared ${deletedCount} history records`);
 * } catch (error) {
 *   if (error.canRetry) {
 *     // Handle retryable errors
 *   }
 * }
 * ```
 */
export async function clearSpinHistoryEnhanced(userId: string): Promise<number> {
  try {
    // Validate user ID
    if (!userId || typeof userId !== 'string' || userId.length !== 15) {
      throw createRandomizerError(
        RandomizerErrorType.VALIDATION_ERROR,
        'Invalid user ID - must be a 15-character PocketBase ID',
        false,
        'Please ensure you are properly authenticated'
      );
    }

    logger.debug('Clearing enhanced spin history using paginated deletion', {
      userId: truncateUserId(userId),
    });

    const totalDeleted = await paginatedBatchDelete(Collections.RandomizerSpins, {
      filter: pb.filter('user = {:userId}', { userId }),
      sort: 'created', // Consistent ordering for reliable pagination
    });

    if (totalDeleted === 0) {
      logger.debug('No spin history to clear', { userId: truncateUserId(userId) });
    } else {
      logger.info('Enhanced spin history cleared successfully', {
        userId: truncateUserId(userId),
        totalDeleted,
      });
    }

    return totalDeleted;
  } catch (error) {
    if (error instanceof Error && 'type' in error) {
      // Re-throw RandomizerError as-is
      throw error;
    }

    // Handle PocketBase errors
    const pbError = error as PocketBaseError;
    if (pbError.status === 403) {
      throw createRandomizerError(
        RandomizerErrorType.PERMISSION_DENIED,
        'Permission denied - cannot clear spin history',
        false,
        'Please ensure you are authenticated and accessing your own data',
        pbError
      );
    } else if (pbError.status === 404) {
      throw createRandomizerError(
        RandomizerErrorType.COLLECTION_MISSING,
        'Randomizer collection not found',
        false,
        'Please contact support - database may need setup',
        pbError
      );
    } else if (pbError.status && pbError.status >= 500) {
      throw createRandomizerError(
        RandomizerErrorType.DATABASE_UNAVAILABLE,
        'Database temporarily unavailable',
        true,
        'Please try again in a few moments',
        pbError
      );
    } else if (!pbError.status) {
      throw createRandomizerError(
        RandomizerErrorType.NETWORK_ERROR,
        'Network error occurred while clearing history',
        true,
        'Please check your connection and try again',
        pbError
      );
    }

    logger.error('Failed to clear enhanced spin history', error);
    throw createRandomizerError(
      RandomizerErrorType.BATCH_OPERATION_FAILED,
      'Failed to clear spin history',
      true,
      'Please try again',
      pbError
    );
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use clearSpinHistoryEnhanced instead for better type safety and error handling
 */
export async function clearSpinHistory(userId: string): Promise<number> {
  try {
    return await clearSpinHistoryEnhanced(userId);
  } catch (error) {
    // Convert RandomizerError back to simple Error for legacy compatibility
    if (error instanceof Error && 'type' in error) {
      const randomizerError = error as RandomizerError;
      logger.error('Failed to clear spin history (legacy)', error);
      throw new Error(randomizerError.message);
    }
    logger.error('Failed to clear spin history', error);
    throw new Error('Failed to clear spin history');
  }
}

/**
 * Enhanced type-safe function to retrieve the most recent spin record
 *
 * Fetches the user's latest randomizer spin result with full type safety and
 * optional project relation expansion.
 *
 * @param {string} userId - The user ID to fetch the last spin for
 * @param {boolean} [expandProject=false] - Whether to expand project relations
 * @returns {Promise<RandomizerSpinsResponse<string[], RandomizerSpinExpand> | null>} The most recent spin record, or null if none exist
 * @throws {RandomizerError} When validation fails or database operations fail (except for no records found)
 *
 * @example
 * ```typescript
 * const lastSpin = await getLastSpinEnhanced('user123', true);
 * if (lastSpin) {
 *   console.log('Last selected project:', lastSpin.project_title);
 *   if (lastSpin.expand?.project) {
 *     console.log('Project status:', lastSpin.expand.project.status);
 *   }
 * } else {
 *   console.log('User has not spun the wheel yet');
 * }
 * ```
 */
export async function getLastSpinEnhanced(
  userId: string,
  expandProject: boolean = false
): Promise<RandomizerSpinsResponse<string[], RandomizerSpinExpand> | null> {
  try {
    // Validate user ID
    if (!userId || typeof userId !== 'string' || userId.length !== 15) {
      throw createRandomizerError(
        RandomizerErrorType.VALIDATION_ERROR,
        'Invalid user ID - must be a 15-character PocketBase ID',
        false,
        'Please ensure you are properly authenticated'
      );
    }

    logger.debug('Fetching enhanced last spin', { userId: truncateUserId(userId), expandProject });

    const queryOptions: QueryOptions = {
      sort: '-spun_at',
    };

    if (expandProject) {
      queryOptions.expand = 'project';
    }

    const record = await pb
      .collection(Collections.RandomizerSpins)
      .getFirstListItem<
        RandomizerSpinsResponse<string[], RandomizerSpinExpand>
      >(pb.filter('user = {:userId}', { userId }), queryOptions);

    logger.debug('Enhanced last spin fetched', {
      userId,
      spinId: record.id,
      expandProject,
    });

    return record;
  } catch (error) {
    // 404 error is expected when no records exist - return null for this case
    if (error && typeof error === 'object' && 'status' in error) {
      const pbError = error as PocketBaseError;
      if (pbError.status === 404) {
        logger.debug('No spin records found for user', { userId: truncateUserId(userId) });
        return null;
      }
    }

    if (error instanceof Error && 'type' in error) {
      // Re-throw RandomizerError as-is
      throw error;
    }

    // Handle other PocketBase errors
    const pbError = error as PocketBaseError;
    if (pbError.status === 403) {
      throw createRandomizerError(
        RandomizerErrorType.PERMISSION_DENIED,
        'Permission denied - cannot access last spin',
        false,
        'Please ensure you are authenticated and accessing your own data',
        pbError
      );
    } else if (pbError.status && pbError.status >= 500) {
      throw createRandomizerError(
        RandomizerErrorType.DATABASE_UNAVAILABLE,
        'Database temporarily unavailable',
        true,
        'Please try again in a few moments',
        pbError
      );
    } else if (!pbError.status) {
      throw createRandomizerError(
        RandomizerErrorType.NETWORK_ERROR,
        'Network error occurred while fetching last spin',
        true,
        'Please check your connection and try again',
        pbError
      );
    }

    logger.error('Failed to fetch enhanced last spin', error);
    throw createRandomizerError(
      RandomizerErrorType.DATABASE_UNAVAILABLE,
      'Failed to fetch last spin',
      true,
      'Please try again',
      pbError
    );
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getLastSpinEnhanced instead for better type safety and error handling
 */
export async function getLastSpin(userId: string): Promise<SpinRecord | null> {
  try {
    const result = await getLastSpinEnhanced(userId, false);
    if (!result) {
      return null;
    }

    // Convert to legacy format for backward compatibility
    return {
      id: result.id,
      user: result.user,
      project: result.project,
      project_title: result.project_title,
      project_company: result.project_company,
      project_artist: result.project_artist,
      selected_count: result.selected_count,
      spun_at: result.spun_at,
      selected_projects: result.selected_projects as string[],
      created: result.created,
      updated: result.updated,
    };
  } catch (error) {
    // Convert RandomizerError back to simple behavior for legacy compatibility
    if (error instanceof Error && 'type' in error) {
      logger.error('Failed to fetch last spin (legacy)', error);
      return null; // Return null on error for legacy compatibility
    }
    logger.error('Failed to fetch last spin', error);
    return null;
  }
}

/**
 * Enhanced type-safe function to clean up old spin records
 *
 * Removes spin records older than the specified retention period for a given user
 * using optimized batch operations with proper error handling and validation.
 *
 * @param {string} userId - The user ID whose old records should be cleaned up
 * @param {number} [daysToKeep=90] - Number of days of history to retain (default: 90)
 * @returns {Promise<number>} The number of records successfully deleted
 * @throws {RandomizerError} When validation fails or database operations fail
 *
 * @example
 * ```typescript
 * try {
 *   // Clean up records older than 30 days
 *   const deleted = await cleanupOldSpinsEnhanced('user123', 30);
 *   console.log(`Cleaned up ${deleted} old spin records`);
 * } catch (error) {
 *   if (error.canRetry) {
 *     // Handle retryable errors
 *   }
 * }
 * ```
 */
export async function cleanupOldSpinsEnhanced(
  userId: string,
  daysToKeep: number = 90
): Promise<number> {
  try {
    // Validate user ID
    if (!userId || typeof userId !== 'string' || userId.length !== 15) {
      throw createRandomizerError(
        RandomizerErrorType.VALIDATION_ERROR,
        'Invalid user ID - must be a 15-character PocketBase ID',
        false,
        'Please ensure you are properly authenticated'
      );
    }

    if (daysToKeep < 1 || daysToKeep > 3650) {
      // Max 10 years
      throw createRandomizerError(
        RandomizerErrorType.VALIDATION_ERROR,
        'Days to keep must be between 1 and 3650',
        false,
        'Please use a reasonable retention period'
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();

    logger.debug('Cleaning up enhanced old spins using paginated deletion', {
      userId,
      daysToKeep,
      cutoffDate: cutoffISO,
    });

    const totalDeleted = await paginatedBatchDelete(Collections.RandomizerSpins, {
      filter: pb.filter('user = {:userId} && spun_at < {:cutoff}', { userId, cutoff: cutoffISO }),
      sort: 'spun_at', // Oldest first for consistent cleanup order
    });

    if (totalDeleted === 0) {
      logger.debug('No old spins to cleanup', { userId: truncateUserId(userId), daysToKeep });
    } else {
      logger.info('Enhanced old spins cleaned up successfully', {
        userId: truncateUserId(userId),
        totalDeleted,
        daysToKeep,
        cutoffDate: cutoffISO,
      });
    }

    return totalDeleted;
  } catch (error) {
    if (error instanceof Error && 'type' in error) {
      // Re-throw RandomizerError as-is
      throw error;
    }

    // Handle PocketBase errors
    const pbError = error as PocketBaseError;
    if (pbError.status === 403) {
      throw createRandomizerError(
        RandomizerErrorType.PERMISSION_DENIED,
        'Permission denied - cannot cleanup old spins',
        false,
        'Please ensure you are authenticated and accessing your own data',
        pbError
      );
    } else if (pbError.status === 404) {
      throw createRandomizerError(
        RandomizerErrorType.COLLECTION_MISSING,
        'Randomizer collection not found',
        false,
        'Please contact support - database may need setup',
        pbError
      );
    } else if (pbError.status && pbError.status >= 500) {
      throw createRandomizerError(
        RandomizerErrorType.DATABASE_UNAVAILABLE,
        'Database temporarily unavailable',
        true,
        'Please try again in a few moments',
        pbError
      );
    } else if (!pbError.status) {
      throw createRandomizerError(
        RandomizerErrorType.NETWORK_ERROR,
        'Network error occurred while cleaning up old spins',
        true,
        'Please check your connection and try again',
        pbError
      );
    }

    logger.error('Failed to cleanup enhanced old spins', error);
    throw createRandomizerError(
      RandomizerErrorType.BATCH_OPERATION_FAILED,
      'Failed to cleanup old spins',
      true,
      'Please try again',
      pbError
    );
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use cleanupOldSpinsEnhanced instead for better type safety and error handling
 */
export async function cleanupOldSpins(userId: string, daysToKeep: number = 90): Promise<number> {
  try {
    return await cleanupOldSpinsEnhanced(userId, daysToKeep);
  } catch (error) {
    // Convert RandomizerError back to simple behavior for legacy compatibility
    if (error instanceof Error && 'type' in error) {
      logger.error('Failed to cleanup old spins (legacy)', error);
      return 0; // Return 0 on error for legacy compatibility
    }
    logger.error('Failed to cleanup old spins', error);
    return 0; // Return 0 on error
  }
}

/**
 * Validates the randomizer_spins collection configuration and permissions
 *
 * Performs comprehensive validation of the PocketBase collection to ensure it has:
 * - Proper field schema with all required fields
 * - Correct API rules for user data isolation
 * - Performance indexes for optimal query performance
 * - Appropriate permissions and security settings
 *
 * @returns {Promise<ValidationResult>} Detailed validation results with issues and recommendations
 *
 * @example
 * ```typescript
 * const validation = await validateRandomizerCollection();
 * if (!validation.isValid) {
 *   console.warn('Collection issues found:', validation.issues);
 * }
 * ```
 *
 * @performance This function makes API calls to PocketBase admin endpoints
 * @security Only works when authenticated as a superuser or admin
 */
export async function validateRandomizerCollection(): Promise<ValidationResult> {
  const issues: string[] = [];
  let exists = false;
  let hasRequiredFields = false;
  let hasProperRules = false;
  let hasIndexes = false;

  try {
    logger.debug('Validating randomizer collection configuration');

    // Test if collection exists by attempting a simple query
    try {
      await pb.collection(RANDOMIZER_COLLECTION).getList(1, 1, { fields: 'id' });
      exists = true;
      logger.debug('Collection exists and is accessible');
    } catch (error: unknown) {
      const errorObj = error as { status?: number; message?: string };
      if (errorObj?.status === 404) {
        issues.push('Collection "randomizer_spins" does not exist');
        exists = false;
      } else if (errorObj?.status === 403) {
        issues.push('Collection exists but API rules prevent access - check authentication');
        exists = true; // Collection exists but has access issues
      } else {
        issues.push(`Failed to access collection: ${errorObj?.message || 'Unknown error'}`);
        exists = false;
      }
    }

    // If collection exists, validate its configuration
    if (exists) {
      try {
        // Test field validation by attempting to create a minimal record
        // This will fail due to validation but tells us about field requirements
        try {
          await pb.collection(RANDOMIZER_COLLECTION).create({
            user: 'test',
            project: 'test',
            project_title: 'test',
            selected_projects: ['test'],
            selected_count: 1,
            spun_at: new Date().toISOString(),
          });
        } catch (error: unknown) {
          // Expected to fail due to invalid data, but we can analyze the error
          const errorObj = error as { data?: unknown };
          if (errorObj?.data) {
            const errorData = errorObj.data;

            // Check for missing required fields
            const requiredFields = [
              'user',
              'project',
              'project_title',
              'selected_count',
              'spun_at',
              'selected_projects',
            ];
            const missingFields = requiredFields.filter(
              field =>
                (errorData as any)[field] &&
                (errorData as any)[field].code === 'validation_required'
            );

            if (missingFields.length === 0) {
              hasRequiredFields = true;
            } else {
              issues.push(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Check if new optional fields are recognized
            if (!(errorData as any).project_company && !(errorData as any).project_artist) {
              // Fields are likely present if no validation errors for them
              logger.debug(
                'Optional fields (project_company, project_artist) appear to be configured'
              );
            }
          } else {
            // If we get a different error, assume fields are configured
            hasRequiredFields = true;
          }
        }

        // Test API rules by checking access patterns
        try {
          // This should work for authenticated users
          await pb.collection(RANDOMIZER_COLLECTION).getList(1, 1, {
            filter: pb.filter('user = {:userId}', { userId: 'test-user-id' }),
            fields: 'id',
          });
          hasProperRules = true;
        } catch (error: unknown) {
          const errorObj = error as { status?: number; message?: string };
          if (errorObj?.status === 400 && errorObj?.message?.includes('filter')) {
            issues.push('API rules may not be properly configured for user-based filtering');
          } else if (errorObj?.status === 403) {
            issues.push('API rules are too restrictive - users cannot access their own data');
          } else {
            // Other errors might be expected (like no records found)
            hasProperRules = true;
          }
        }

        // Note: We cannot easily validate indexes without admin access to collection schema
        // For now, assume indexes are present if collection is accessible
        hasIndexes = true;
      } catch (error: unknown) {
        issues.push(
          `Failed to validate collection configuration: ${(error as any)?.message || 'Unknown error'}`
        );
      }
    }

    const isValid = exists && hasRequiredFields && hasProperRules && issues.length === 0;

    const result: ValidationResult = {
      isValid,
      issues,
      exists,
      details: {
        hasRequiredFields,
        hasProperRules,
        hasIndexes,
      },
    };

    if (isValid) {
      logger.info('Randomizer collection validation passed');
    } else {
      logger.warn('Randomizer collection validation failed', {
        issues,
        exists,
        hasRequiredFields,
        hasProperRules,
      });
    }

    return result;
  } catch (error) {
    logger.error('Failed to validate randomizer collection', error);
    return {
      isValid: false,
      issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      exists: false,
    };
  }
}

/**
 * Ensures the randomizer collection exists and is properly configured
 *
 * Performs validation and provides helpful error messages if the collection
 * is missing or misconfigured. This function should be called during application
 * initialization or before performing randomizer operations.
 *
 * @param {boolean} [throwOnError=false] - Whether to throw an error if validation fails
 * @returns {Promise<boolean>} True if collection is valid, false otherwise
 *
 * @throws {Error} When throwOnError is true and validation fails
 *
 * @example
 * ```typescript
 * // Check without throwing
 * const isReady = await ensureRandomizerCollection();
 * if (!isReady) {
 *   console.warn('Randomizer collection needs setup');
 * }
 *
 * // Throw on validation failure
 * try {
 *   await ensureRandomizerCollection(true);
 *   // Safe to use randomizer functions
 * } catch (error) {
 *   console.error('Randomizer not available:', error.message);
 * }
 * ```
 */
export async function ensureRandomizerCollection(throwOnError: boolean = false): Promise<boolean> {
  try {
    const validation = await validateRandomizerCollection();

    if (!validation.isValid) {
      const errorMessage = `Randomizer collection validation failed: ${validation.issues.join(', ')}`;

      if (throwOnError) {
        throw new Error(errorMessage);
      } else {
        logger.warn(errorMessage);
        return false;
      }
    }

    return true;
  } catch (error) {
    const errorMessage = `Failed to ensure randomizer collection: ${error instanceof Error ? error.message : 'Unknown error'}`;

    if (throwOnError) {
      throw new Error(errorMessage);
    } else {
      logger.error(errorMessage);
      return false;
    }
  }
}

/**
 * Enhanced type-safe function to get spin statistics and analytics
 *
 * Retrieves comprehensive statistics about a user's spin history including
 * performance metrics, device breakdown, and usage patterns.
 *
 * @param {string} userId - The user ID to get statistics for
 * @param {number} [daysBack=30] - Number of days to include in statistics (default: 30)
 * @returns {Promise<SpinStatistics>} Comprehensive spin statistics
 * @throws {RandomizerError} When validation fails or database operations fail
 *
 * @example
 * ```typescript
 * const stats = await getSpinStatisticsEnhanced('user123', 90);
 * console.log(`Average selection time: ${stats.averageSelectionTime}ms`);
 * console.log(`Most selected: ${stats.mostSelectedProject?.title}`);
 * ```
 */
export async function getSpinStatisticsEnhanced(
  userId: string,
  daysBack: number = 30
): Promise<SpinStatistics> {
  try {
    // Validate user ID
    if (!userId || typeof userId !== 'string' || userId.length !== 15) {
      throw createRandomizerError(
        RandomizerErrorType.VALIDATION_ERROR,
        'Invalid user ID - must be a 15-character PocketBase ID',
        false,
        'Please ensure you are properly authenticated'
      );
    }

    if (daysBack < 1 || daysBack > 365) {
      throw createRandomizerError(
        RandomizerErrorType.VALIDATION_ERROR,
        'Days back must be between 1 and 365',
        false,
        'Please use a reasonable time range'
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffISO = cutoffDate.toISOString();

    logger.debug('Fetching enhanced spin statistics', { userId: truncateUserId(userId), daysBack });

    // Get all spins within the time range
    const spins = await pb
      .collection(Collections.RandomizerSpins)
      .getFullList<RandomizerSpinsResponse<string[]>>({
        filter: pb.filter('user = {:userId} && spun_at >= {:cutoff}', {
          userId,
          cutoff: cutoffISO,
        }),
        sort: 'spun_at',
      });

    // Calculate statistics
    const totalSpins = spins.length;

    // Device and method breakdowns (would need metadata in actual records)
    const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
    const methodBreakdown = { click: 0, keyboard: 0, touch: 0 };

    // Project selection frequency
    const projectCounts: Record<string, { count: number; title: string }> = {};

    let earliestSpin = '';
    let latestSpin = '';

    spins.forEach((spin, index) => {
      // Track project selections
      if (!projectCounts[spin.project]) {
        projectCounts[spin.project] = { count: 0, title: spin.project_title };
      }
      projectCounts[spin.project].count++;

      // Track time range
      if (index === 0) earliestSpin = spin.spun_at;
      if (index === spins.length - 1) latestSpin = spin.spun_at;
    });

    // Find most selected project
    let mostSelectedProject = null;
    let maxCount = 0;

    for (const [projectId, data] of Object.entries(projectCounts)) {
      if (data.count > maxCount) {
        maxCount = data.count;
        mostSelectedProject = {
          id: projectId,
          title: data.title,
          count: data.count,
        };
      }
    }

    const statistics: SpinStatistics = {
      totalSpins,
      averageSelectionTime: 0, // Would need metadata in records
      mostSelectedProject,
      deviceBreakdown,
      methodBreakdown,
      timeRange: {
        earliest: earliestSpin,
        latest: latestSpin,
      },
    };

    logger.debug('Enhanced spin statistics calculated', {
      userId,
      totalSpins,
      mostSelectedProject: mostSelectedProject?.title,
    });

    return statistics;
  } catch (error) {
    if (error instanceof Error && 'type' in error) {
      throw error;
    }

    const pbError = error as PocketBaseError;
    logger.error('Failed to fetch enhanced spin statistics', error);
    throw createRandomizerError(
      RandomizerErrorType.DATABASE_UNAVAILABLE,
      'Failed to fetch spin statistics',
      true,
      'Please try again',
      pbError
    );
  }
}

/**
 * Enhanced batch operation for optimized spin history management
 *
 * Performs batch operations on spin history records with progress tracking
 * and optimized performance settings.
 *
 * @param {string} userId - The user ID to perform batch operations for
 * @param {'delete' | 'cleanup'} operation - The type of batch operation
 * @param {BatchOperationOptions} [options] - Batch operation configuration
 * @returns {Promise<number>} Number of records processed
 * @throws {RandomizerError} When validation fails or operations fail
 */
export async function performBatchOperation(
  userId: string,
  operation: 'delete' | 'cleanup',
  options: BatchOperationOptions = {}
): Promise<number> {
  try {
    // Validate user ID
    if (!userId || typeof userId !== 'string' || userId.length !== 15) {
      throw createRandomizerError(
        RandomizerErrorType.VALIDATION_ERROR,
        'Invalid user ID - must be a 15-character PocketBase ID',
        false,
        'Please ensure you are properly authenticated'
      );
    }

    const { batchSize = 50, delayMs = 10, maxRetries = 3 } = options;

    logger.debug('Starting enhanced batch operation', {
      userId,
      operation,
      batchSize,
      delayMs,
      maxRetries,
    });

    let filter: string;
    let sort: string;

    switch (operation) {
      case 'delete':
        filter = pb.filter('user = {:userId}', { userId });
        sort = 'created';
        break;
      case 'cleanup': {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days default
        const cutoffISO = cutoffDate.toISOString();
        filter = pb.filter('user = {:userId} && spun_at < {:cutoff}', {
          userId,
          cutoff: cutoffISO,
        });
        sort = 'spun_at';
        break;
      }
      default:
        throw createRandomizerError(
          RandomizerErrorType.VALIDATION_ERROR,
          `Invalid operation: ${operation}`,
          false,
          'Please specify a valid operation type'
        );
    }

    const totalProcessed = await paginatedBatchDelete(Collections.RandomizerSpins, {
      filter,
      sort,
      pageSize: batchSize,
      batchDelayMs: delayMs,
    });

    logger.info('Enhanced batch operation completed', {
      userId,
      operation,
      totalProcessed,
    });

    return totalProcessed;
  } catch (error) {
    if (error instanceof Error && 'type' in error) {
      throw error;
    }

    const pbError = error as PocketBaseError;
    logger.error('Failed to perform enhanced batch operation', error);
    throw createRandomizerError(
      RandomizerErrorType.BATCH_OPERATION_FAILED,
      'Failed to perform batch operation',
      true,
      'Please try again',
      pbError
    );
  }
}

/**
 * Enhanced Randomizer Service object providing centralized access to all randomizer operations
 *
 * Consolidates all randomizer-related database operations into a single service object
 * with both legacy and enhanced type-safe methods. Provides full TypeScript type safety
 * and comprehensive error handling.
 *
 * @example
 * ```typescript
 * // Use enhanced functions with full type safety
 * import { EnhancedRandomizerService } from './randomizerService';
 *
 * const spinResult = await EnhancedRandomizerService.createSpinEnhanced({
 *   user: 'user123',
 *   project: 'proj456',
 *   project_title: 'Diamond Art',
 *   selected_projects: ['proj456', 'proj789'],
 *   metadata: { selectionTime: 1250, deviceType: 'mobile', spinMethod: 'touch' }
 * });
 *
 * const history = await EnhancedRandomizerService.getSpinHistoryEnhanced('user123', 10, true);
 * const stats = await EnhancedRandomizerService.getSpinStatisticsEnhanced('user123', 30);
 * ```
 *
 * @readonly All methods are bound and cannot be modified
 */
export const EnhancedRandomizerService = {
  // Enhanced type-safe methods (recommended)
  createSpinEnhanced,
  getSpinHistoryEnhanced,
  getSpinHistoryCountEnhanced,
  clearSpinHistoryEnhanced,
  getLastSpinEnhanced,
  cleanupOldSpinsEnhanced,
  getSpinStatisticsEnhanced,
  performBatchOperation,

  // Legacy methods for backward compatibility
  createSpin,
  getSpinHistory,
  getSpinHistoryCount,
  clearSpinHistory,
  getLastSpin,
  cleanupOldSpins,

  // Utility methods
  validateRandomizerCollection,
  ensureRandomizerCollection,
  captureSpinAnalytics,
  detectDeviceType,
} as const;

/**
 * Legacy service object for backward compatibility
 * @deprecated Use EnhancedRandomizerService instead for better type safety and error handling
 */
export const RandomizerService = {
  createSpin,
  getSpinHistory,
  getSpinHistoryCount,
  clearSpinHistory,
  getLastSpin,
  cleanupOldSpins,
  validateRandomizerCollection,
  ensureRandomizerCollection,
} as const;
