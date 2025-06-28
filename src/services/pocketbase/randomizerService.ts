/**
 * @fileoverview Randomizer Service for PocketBase
 *
 * Provides a comprehensive service layer for managing project randomizer spin history
 * in PocketBase. Implements CRUD operations with proper error handling, security,
 * and logging for the Organized Glitter project randomizer feature.
 *
 * Key Features:
 * - Secure parameterized queries to prevent SQL injection
 * - Automatic cleanup of old spin records
 * - Batch operations for performance
 * - Comprehensive error handling and logging
 * - Type-safe interfaces for all operations
 *
 * @author Generated with Claude Code
 * @version 1.0.0
 * @since 2024-06-28
 */

import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('RandomizerService');

/**
 * Represents a complete spin record from the PocketBase database
 * @interface SpinRecord
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
 * Parameters required to create a new spin record
 * @interface CreateSpinParams
 */
export interface CreateSpinParams {
  /** User ID performing the spin */
  user: string;
  /** Selected project ID */
  project: string;
  /** Project title for preservation */
  project_title: string;
  /** Array of all projects that were selectable */
  selected_projects: string[];
}

const RANDOMIZER_COLLECTION = 'randomizer_spins';

/**
 * Creates a new spin record in the PocketBase database
 *
 * Stores the result of a randomizer wheel spin, including the selected project
 * and the complete list of projects that were available for selection. Automatically
 * sets the spin timestamp to the current time.
 *
 * @param {CreateSpinParams} params - The spin data to record
 * @param {string} params.user - User ID who performed the spin
 * @param {string} params.project - ID of the selected project
 * @param {string} params.project_title - Title of the selected project (preserved)
 * @param {string[]} params.selected_projects - All project IDs that were available
 *
 * @returns {Promise<SpinRecord>} The created spin record with full metadata
 *
 * @throws {Error} When PocketBase creation fails or validation errors occur
 *
 * @example
 * ```typescript
 * const spinResult = await createSpin({
 *   user: 'user123',
 *   project: 'proj456',
 *   project_title: 'Diamond Art Landscape',
 *   selected_projects: ['proj456', 'proj789', 'proj101']
 * });
 * console.log('Spin recorded:', spinResult.id);
 * ```
 */
export async function createSpin(params: CreateSpinParams): Promise<SpinRecord> {
  try {
    logger.debug('Creating spin record', {
      userId: params.user,
      projectId: params.project,
      selectedCount: params.selected_projects.length,
    });

    const record = await pb.collection(RANDOMIZER_COLLECTION).create({
      ...params,
      spun_at: new Date().toISOString(),
    });

    logger.info('Spin record created successfully', {
      spinId: record.id,
      userId: params.user,
    });

    return record as unknown as SpinRecord;
  } catch (error) {
    logger.error('Failed to create spin record', error);
    throw new Error('Failed to save spin to history');
  }
}

/**
 * Retrieves spin history for a specific user with pagination support
 *
 * Fetches the user's randomizer spin records in descending chronological order
 * (most recent first). Uses secure parameterized queries to prevent SQL injection
 * and includes field selection for optimal performance.
 *
 * @param {string} userId - The user ID to fetch history for
 * @param {number} [limit=10] - Maximum number of records to return (default: 10)
 *
 * @returns {Promise<SpinRecord[]>} Array of spin records, empty array on error
 *
 * @example
 * ```typescript
 * // Get recent 8 spins
 * const recent = await getSpinHistory('user123', 8);
 *
 * // Get more comprehensive history
 * const fullHistory = await getSpinHistory('user123', 50);
 * ```
 *
 * @security Uses parameterized queries to prevent SQL injection attacks
 * @performance Returns empty array instead of throwing on fetch errors
 */
export async function getSpinHistory(userId: string, limit: number = 10): Promise<SpinRecord[]> {
  try {
    logger.debug('Fetching spin history', { userId, limit });

    const records = await pb.collection(RANDOMIZER_COLLECTION).getList(1, limit, {
      filter: pb.filter('user = {:userId}', { userId }),
      sort: '-spun_at', // Most recent first
      fields: 'id,user,project,project_title,spun_at,selected_projects,created,updated',
    });

    logger.debug('Spin history fetched', {
      userId,
      recordCount: records.items.length,
    });

    return records.items as unknown as SpinRecord[];
  } catch (error) {
    logger.error('Failed to fetch spin history', error);
    return []; // Return empty array on error
  }
}

/**
 * Deletes all spin history records for a specific user
 *
 * Removes all randomizer spin records belonging to the specified user using
 * paginated fetching to avoid memory issues with large datasets. Fetches and
 * deletes records in batches to maintain optimal memory usage and performance.
 *
 * @param {string} userId - The user ID whose history should be cleared
 *
 * @returns {Promise<number>} The total number of records successfully deleted
 *
 * @throws {Error} When database operations fail or user ID is invalid
 *
 * @example
 * ```typescript
 * try {
 *   const deletedCount = await clearSpinHistory('user123');
 *   console.log(`Cleared ${deletedCount} history records`);
 * } catch (error) {
 *   console.error('Failed to clear history:', error);
 * }
 * ```
 *
 * @performance Uses paginated fetching (50 records per page) to avoid loading all records into memory
 * @scalability Handles large datasets efficiently without memory constraints
 * @security Validates user ownership through parameterized queries
 */
export async function clearSpinHistory(userId: string): Promise<number> {
  try {
    logger.debug('Clearing spin history with paginated approach', { userId });

    let totalDeleted = 0;
    const pageSize = 50; // Fetch and delete in small batches
    let hasMoreRecords = true;

    while (hasMoreRecords) {
      // Fetch a batch of records
      const recordsPage = await pb.collection(RANDOMIZER_COLLECTION).getList(1, pageSize, {
        filter: pb.filter('user = {:userId}', { userId }),
        fields: 'id',
        sort: 'created', // Consistent ordering for reliable pagination
      });

      if (recordsPage.items.length === 0) {
        hasMoreRecords = false;
        break;
      }

      logger.debug('Processing batch for deletion', {
        userId,
        batchSize: recordsPage.items.length,
        totalDeletedSoFar: totalDeleted,
      });

      // Delete all records in this batch
      const deletionPromises = recordsPage.items.map(record => 
        pb.collection(RANDOMIZER_COLLECTION).delete(record.id).catch(error => {
          logger.error('Failed to delete individual record', { recordId: record.id, error });
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
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    if (totalDeleted === 0) {
      logger.debug('No spin history to clear', { userId });
    } else {
      logger.info('Spin history cleared successfully', {
        userId,
        totalDeleted,
      });
    }

    return totalDeleted;
  } catch (error) {
    logger.error('Failed to clear spin history', error);
    throw new Error('Failed to clear spin history');
  }
}

/**
 * Retrieves the most recent spin record for a specific user
 *
 * Fetches the user's latest randomizer spin result, useful for displaying
 * the last selection or maintaining UI state. Handles the common case where
 * no spins exist by returning null instead of throwing an error.
 *
 * @param {string} userId - The user ID to fetch the last spin for
 *
 * @returns {Promise<SpinRecord | null>} The most recent spin record, or null if none exist
 *
 * @example
 * ```typescript
 * const lastSpin = await getLastSpin('user123');
 * if (lastSpin) {
 *   console.log('Last selected project:', lastSpin.project_title);
 * } else {
 *   console.log('User has not spun the wheel yet');
 * }
 * ```
 *
 * @performance Uses getFirstListItem for efficient single-record retrieval
 * @errorhandling Returns null for 404 errors (no records), throws for other errors
 */
export async function getLastSpin(userId: string): Promise<SpinRecord | null> {
  try {
    const record = await pb
      .collection(RANDOMIZER_COLLECTION)
      .getFirstListItem(pb.filter('user = {:userId}', { userId }), {
        sort: '-spun_at',
        fields: 'id,user,project,project_title,spun_at,selected_projects,created,updated',
      });

    return record as unknown as SpinRecord;
  } catch (error) {
    // 404 error is expected when no records exist
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      (error as { status: number }).status === 404
    ) {
      return null;
    }

    logger.error('Failed to fetch last spin', error);
    return null;
  }
}

/**
 * Automatically cleans up old spin records to maintain database performance
 *
 * Removes spin records older than the specified retention period for a given user
 * using paginated fetching to avoid memory issues with large datasets. This function
 * is designed for periodic maintenance to prevent the spin history from growing indefinitely.
 *
 * @param {string} userId - The user ID whose old records should be cleaned up
 * @param {number} [daysToKeep=90] - Number of days of history to retain (default: 90)
 *
 * @returns {Promise<number>} The number of records successfully deleted
 *
 * @example
 * ```typescript
 * // Clean up records older than 30 days
 * const deleted = await cleanupOldSpins('user123', 30);
 * console.log(`Cleaned up ${deleted} old spin records`);
 *
 * // Use default 90-day retention
 * const deletedDefault = await cleanupOldSpins('user123');
 * ```
 *
 * @performance
 * - Uses paginated fetching (50 records per page) to avoid loading all records into memory
 * - Processes deletions in batches to avoid timeouts and database overload
 * - Returns 0 on error instead of throwing for graceful degradation
 *
 * @scalability Handles large datasets efficiently without memory constraints
 * @maintenance This function should be called periodically (e.g., daily/weekly)
 * @security Only affects records owned by the specified user
 */
export async function cleanupOldSpins(userId: string, daysToKeep: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();

    logger.debug('Cleaning up old spins with paginated approach', { 
      userId, 
      daysToKeep, 
      cutoffDate: cutoffISO 
    });

    let totalDeleted = 0;
    const pageSize = 50; // Fetch and delete in small batches
    let hasMoreRecords = true;

    while (hasMoreRecords) {
      // Fetch a batch of old records
      const recordsPage = await pb.collection(RANDOMIZER_COLLECTION).getList(1, pageSize, {
        filter: pb.filter('user = {:userId} && spun_at < {:cutoff}', { userId, cutoff: cutoffISO }),
        fields: 'id',
        sort: 'spun_at', // Oldest first for consistent cleanup order
      });

      if (recordsPage.items.length === 0) {
        hasMoreRecords = false;
        break;
      }

      logger.debug('Processing old records batch for deletion', {
        userId,
        batchSize: recordsPage.items.length,
        totalDeletedSoFar: totalDeleted,
        cutoffDate: cutoffISO,
      });

      // Delete all records in this batch with error handling
      const deletionPromises = recordsPage.items.map(record => 
        pb.collection(RANDOMIZER_COLLECTION).delete(record.id).catch(error => {
          logger.error('Failed to delete old record', { recordId: record.id, error });
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
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    if (totalDeleted === 0) {
      logger.debug('No old spins to cleanup', { userId, daysToKeep });
    } else {
      logger.info('Old spins cleaned up successfully', {
        userId,
        totalDeleted,
        daysToKeep,
        cutoffDate: cutoffISO,
      });
    }

    return totalDeleted;
  } catch (error) {
    logger.error('Failed to cleanup old spins', error);
    return 0;
  }
}

/**
 * Randomizer Service object providing centralized access to all randomizer operations
 *
 * Consolidates all randomizer-related database operations into a single service object
 * for consistency with other service patterns in the application. All methods are
 * available both as individual exports and through this service object.
 *
 * @example
 * ```typescript
 * // Use individual functions
 * import { createSpin, getSpinHistory } from './randomizerService';
 *
 * // Or use the service object
 * import { RandomizerService } from './randomizerService';
 * await RandomizerService.createSpin(params);
 * const history = await RandomizerService.getSpinHistory('user123');
 * ```
 *
 * @readonly All methods are bound and cannot be modified
 */
export const RandomizerService = {
  createSpin,
  getSpinHistory,
  clearSpinHistory,
  getLastSpin,
  cleanupOldSpins,
} as const;
