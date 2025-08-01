/**
 * Base PocketBase service with type-safe CRUD operations
 * @author @serabi
 * @created 2025-01-16
 */

import PocketBase from 'pocketbase';
import {
  BaseRecord,
  CRUDService,
  ListOptions,
  ListResult,
  ServiceConfig,
  StructuredFilter,
} from './types';
import { FilterBuilder } from './FilterBuilder';
import { ErrorHandler } from './ErrorHandler';
import { FieldMapper } from './FieldMapper';
import { PocketBaseSubscriptionManager, getSubscriptionManager } from './SubscriptionManager';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BaseService');

export class BaseService<T extends BaseRecord> implements CRUDService<T> {
  protected pb: PocketBase;
  protected config: ServiceConfig;
  protected fieldMapper: FieldMapper;
  protected subscriptionManager: PocketBaseSubscriptionManager;

  constructor(pb: PocketBase, config: ServiceConfig) {
    this.pb = pb;
    this.config = config;
    this.fieldMapper = config.fieldMapping
      ? new FieldMapper(config.fieldMapping)
      : FieldMapper.createWithCommonMappings();
    this.subscriptionManager = getSubscriptionManager(pb);
  }

  /**
   * List records with filtering, sorting, and pagination
   */
  async list(options: ListOptions = {}): Promise<ListResult<T>> {
    const context = `${this.config.collection}.list`;

    return ErrorHandler.handleAsync(async () => {
      const {
        page = 1,
        perPage = 30,
        sort = this.config.defaultSort,
        expand = this.config.defaultExpand,
        filter,
      } = options;

      // Build filter string
      let filterString = '';
      if (filter) {
        filterString = FilterBuilder.toFilterString(filter, this.config.fieldMapping);
      }

      // Build expand string
      let expandString = '';
      if (expand) {
        expandString = Array.isArray(expand) ? expand.join(',') : expand;
      }

      logger.debug('Listing records', {
        collection: this.config.collection,
        page,
        perPage,
        sort,
        expand: expandString,
        filter: filterString,
      });

      const result = await this.pb.collection(this.config.collection).getList(page, perPage, {
        sort,
        expand: expandString,
        filter: filterString,
      });

      // Map results to frontend format
      const mappedItems = result.items.map(item => this.fieldMapper.toFrontend(item) as T);

      return {
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        items: mappedItems,
      };
    }, context);
  }

  /**
   * Get a single record by ID
   */
  async getOne(id: string, expand?: string[]): Promise<T> {
    const context = `${this.config.collection}.getOne`;

    return ErrorHandler.handleAsync(async () => {
      const expandString = expand?.join(',') || this.config.defaultExpand?.join(',') || '';

      logger.debug('Getting record', {
        collection: this.config.collection,
        id,
        expand: expandString,
      });

      const result = await this.pb.collection(this.config.collection).getOne(id, {
        expand: expandString,
      });

      return this.fieldMapper.toFrontend(result) as T;
    }, context);
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const context = `${this.config.collection}.create`;

    return ErrorHandler.handleAsync(async () => {
      // Map to backend format
      const backendData = this.fieldMapper.toBackend(data);

      logger.debug('Creating record', {
        collection: this.config.collection,
        data: backendData,
      });

      const result = await this.pb.collection(this.config.collection).create(backendData);

      return this.fieldMapper.toFrontend(result) as T;
    }, context);
  }

  /**
   * Update an existing record
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const context = `${this.config.collection}.update`;

    return ErrorHandler.handleAsync(async () => {
      // Map to backend format
      const backendData = this.fieldMapper.toBackend(data);

      logger.debug('Updating record', {
        collection: this.config.collection,
        id,
        data: backendData,
      });

      const result = await this.pb.collection(this.config.collection).update(id, backendData);

      return this.fieldMapper.toFrontend(result) as T;
    }, context);
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<boolean> {
    const context = `${this.config.collection}.delete`;

    return ErrorHandler.handleAsync(async () => {
      logger.debug('Deleting record', {
        collection: this.config.collection,
        id,
      });

      await this.pb.collection(this.config.collection).delete(id);
      return true;
    }, context);
  }

  /**
   * Get the first record matching a filter
   */
  async getFirst(filter: StructuredFilter, expand?: string[]): Promise<T | null> {
    const context = `${this.config.collection}.getFirst`;

    return ErrorHandler.handleAsync(async () => {
      const filterString = FilterBuilder.toFilterString(filter, this.config.fieldMapping);
      const expandString = expand?.join(',') || this.config.defaultExpand?.join(',') || '';

      logger.debug('Getting first record', {
        collection: this.config.collection,
        filter: filterString,
        expand: expandString,
      });

      try {
        const result = await this.pb
          .collection(this.config.collection)
          .getFirstListItem(filterString, {
            expand: expandString,
          });

        return this.fieldMapper.toFrontend(result) as T;
      } catch (error) {
        // If no record found, return null instead of throwing
        const handledError = ErrorHandler.handleError(error, context);
        if (handledError.type === 'not_found') {
          return null;
        }
        throw handledError;
      }
    }, context);
  }

  /**
   * Count records matching a filter
   */
  async count(filter?: StructuredFilter): Promise<number> {
    const context = `${this.config.collection}.count`;

    return ErrorHandler.handleAsync(async () => {
      const filterString = filter
        ? FilterBuilder.toFilterString(filter, this.config.fieldMapping)
        : '';

      logger.debug('Counting records', {
        collection: this.config.collection,
        filter: filterString,
      });

      // Use list with perPage=1 to get count efficiently
      const result = await this.pb.collection(this.config.collection).getList(1, 1, {
        filter: filterString,
      });

      return result.totalItems;
    }, context);
  }

  /**
   * Subscribe to realtime updates
   */
  subscribe(callback: (data: T) => void, filter?: StructuredFilter) {
    const filterString = filter
      ? FilterBuilder.toFilterString(filter, this.config.fieldMapping)
      : undefined;

    logger.debug('Creating subscription', {
      collection: this.config.collection,
      filter: filterString,
    });

    return this.subscriptionManager.subscribe(
      this.config.collection,
      (data: unknown) => {
        const mappedData = this.fieldMapper.toFrontend(data as Record<string, unknown>) as T;
        callback(mappedData);
      },
      filterString
    );
  }

  /**
   * Unsubscribe from all subscriptions for this collection
   */
  unsubscribeAll(): void {
    this.subscriptionManager.unsubscribeCollection(this.config.collection);
  }

  /**
   * Batch create multiple records
   */
  async createBatch(records: Partial<T>[]): Promise<T[]> {
    const context = `${this.config.collection}.createBatch`;

    return ErrorHandler.handleAsync(async () => {
      logger.debug('Creating batch records', {
        collection: this.config.collection,
        count: records.length,
      });

      const results = await Promise.all(records.map(record => this.create(record)));

      return results;
    }, context);
  }

  /**
   * Batch update multiple records
   */
  async updateBatch(updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    const context = `${this.config.collection}.updateBatch`;

    return ErrorHandler.handleAsync(async () => {
      logger.debug('Updating batch records', {
        collection: this.config.collection,
        count: updates.length,
      });

      const results = await Promise.all(updates.map(({ id, data }) => this.update(id, data)));

      return results;
    }, context);
  }

  /**
   * Batch delete multiple records
   */
  async deleteBatch(ids: string[]): Promise<boolean[]> {
    const context = `${this.config.collection}.deleteBatch`;

    return ErrorHandler.handleAsync(async () => {
      logger.debug('Deleting batch records', {
        collection: this.config.collection,
        count: ids.length,
      });

      const results = await Promise.all(ids.map(id => this.delete(id)));

      return results;
    }, context);
  }

  /**
   * Get records by multiple IDs
   */
  async getByIds(ids: string[], expand?: string[]): Promise<T[]> {
    const context = `${this.config.collection}.getByIds`;

    return ErrorHandler.handleAsync(async () => {
      if (ids.length === 0) {
        return [];
      }

      const filter = FilterBuilder.create().in('id', ids).build();
      const result = await this.list({
        filter,
        expand,
        perPage: ids.length,
      });

      return result.items;
    }, context);
  }

  /**
   * Check if record exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      await this.getOne(id);
      return true;
    } catch (error) {
      const handledError = ErrorHandler.handleError(error);
      if (handledError.type === 'not_found') {
        return false;
      }
      throw handledError;
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<{
    total: number;
    collection: string;
    subscriptions: number;
  }> {
    const total = await this.count();
    const subscriptionStats = this.subscriptionManager.getSubscriptionStats();
    const subscriptions = subscriptionStats.byCollection[this.config.collection] || 0;

    return {
      total,
      collection: this.config.collection,
      subscriptions,
    };
  }

  /**
   * Create a filter builder for this collection
   */
  filter(): FilterBuilder {
    return FilterBuilder.create();
  }

  /**
   * Create a user-scoped filter builder
   */
  forUser(userId: string): FilterBuilder {
    return FilterBuilder.forUser(userId);
  }
}
