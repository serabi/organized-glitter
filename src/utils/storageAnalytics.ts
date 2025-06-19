// Legacy compatibility layer for PocketBase migration
// Storage analytics simplified - PocketBase doesn't need complex storage tracking

import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('StorageAnalytics');

export type StorageOperation = 'upload' | 'download' | 'delete';
export type StorageProvider = 'pocketbase';
export type CollectionType = 'users' | 'projects' | 'progress_notes';

export interface StorageAnalyticsData {
  operation_type: StorageOperation;
  primary_storage: StorageProvider;
  fallback_used: boolean;
  collection_type: CollectionType;
  file_size_bytes?: number;
  error_message?: string;
  success: boolean;
}

/**
 * Simplified storage tracking for PocketBase
 * Only logs to console and PostHog (if available)
 */
export async function trackStorageOperation(
  data: StorageAnalyticsData,
  currentUserId?: string | null
): Promise<void> {
  try {
    // Log operation for debugging
    logger.info('Storage operation', {
      operation: data.operation_type,
      provider: data.primary_storage,
      success: data.success,
      fileSize: data.file_size_bytes,
      error: data.error_message,
    });

    // Send to PostHog if available
    await trackToPostHog(data, currentUserId || null);
  } catch (error) {
    logger.error('Error tracking storage analytics', { error, data });
  }
}

/**
 * Send storage analytics to PostHog for comprehensive tracking
 */
async function trackToPostHog(data: StorageAnalyticsData, _userId: string | null): Promise<void> {
  try {
    // Check if PostHog is available
    if (typeof window !== 'undefined' && (window as { posthog?: unknown }).posthog) {
      const posthog = (
        window as unknown as { posthog: { capture: (event: string, properties: unknown) => void } }
      ).posthog;

      const eventData = {
        operation_type: data.operation_type,
        primary_storage: data.primary_storage,
        fallback_used: Boolean(data.fallback_used),
        collection_type: data.collection_type,
        file_size_mb: data.file_size_bytes
          ? Math.round((data.file_size_bytes / (1024 * 1024)) * 100) / 100
          : null,
        success: Boolean(data.success),
        error_message: data.error_message || null,
        timestamp: new Date().toISOString(),
      };

      posthog.capture('storage_operation', eventData);
    }
  } catch (error) {
    logger.error('Failed to send to PostHog', { error });
  }
}

/**
 * Legacy function - no longer needed with PocketBase
 * @deprecated PocketBase doesn't require complex health metrics
 */
export async function getStorageHealthMetrics(_daysBack: number = 7) {
  logger.warn('getStorageHealthMetrics is deprecated with PocketBase');
  return null;
}

/**
 * Legacy function - no longer needed with PocketBase
 * @deprecated PocketBase doesn't require analytics cleanup
 */
export async function cleanupOldStorageAnalytics(
  _retentionDays: number = 365
): Promise<{ deletedCount: number | null; error: string | null }> {
  logger.warn('cleanupOldStorageAnalytics is deprecated with PocketBase');
  return { deletedCount: null, error: 'Function deprecated with PocketBase migration' };
}
