/**
 * Main base PocketBase service with structured patterns
 * @author @serabi
 * @created 2025-01-16
 */

import PocketBase from 'pocketbase';
import { pb } from '@/lib/pocketbase';
import {
  BaseService,
  FilterBuilder,
  ErrorHandler,
  FieldMapper,
  getSubscriptionManager,
  BaseRecord,
  ServiceConfig,
  StructuredFilter,
  ListOptions,
  ListResult,
  PocketBaseError,
} from './base';

/**
 * Factory function to create a new BaseService instance
 */
export function createBaseService<T extends BaseRecord>(
  config: ServiceConfig,
  pocketbaseInstance: PocketBase = pb
): BaseService<T> {
  return new BaseService<T>(pocketbaseInstance, config);
}

/**
 * Create a filter builder instance
 */
export function createFilter(): FilterBuilder {
  return FilterBuilder.create();
}

/**
 * Create a user-scoped filter
 */
export function createUserFilter(userId: string): FilterBuilder {
  return FilterBuilder.forUser(userId);
}

/**
 * Create a date range filter
 */
export function createDateRangeFilter(
  field: string,
  startDate: Date,
  endDate: Date
): FilterBuilder {
  return FilterBuilder.dateRange(field, startDate, endDate);
}

/**
 * Create a status filter
 */
export function createStatusFilter(status: string | string[]): FilterBuilder {
  return FilterBuilder.withStatus(status);
}

/**
 * Handle PocketBase errors consistently
 */
export function handlePocketBaseError(error: unknown, context?: string): PocketBaseError {
  return ErrorHandler.handleError(error, context);
}

/**
 * Execute an async operation with error handling
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  return ErrorHandler.handleAsync(operation, context);
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context?: string
): Promise<T> {
  return ErrorHandler.retryOperation(operation, maxRetries, baseDelay, context);
}

/**
 * Create a field mapper with common mappings
 */
export function createFieldMapper(additionalMappings?: Record<string, string>): FieldMapper {
  return FieldMapper.createWithCommonMappings(additionalMappings);
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return FieldMapper.camelToSnake(str);
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return FieldMapper.snakeToCamel(str);
}

/**
 * Get the global subscription manager
 */
export function getGlobalSubscriptionManager(): ReturnType<typeof getSubscriptionManager> {
  return getSubscriptionManager(pb);
}

/**
 * Utility types for convenience
 */
export type {
  BaseRecord,
  ServiceConfig,
  StructuredFilter,
  ListOptions,
  ListResult,
  PocketBaseError,
  FilterOperator,
  FilterCondition,
  FilterGroup,
  ValidationError,
  FieldMapping,
  SubscriptionCleanup,
  CRUDService,
} from './base';

/**
 * Re-export main classes for direct use
 */
export {
  BaseService,
  FilterBuilder,
  ErrorHandler,
  FieldMapper,
  PocketBaseSubscriptionManager,
  ScopedSubscriptionManager,
} from './base';

/**
 * Common service configurations for typical collections
 */
export const commonServiceConfigs = {
  projects: {
    collection: 'projects',
    defaultSort: '-created',
    defaultExpand: ['user'],
    fieldMapping: {
      userId: 'user',
      dateCreated: 'created',
      dateUpdated: 'updated',
      datePurchased: 'date_purchased',
      dateReceived: 'date_received',
    },
  },

  companies: {
    collection: 'companies',
    defaultSort: 'name',
    fieldMapping: {
      userId: 'user',
      companyName: 'name',
    },
  },

  artists: {
    collection: 'artists',
    defaultSort: 'name',
    fieldMapping: {
      userId: 'user',
      artistName: 'name',
    },
  },

  tags: {
    collection: 'tags',
    defaultSort: 'name',
    fieldMapping: {
      userId: 'user',
      tagName: 'name',
    },
  },

  users: {
    collection: 'users',
    defaultSort: 'created',
    fieldMapping: {
      dateCreated: 'created',
      dateUpdated: 'updated',
      userName: 'name',
      userEmail: 'email',
    },
  },
} as const;

/**
 * Create a pre-configured service for common collections
 */
export function createProjectService(): BaseService<BaseRecord> {
  return createBaseService(commonServiceConfigs.projects);
}

export function createCompanyService(): BaseService<BaseRecord> {
  return createBaseService(commonServiceConfigs.companies);
}

export function createArtistService(): BaseService<BaseRecord> {
  return createBaseService(commonServiceConfigs.artists);
}

export function createTagService(): BaseService<BaseRecord> {
  return createBaseService(commonServiceConfigs.tags);
}

export function createUserService(): BaseService<BaseRecord> {
  return createBaseService(commonServiceConfigs.users);
}
