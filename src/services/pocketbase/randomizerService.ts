/**
 * Randomizer Service for PocketBase
 * 
 * Handles CRUD operations for randomizer spin history.
 * Follows existing service patterns with proper error handling and logging.
 */

import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('RandomizerService');

export interface SpinRecord {
  id: string;
  user: string;
  project: string;
  project_title: string;
  spun_at: string;
  selected_projects: string[];
  created: string;
  updated: string;
}

export interface CreateSpinParams {
  user: string;
  project: string;
  project_title: string;
  selected_projects: string[];
}

const RANDOMIZER_COLLECTION = 'randomizer_spins';

/**
 * Create a new spin record
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
 * Get spin history for a user
 */
export async function getSpinHistory(
  userId: string, 
  limit: number = 10
): Promise<SpinRecord[]> {
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
 * Delete all spin history for a user (optional cleanup feature)
 */
export async function clearSpinHistory(userId: string): Promise<void> {
  try {
    logger.debug('Clearing spin history', { userId });

    const records = await pb.collection(RANDOMIZER_COLLECTION).getFullList({
      filter: pb.filter('user = {:userId}', { userId }),
      fields: 'id',
    });

    if (records.length === 0) {
      logger.debug('No spin history to clear', { userId });
      return;
    }

    // Delete records in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await Promise.all(
        batch.map(record => pb.collection(RANDOMIZER_COLLECTION).delete(record.id))
      );
    }

    logger.info('Spin history cleared', {
      userId,
      deletedCount: records.length,
    });
  } catch (error) {
    logger.error('Failed to clear spin history', error);
    throw new Error('Failed to clear spin history');
  }
}

/**
 * Get the most recent spin for a user
 */
export async function getLastSpin(userId: string): Promise<SpinRecord | null> {
  try {
    const record = await pb.collection(RANDOMIZER_COLLECTION).getFirstListItem(
      pb.filter('user = {:userId}', { userId }),
      {
        sort: '-spun_at',
        fields: 'id,user,project,project_title,spun_at,selected_projects,created,updated',
      }
    );

    return record as unknown as SpinRecord;
  } catch (error) {
    // 404 error is expected when no records exist
    if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 404) {
      return null;
    }
    
    logger.error('Failed to fetch last spin', error);
    return null;
  }
}

/**
 * Auto-cleanup old spin records (older than 90 days)
 * This can be called periodically to maintain database size
 */
export async function cleanupOldSpins(userId: string, daysToKeep: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();

    logger.debug('Cleaning up old spins', { userId, daysToKeep, cutoffDate: cutoffISO });

    const oldRecords = await pb.collection(RANDOMIZER_COLLECTION).getFullList({
      filter: pb.filter('user = {:userId} && spun_at < {:cutoff}', { userId, cutoff: cutoffISO }),
      fields: 'id',
    });

    if (oldRecords.length === 0) {
      logger.debug('No old spins to cleanup', { userId });
      return 0;
    }

    // Delete in batches
    const batchSize = 50;
    for (let i = 0; i < oldRecords.length; i += batchSize) {
      const batch = oldRecords.slice(i, i + batchSize);
      await Promise.all(
        batch.map(record => pb.collection(RANDOMIZER_COLLECTION).delete(record.id))
      );
    }

    logger.info('Old spins cleaned up', {
      userId,
      deletedCount: oldRecords.length,
      daysToKeep,
    });

    return oldRecords.length;
  } catch (error) {
    logger.error('Failed to cleanup old spins', error);
    return 0;
  }
}

// Export service object for consistency with other services
export const RandomizerService = {
  createSpin,
  getSpinHistory,
  clearSpinHistory,
  getLastSpin,
  cleanupOldSpins,
} as const;