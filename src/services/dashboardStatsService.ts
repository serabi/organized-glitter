/**
 * Dashboard Stats Service - Real-time Count Management
 * @author @serabi
 * @created 2025-07-04
 */

import { pb } from '@/lib/pocketbase';
import { Collections, UserDashboardStatsRecord } from '@/types/pocketbase.types';
import { ProjectStatusChangeEvent } from '@/types/user-dashboard-stats';
import { createLogger } from '@/utils/logger';

const logger = createLogger('DashboardStatsService');

/**
 * Valid project status types for counting
 */
type ValidProjectStatus =
  | 'wishlist'
  | 'purchased'
  | 'stash'
  | 'progress'
  | 'onhold'
  | 'completed'
  | 'destashed'
  | 'archived';

/**
 * Interface for project status counts
 */
interface ProjectStatusCounts {
  all: number;
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  onhold: number;
  completed: number;
  destashed: number;
  archived: number;
  total_projects: number;
}

/**
 * Count projects by status for a given user
 * @param userId - The user ID to count projects for
 * @returns Promise<ProjectStatusCounts> - Object with counts for each status
 */
async function countProjectsByStatus(userId: string): Promise<ProjectStatusCounts> {
  logger.debug(`📊 Counting projects by status for user ${userId}`);

  try {
    // Get all projects for this user (only status field needed)
    const projects = await pb.collection(Collections.Projects).getFullList({
      filter: `user="${userId}"`,
      fields: 'status',
    });

    // Initialize counts object
    const counts: ProjectStatusCounts = {
      all: projects.length,
      wishlist: 0,
      purchased: 0,
      stash: 0,
      progress: 0,
      onhold: 0,
      completed: 0,
      destashed: 0,
      archived: 0,
      total_projects: projects.length,
    };

    // Count projects by status
    for (const project of projects) {
      const status = project.status;
      if (isValidStatus(status)) {
        counts[status]++;
      }
    }

    logger.debug(`✅ Project counts calculated:`, counts);
    return counts;
  } catch (error) {
    logger.error('❌ Failed to count projects by status:', error);
    throw error;
  }
}

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
      if (!newStatus || newStatus === null || newStatus === undefined) {
        logger.error('❌ Create operation requires valid newStatus');
        return {};
      }
      if (isValidStatus(newStatus)) {
        updates[newStatus] = currentStats[newStatus] + 1;
        updates.all = currentStats.all + 1;
        updates.total_projects = currentStats.total_projects + 1;
      } else {
        logger.error('❌ Invalid status provided for create operation:', newStatus);
        return {};
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
function isValidStatus(status: string): status is ValidProjectStatus {
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
    // Get project counts using the helper function
    const counts = await countProjectsByStatus(userId);

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
    // Get project counts using the helper function
    const counts = await countProjectsByStatus(userId);

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

    // Calculate actual counts using the helper function
    const actualCounts = await countProjectsByStatus(userId);

    // Check for discrepancies
    let hasDiscrepancies = false;
    const discrepancies: Record<string, { expected: number; actual: number }> = {};

    for (const [key, actualCount] of Object.entries(actualCounts)) {
      const storedValue = statsRecord[key as keyof UserDashboardStatsRecord];
      const storedCount = typeof storedValue === 'number' ? storedValue : 0;
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
