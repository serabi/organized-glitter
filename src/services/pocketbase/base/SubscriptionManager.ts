/**
 * Subscription manager for PocketBase realtime updates with proper cleanup
 * @author @serabi
 * @created 2025-01-16
 */

import PocketBase from 'pocketbase';
import { SubscriptionCleanup, SubscriptionManager } from './types';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('SubscriptionManager');

export class PocketBaseSubscriptionManager implements SubscriptionManager {
  private subscriptions: Map<string, SubscriptionCleanup> = new Map();
  private pb: PocketBase;
  private isCleaningUp: boolean = false;

  constructor(pb: PocketBase) {
    this.pb = pb;
    this.setupCleanupHandlers();
  }

  /**
   * Setup cleanup handlers for browser events
   */
  private setupCleanupHandlers(): void {
    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.unsubscribeAll();
      });

      // Cleanup on visibility change (optional - for aggressive cleanup)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.pauseSubscriptions();
        } else if (document.visibilityState === 'visible') {
          this.resumeSubscriptions();
        }
      });
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
      const unsubscribe = this.pb.collection(collection).subscribe(
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

      const cleanup: SubscriptionCleanup = {
        unsubscribe,
        collection,
        filter,
      };

      this.subscriptions.set(subscriptionId, cleanup);

      logger.debug('Subscription created', {
        collection,
        filter,
        subscriptionId,
        totalSubscriptions: this.subscriptions.size,
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
        logger.debug('Subscription removed', {
          subscriptionId,
          collection: subscription.collection,
          filter: subscription.filter,
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
   * Pause all subscriptions (disconnect but keep references)
   */
  pauseSubscriptions(): void {
    logger.debug('Pausing all subscriptions');

    const subscriptionData = Array.from(this.subscriptions.entries()).map(([id, subscription]) => ({
      id,
      collection: subscription.collection,
      filter: subscription.filter,
    }));

    this.unsubscribeAll();

    // Store paused subscriptions for potential resume
    // This is a simplified approach - in a real app you might want to store these
    // in a way that allows resuming with the same callbacks
  }

  /**
   * Resume subscriptions (would require storing callback references)
   */
  resumeSubscriptions(): void {
    // This would require a more complex implementation to store callback references
    // For now, we'll just log that subscriptions should be recreated
    logger.debug('Subscriptions should be recreated after resume');
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(collection: string, filter?: string): string {
    return `${collection}:${filter || '*'}:${Date.now()}`;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    total: number;
    byCollection: Record<string, number>;
    activeSubscriptions: Array<{ collection: string; filter?: string }>;
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

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.unsubscribeAll);
      document.removeEventListener('visibilitychange', this.pauseSubscriptions);
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
