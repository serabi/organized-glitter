/**
 * Subscription manager for PocketBase realtime updates with proper cleanup
 * @author @serabi
 * @created 2025-07-16
 */

import PocketBase from 'pocketbase';
import { SubscriptionCleanup, SubscriptionManager } from './types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SubscriptionManager');

export class PocketBaseSubscriptionManager implements SubscriptionManager {
  private subscriptions: Map<string, SubscriptionCleanup> = new Map();
  private pb: PocketBase;
  private isCleaningUp: boolean = false;
  private beforeUnloadHandler?: () => void;
  private subscriptionStats: {
    totalCreated: number;
    totalDestroyed: number;
    lastActivity: number;
  } = {
    totalCreated: 0,
    totalDestroyed: 0,
    lastActivity: Date.now(),
  };

  constructor(pb: PocketBase) {
    this.pb = pb;
    this.setupCleanupHandlers();
  }

  /**
   * Setup cleanup handlers for browser events
   */
  private setupCleanupHandlers(): void {
    // Only cleanup on actual page unload to prevent constant subscription cycling
    if (typeof window !== 'undefined') {
      this.beforeUnloadHandler = () => {
        this.unsubscribeAll();
      };
      window.addEventListener('beforeunload', this.beforeUnloadHandler);

      // Removed aggressive visibility change handler that was causing constant cleanup cycles
      // Tab switching, minimizing, etc. should not destroy subscriptions
      // PocketBase handles connection recovery automatically
    }
  }

  /**
   * Subscribe to realtime updates for a collection
   */
  subscribe<T>(
    collection: string,
    callback: (data: T) => void,
    filter?: string
  ): SubscriptionCleanup {
    const subscriptionId = this.generateSubscriptionId(collection, filter);

    // Cleanup existing subscription if it exists
    if (this.subscriptions.has(subscriptionId)) {
      this.unsubscribe(subscriptionId);
    }

    try {
      // Create PocketBase subscription
      const unsubscribePromise = this.pb.collection(collection).subscribe(
        filter || '*',
        e => {
          try {
            callback(e.record as T);
          } catch (error) {
            logger.error('Error in subscription callback', {
              error,
              collection,
              filter,
              subscriptionId,
            });
          }
        },
        {
          // Additional subscription options can be added here
        }
      );

      // Create a wrapper function that handles the Promise
      const unsubscribe = () => {
        unsubscribePromise
          .then(fn => fn())
          .catch(error => {
            logger.error('Error unsubscribing', { error, collection, filter, subscriptionId });
          });
      };

      const cleanup: SubscriptionCleanup = {
        unsubscribe,
        collection,
        filter,
      };

      this.subscriptions.set(subscriptionId, cleanup);
      this.subscriptionStats.totalCreated++;
      this.subscriptionStats.lastActivity = Date.now();

      logger.debug('Subscription created', {
        collection,
        filter,
        subscriptionId,
        totalSubscriptions: this.subscriptions.size,
        totalCreated: this.subscriptionStats.totalCreated,
      });

      return cleanup;
    } catch (error) {
      logger.error('Failed to create subscription', {
        error,
        collection,
        filter,
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from a specific subscription
   */
  private unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      try {
        subscription.unsubscribe();
        this.subscriptions.delete(subscriptionId);
        this.subscriptionStats.totalDestroyed++;
        this.subscriptionStats.lastActivity = Date.now();

        logger.debug('Subscription removed', {
          subscriptionId,
          collection: subscription.collection,
          filter: subscription.filter,
          totalDestroyed: this.subscriptionStats.totalDestroyed,
          remainingSubscriptions: this.subscriptions.size,
        });
      } catch (error) {
        logger.error('Error unsubscribing', { error, subscriptionId });
      }
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    if (this.isCleaningUp) {
      return; // Prevent recursive cleanup
    }

    this.isCleaningUp = true;

    logger.debug('Cleaning up all subscriptions', {
      count: this.subscriptions.size,
    });

    const subscriptionIds = Array.from(this.subscriptions.keys());

    subscriptionIds.forEach(subscriptionId => {
      this.unsubscribe(subscriptionId);
    });

    this.subscriptions.clear();
    this.isCleaningUp = false;
  }

  /**
   * Unsubscribe from all subscriptions for a specific collection
   */
  unsubscribeCollection(collection: string): void {
    const subscriptionsToRemove = Array.from(this.subscriptions.entries())
      .filter(([_, subscription]) => subscription.collection === collection)
      .map(([id]) => id);

    subscriptionsToRemove.forEach(subscriptionId => {
      this.unsubscribe(subscriptionId);
    });

    logger.debug('Unsubscribed from collection', {
      collection,
      removedCount: subscriptionsToRemove.length,
    });
  }

  /**
   * Check connection health and log subscription status
   * Called manually for diagnostics, not automatically on visibility changes
   */
  checkConnectionHealth(): void {
    const stats = this.getSubscriptionStats();
    logger.debug('Subscription health check', {
      totalSubscriptions: stats.total,
      byCollection: stats.byCollection,
      isConnected: this.pb.authStore.isValid,
    });
  }

  /**
   * Manually trigger subscription reconnection for all active subscriptions
   * This is safer than automatic pause/resume and gives components control
   */
  reconnectAll(): void {
    const stats = this.getSubscriptionStats();
    logger.info('Manual subscription reconnection requested', {
      totalSubscriptions: stats.total,
      byCollection: stats.byCollection,
    });

    // Components should handle their own reconnection logic via their hooks
    // This just provides visibility into the reconnection process
  }

  /**
   * Generate deterministic subscription ID based on collection and filter
   */
  private generateSubscriptionId(collection: string, filter?: string): string {
    const filterKey = filter || '*';
    // Create a simple hash for deterministic ID generation
    const hashInput = `${collection}:${filterKey}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${collection}:${filterKey}:${Math.abs(hash)}`;
  }

  /**
   * Get subscription statistics with lifecycle tracking
   */
  getSubscriptionStats(): {
    total: number;
    byCollection: Record<string, number>;
    activeSubscriptions: Array<{ collection: string; filter?: string }>;
    lifecycle: {
      totalCreated: number;
      totalDestroyed: number;
      lastActivity: number;
      timeSinceLastActivity: number;
    };
  } {
    const byCollection: Record<string, number> = {};
    const activeSubscriptions: Array<{ collection: string; filter?: string }> = [];

    this.subscriptions.forEach(subscription => {
      const { collection, filter } = subscription;
      byCollection[collection] = (byCollection[collection] || 0) + 1;
      activeSubscriptions.push({ collection, filter });
    });

    return {
      total: this.subscriptions.size,
      byCollection,
      activeSubscriptions,
      lifecycle: {
        totalCreated: this.subscriptionStats.totalCreated,
        totalDestroyed: this.subscriptionStats.totalDestroyed,
        lastActivity: this.subscriptionStats.lastActivity,
        timeSinceLastActivity: Date.now() - this.subscriptionStats.lastActivity,
      },
    };
  }

  /**
   * Check if subscription exists
   */
  hasSubscription(collection: string, filter?: string): boolean {
    const subscriptionId = this.generateSubscriptionId(collection, filter);
    return this.subscriptions.has(subscriptionId);
  }

  /**
   * Create a scoped subscription manager for a specific collection
   */
  createScopedManager(collection: string): ScopedSubscriptionManager {
    return new ScopedSubscriptionManager(this, collection);
  }

  /**
   * Destroy the subscription manager
   */
  destroy(): void {
    this.unsubscribeAll();

    // Remove event listeners - only beforeunload since we removed visibilitychange
    if (typeof window !== 'undefined' && this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = undefined;
    }
  }
}

/**
 * Scoped subscription manager for a specific collection
 */
export class ScopedSubscriptionManager {
  constructor(
    private manager: PocketBaseSubscriptionManager,
    private collection: string
  ) {}

  /**
   * Subscribe to this collection
   */
  subscribe<T>(callback: (data: T) => void, filter?: string): SubscriptionCleanup {
    return this.manager.subscribe(this.collection, callback, filter);
  }

  /**
   * Unsubscribe from this collection
   */
  unsubscribe(): void {
    this.manager.unsubscribeCollection(this.collection);
  }

  /**
   * Check if subscription exists for this collection
   */
  hasSubscription(filter?: string): boolean {
    return this.manager.hasSubscription(this.collection, filter);
  }
}

/**
 * Global subscription manager instance
 */
let globalSubscriptionManager: PocketBaseSubscriptionManager | null = null;

/**
 * Get or create global subscription manager
 */
export function getSubscriptionManager(pb: PocketBase): PocketBaseSubscriptionManager {
  if (!globalSubscriptionManager) {
    globalSubscriptionManager = new PocketBaseSubscriptionManager(pb);
  }
  return globalSubscriptionManager;
}

/**
 * Cleanup global subscription manager
 */
export function cleanupGlobalSubscriptionManager(): void {
  if (globalSubscriptionManager) {
    globalSubscriptionManager.destroy();
    globalSubscriptionManager = null;
  }
}
