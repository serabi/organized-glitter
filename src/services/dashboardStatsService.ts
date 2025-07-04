/**
 * Dashboard Stats Service - Real-time Count Management
 * @author @serabi
 * @created 2025-07-04
 */

import { pb } from '@/lib/pocketbase';
import { Collections, UserDashboardStatsRecord } from '@/types/pocketbase.types';
import { ProjectStatusChangeEvent } from '@/types/user-dashboard-stats';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('DashboardStatsService');

/**
 * Update dashboard stats when a project status changes
 */
export async function updateDashboardStats(event: ProjectStatusChangeEvent): Promise<void> {
  const { userId, oldStatus, newStatus, operation } = event;

  logger.debug(`📊 Updating dashboard stats for user ${userId}:`, {
    operation,
    oldStatus,
    newStatus,
  });

  try {
    // Get current stats
    let statsRecord: UserDashboardStatsRecord;
    try {
      statsRecord = await pb
        .collection(Collections.UserDashboardStats)
        .getFirstListItem<UserDashboardStatsRecord>(`user="${userId}"`);
    } catch (error) {
      if (error?.status === 404) {
        // Stats don't exist yet, initialize them
        logger.info(`🔧 Initializing dashboard stats for user ${userId}`);
        await initializeUserStats(userId);
        statsRecord = await pb
          .collection(Collections.UserDashboardStats)
          .getFirstListItem<UserDashboardStatsRecord>(`user="${userId}"`);
      } else {
        throw error;
      }
    }

    // Calculate new counts
    const updates = calculateStatsUpdate(statsRecord, operation, oldStatus, newStatus);

    // Update the record
    await pb.collection(Collections.UserDashboardStats).update(statsRecord.id, {
      ...updates,
      last_updated: new Date().toISOString(),
    });

    logger.debug('✅ Dashboard stats updated successfully:', updates);
  } catch (error) {
    logger.error('❌ Failed to update dashboard stats:', error);
    // Don't throw - stats updates shouldn't break the main flow
  }
}

/**
 * Calculate what updates need to be made to stats
 */
function calculateStatsUpdate(
  currentStats: UserDashboardStatsRecord,
  operation: 'create' | 'update' | 'delete',
  oldStatus?: string | null,
  newStatus?: string
): Partial<UserDashboardStatsRecord> {
  const updates: Partial<UserDashboardStatsRecord> = {};

  switch (operation) {
    case 'create':
      // Increment new status and total
      if (newStatus && isValidStatus(newStatus)) {
        updates[newStatus] = currentStats[newStatus] + 1;
        updates.all = currentStats.all + 1;
        updates.total_projects = currentStats.total_projects + 1;
      }
      break;

    case 'update':
      // Decrement old status, increment new status
      if (oldStatus && isValidStatus(oldStatus)) {
        updates[oldStatus] = Math.max(0, currentStats[oldStatus] - 1);
      }
      if (newStatus && isValidStatus(newStatus)) {
        updates[newStatus] = currentStats[newStatus] + 1;
      }
      break;

    case 'delete':
      // Decrement old status and total
      if (oldStatus && isValidStatus(oldStatus)) {
        updates[oldStatus] = Math.max(0, currentStats[oldStatus] - 1);
        updates.all = Math.max(0, currentStats.all - 1);
        updates.total_projects = Math.max(0, currentStats.total_projects - 1);
      }
      break;
  }

  return updates;
}

/**
 * Check if a status is valid for counting
 */
function isValidStatus(status: string): status is keyof UserDashboardStatsRecord {
  return [
    'wishlist',
    'purchased',
    'stash',
    'progress',
    'completed',
    'destashed',
    'archived',
  ].includes(status);
}

/**
 * Initialize stats for a user by counting existing projects
 */
async function initializeUserStats(userId: string): Promise<void> {
  logger.info(`🔧 Initializing dashboard stats for user ${userId}`);

  try {
    // Get all projects for this user
    const projects = await pb.collection(Collections.Projects).getFullList({
      filter: `user="${userId}"`,
      fields: 'status',
    });

    // Count by status
    const counts = {
      all: projects.length,
      wishlist: 0,
      purchased: 0,
      stash: 0,
      progress: 0,
      completed: 0,
      destashed: 0,
      archived: 0,
      total_projects: projects.length,
    };

    for (const project of projects) {
      const status = project.status;
      if (isValidStatus(status)) {
        counts[status]++;
      }
    }

    // Create stats record
    await pb.collection(Collections.UserDashboardStats).create({
      user: userId,
      ...counts,
      last_updated: new Date().toISOString(),
    });

    logger.info('✅ Dashboard stats initialized:', counts);
  } catch (error) {
    logger.error('❌ Failed to initialize dashboard stats:', error);
    throw error;
  }
}

/**
 * Recalculate stats from scratch (for data integrity verification)
 */
export async function recalculateDashboardStats(userId: string): Promise<void> {
  logger.info(`🔄 Recalculating dashboard stats for user ${userId}`);

  try {
    // Calculate accurate counts from database
    const projects = await pb.collection(Collections.Projects).getFullList({
      filter: `user="${userId}"`,
      fields: 'status',
    });

    const counts = {
      all: projects.length,
      wishlist: 0,
      purchased: 0,
      stash: 0,
      progress: 0,
      completed: 0,
      destashed: 0,
      archived: 0,
      total_projects: projects.length,
    };

    for (const project of projects) {
      const status = project.status;
      if (isValidStatus(status)) {
        counts[status]++;
      }
    }

    // Update or create stats record
    try {
      const statsRecord = await pb
        .collection(Collections.UserDashboardStats)
        .getFirstListItem<UserDashboardStatsRecord>(`user="${userId}"`);

      await pb.collection(Collections.UserDashboardStats).update(statsRecord.id, {
        ...counts,
        last_updated: new Date().toISOString(),
      });
    } catch (error) {
      if (error?.status === 404) {
        await pb.collection(Collections.UserDashboardStats).create({
          user: userId,
          ...counts,
          last_updated: new Date().toISOString(),
        });
      } else {
        throw error;
      }
    }

    logger.info('✅ Dashboard stats recalculated:', counts);
  } catch (error) {
    logger.error('❌ Failed to recalculate dashboard stats:', error);
    throw error;
  }
}

/**
 * Validate stats integrity and fix discrepancies
 */
export async function validateAndFixStats(userId: string): Promise<boolean> {
  logger.info(`🔍 Validating dashboard stats for user ${userId}`);

  try {
    // Get current stats
    const statsRecord = await pb
      .collection(Collections.UserDashboardStats)
      .getFirstListItem<UserDashboardStatsRecord>(`user="${userId}"`);

    // Calculate actual counts
    const projects = await pb.collection(Collections.Projects).getFullList({
      filter: `user="${userId}"`,
      fields: 'status',
    });

    const actualCounts = {
      all: projects.length,
      wishlist: 0,
      purchased: 0,
      stash: 0,
      progress: 0,
      completed: 0,
      destashed: 0,
      archived: 0,
    };

    for (const project of projects) {
      const status = project.status;
      if (isValidStatus(status)) {
        actualCounts[status]++;
      }
    }

    // Check for discrepancies
    let hasDiscrepancies = false;
    const discrepancies: Record<string, { expected: number; actual: number }> = {};

    for (const [key, actualCount] of Object.entries(actualCounts)) {
      const storedCount = statsRecord[key as keyof UserDashboardStatsRecord] as number;
      if (storedCount !== actualCount) {
        hasDiscrepancies = true;
        discrepancies[key] = { expected: actualCount, actual: storedCount };
      }
    }

    if (hasDiscrepancies) {
      logger.warn('🚨 Stats discrepancies found:', discrepancies);
      await recalculateDashboardStats(userId);
      return false;
    }

    logger.info('✅ Stats validation passed');
    return true;
  } catch (error) {
    logger.error('❌ Failed to validate stats:', error);
    return false;
  }
}
