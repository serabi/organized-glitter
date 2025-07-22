/**
 * Base PocketBase service exports
 * @author @serabi
 * @created 2025-01-16
 */

export { BaseService } from './BaseService';
export { FilterBuilder } from './FilterBuilder';
export { ErrorHandler } from './ErrorHandler';
export { FieldMapper } from './FieldMapper';
export {
  PocketBaseSubscriptionManager,
  ScopedSubscriptionManager,
  getSubscriptionManager,
  cleanupGlobalSubscriptionManager,
} from './SubscriptionManager';

export * from './types';
