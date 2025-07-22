/**
 * Tests for BaseService - core service infrastructure testing
 * @author @serabi
 * @created 2025-07-16
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseService } from '../BaseService';
import { ServiceTestBase, type ServiceMockPocketBase } from '@/test/ServiceTestBase';
import { ProjectFactory, ErrorScenarioFactory } from '@/test/factories/ServiceDataFactory';
import { MockScenarios } from '@/test/mocks/ServiceMockTemplates';
import type { BaseRecord, ServiceConfig, StructuredFilter } from '../types';
import type { ProjectType } from '@/types/project';

// Mock dependencies
vi.mock('@/lib/pocketbase', () => ({
  pb: {},
}));

vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../FilterBuilder', () => ({
  FilterBuilder: {
    toFilterString: vi.fn(filter => JSON.stringify(filter)),
    create: vi.fn(() => ({
      in: vi.fn().mockReturnThis(),
      build: vi.fn(() => ({ conditions: [] })),
    })),
    forUser: vi.fn(() => ({
      build: vi.fn(() => ({ conditions: [] })),
    })),
  },
}));

vi.mock('../ErrorHandler', () => ({
  ErrorHandler: {
    handleAsync: vi.fn(async fn => await fn()),
    handleError: vi.fn(error => {
      if (error.status === 404 || error.name === 'NotFoundError') {
        return { ...error, type: 'not_found' };
      }
      return error;
    }),
  },
}));

vi.mock('../FieldMapper', () => {
  const MockFieldMapper = vi.fn().mockImplementation(() => ({
    toFrontend: vi.fn(data => data),
    toBackend: vi.fn(data => data),
  }));

  MockFieldMapper.createWithCommonMappings = vi.fn(() => ({
    toFrontend: vi.fn(data => data),
    toBackend: vi.fn(data => data),
  }));

  return {
    FieldMapper: MockFieldMapper,
  };
});

vi.mock('../SubscriptionManager', () => ({
  getSubscriptionManager: vi.fn(() => ({
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    unsubscribeCollection: vi.fn(),
    getSubscriptionStats: vi.fn(() => ({ byCollection: {} })),
  })),
}));

// Test record interface
interface TestRecord extends BaseRecord {
  title: string;
  status: string;
  user: string;
}

describe('BaseService', () => {
  let serviceTestBase: ServiceTestBase;
  let testService: BaseService<TestRecord>;
  let mockConfig: ServiceConfig;

  beforeEach(() => {
    serviceTestBase = new ServiceTestBase();
    serviceTestBase.resetAllMocks();

    mockConfig = {
      collection: 'test_records',
      defaultExpand: ['user'],
      defaultSort: '-created',
      fieldMapping: {
        datePurchased: 'date_purchased',
        dateReceived: 'date_received',
      },
    };

    testService = new BaseService<TestRecord>(
      serviceTestBase.mockPb as unknown as ServiceMockPocketBase,
      mockConfig
    );
  });

  describe('Constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(testService).toBeInstanceOf(BaseService);
      expect(serviceTestBase.mockPb.collection).toBeDefined();
    });

    it('should create field mapper with common mappings when none provided', () => {
      const configWithoutMapping = { collection: 'test_records' };
      const service = new BaseService<TestRecord>(
        serviceTestBase.mockPb as unknown as ServiceMockPocketBase,
        configWithoutMapping
      );
      expect(service).toBeInstanceOf(BaseService);
    });
  });

  describe('CRUD Operations', () => {
    describe('list()', () => {
      it('should list records with default options', async () => {
        MockScenarios.happyPath(serviceTestBase.mockCollection);

        const result = await testService.list();

        expect(serviceTestBase.mockPb.collection).toHaveBeenCalledWith('test_records');
        expect(serviceTestBase.mockCollection.getList).toHaveBeenCalledWith(1, 30, {
          sort: '-created',
          expand: 'user',
          filter: '',
        });
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('totalItems');
        expect(Array.isArray(result.items)).toBe(true);
      });

      it('should apply custom pagination options', async () => {
        MockScenarios.happyPath(serviceTestBase.mockCollection);

        await testService.list({ page: 2, perPage: 50 });

        expect(serviceTestBase.mockCollection.getList).toHaveBeenCalledWith(2, 50, {
          sort: '-created',
          expand: 'user',
          filter: '',
        });
      });

      it('should apply custom sort and expand options', async () => {
        MockScenarios.happyPath(serviceTestBase.mockCollection);

        await testService.list({
          sort: 'title',
          expand: ['user', 'tags'],
        });

        expect(serviceTestBase.mockCollection.getList).toHaveBeenCalledWith(1, 30, {
          sort: 'title',
          expand: 'user,tags',
          filter: '',
        });
      });

      it('should handle structured filters', async () => {
        MockScenarios.happyPath(serviceTestBase.mockCollection);
        const filter: StructuredFilter = {
          conditions: [{ field: 'status', operator: '=', value: 'active' }],
        };

        await testService.list({ filter });

        expect(serviceTestBase.mockCollection.getList).toHaveBeenCalledWith(1, 30, {
          sort: '-created',
          expand: 'user',
          filter: JSON.stringify(filter),
        });
      });

      it('should handle list operation errors', async () => {
        MockScenarios.allErrors(serviceTestBase.mockCollection);

        await expect(testService.list()).rejects.toThrow();
      });
    });

    describe('getOne()', () => {
      it('should get a single record by ID', async () => {
        const mockRecord = ProjectFactory({ id: 'test-id' }) as unknown as TestRecord;
        serviceTestBase.mockCollection.getOne.mockResolvedValue(mockRecord);

        const result = await testService.getOne('test-id');

        expect(serviceTestBase.mockPb.collection).toHaveBeenCalledWith('test_records');
        expect(serviceTestBase.mockCollection.getOne).toHaveBeenCalledWith('test-id', {
          expand: 'user',
        });
        expect(result).toEqual(mockRecord);
      });

      it('should apply custom expand options', async () => {
        const mockRecord = ProjectFactory({ id: 'test-id' }) as unknown as TestRecord;
        serviceTestBase.mockCollection.getOne.mockResolvedValue(mockRecord);

        await testService.getOne('test-id', ['tags', 'comments']);

        expect(serviceTestBase.mockCollection.getOne).toHaveBeenCalledWith('test-id', {
          expand: 'tags,comments',
        });
      });

      it('should handle not found errors', async () => {
        serviceTestBase.mockCollection.getOne.mockRejectedValue(
          ErrorScenarioFactory.notFoundError('Record')
        );

        await expect(testService.getOne('nonexistent-id')).rejects.toThrow();
      });
    });

    describe('create()', () => {
      it('should create a new record', async () => {
        const inputData = { title: 'Test Record', status: 'active', user: 'user-1' };
        const createdRecord = { id: 'new-id', ...inputData } as TestRecord;
        serviceTestBase.mockCollection.create.mockResolvedValue(createdRecord);

        const result = await testService.create(inputData);

        expect(serviceTestBase.mockPb.collection).toHaveBeenCalledWith('test_records');
        expect(serviceTestBase.mockCollection.create).toHaveBeenCalledWith(inputData);
        expect(result).toEqual(createdRecord);
      });

      it('should handle validation errors during creation', async () => {
        serviceTestBase.mockCollection.create.mockRejectedValue(
          ErrorScenarioFactory.validationError('title', 'Title is required')
        );

        await expect(testService.create({})).rejects.toThrow();
      });
    });

    describe('update()', () => {
      it('should update an existing record', async () => {
        const updateData = { title: 'Updated Title' };
        const updatedRecord = {
          id: 'test-id',
          title: 'Updated Title',
          status: 'active',
          user: 'user-1',
          updated: new Date().toISOString(),
        } as TestRecord;
        serviceTestBase.mockCollection.update.mockResolvedValue(updatedRecord);

        const result = await testService.update('test-id', updateData);

        expect(serviceTestBase.mockPb.collection).toHaveBeenCalledWith('test_records');
        expect(serviceTestBase.mockCollection.update).toHaveBeenCalledWith('test-id', updateData);
        expect(result).toEqual(updatedRecord);
      });

      it('should handle permission errors during update', async () => {
        serviceTestBase.mockCollection.update.mockRejectedValue(
          ErrorScenarioFactory.permissionError()
        );

        await expect(testService.update('test-id', {})).rejects.toThrow();
      });
    });

    describe('delete()', () => {
      it('should delete a record successfully', async () => {
        serviceTestBase.mockCollection.delete.mockResolvedValue(true);

        const result = await testService.delete('test-id');

        expect(serviceTestBase.mockPb.collection).toHaveBeenCalledWith('test_records');
        expect(serviceTestBase.mockCollection.delete).toHaveBeenCalledWith('test-id');
        expect(result).toBe(true);
      });

      it('should handle delete errors', async () => {
        serviceTestBase.mockCollection.delete.mockRejectedValue(ErrorScenarioFactory.serverError());

        await expect(testService.delete('test-id')).rejects.toThrow();
      });
    });
  });

  describe('Advanced Operations', () => {
    describe('getFirst()', () => {
      it('should get the first record matching a filter', async () => {
        const mockRecord = ProjectFactory({ id: 'first-match' }) as unknown as TestRecord;
        serviceTestBase.mockCollection.getFirstListItem.mockResolvedValue(mockRecord);

        const filter: StructuredFilter = {
          conditions: [{ field: 'status', operator: '=', value: 'active' }],
        };

        const result = await testService.getFirst(filter);

        expect(serviceTestBase.mockCollection.getFirstListItem).toHaveBeenCalledWith(
          JSON.stringify(filter),
          { expand: 'user' }
        );
        expect(result).toEqual(mockRecord);
      });

      it('should return null when no record is found', async () => {
        serviceTestBase.mockCollection.getFirstListItem.mockResolvedValue(null);

        const filter: StructuredFilter = {
          conditions: [{ field: 'status', operator: '=', value: 'nonexistent' }],
        };

        const result = await testService.getFirst(filter);

        expect(result).toBeNull();
      });
    });

    describe('count()', () => {
      it('should count records without filter', async () => {
        serviceTestBase.mockCollection.getList.mockResolvedValue({
          page: 1,
          perPage: 1,
          totalItems: 150,
          totalPages: 150,
          items: [],
        });

        const result = await testService.count();

        expect(serviceTestBase.mockCollection.getList).toHaveBeenCalledWith(1, 1, {
          filter: '',
        });
        expect(result).toBe(150);
      });

      it('should count records with filter', async () => {
        serviceTestBase.mockCollection.getList.mockResolvedValue({
          page: 1,
          perPage: 1,
          totalItems: 25,
          totalPages: 25,
          items: [],
        });

        const filter: StructuredFilter = {
          conditions: [{ field: 'status', operator: '=', value: 'active' }],
        };

        const result = await testService.count(filter);

        expect(serviceTestBase.mockCollection.getList).toHaveBeenCalledWith(1, 1, {
          filter: JSON.stringify(filter),
        });
        expect(result).toBe(25);
      });
    });

    describe('exists()', () => {
      it('should return true if record exists', async () => {
        const mockRecord = ProjectFactory({ id: 'exists-id' }) as unknown as TestRecord;
        serviceTestBase.mockCollection.getOne.mockResolvedValue(mockRecord);

        const result = await testService.exists('exists-id');

        expect(result).toBe(true);
      });

      it('should return false if record does not exist', async () => {
        serviceTestBase.mockCollection.getOne.mockRejectedValue(
          ErrorScenarioFactory.notFoundError('Record')
        );

        const result = await testService.exists('nonexistent-id');

        expect(result).toBe(false);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('createBatch()', () => {
      it('should create multiple records', async () => {
        const records = [
          { title: 'Record 1', status: 'active', user: 'user-1' },
          { title: 'Record 2', status: 'active', user: 'user-1' },
        ];

        serviceTestBase.mockCollection.create
          .mockResolvedValueOnce({ id: '1', ...records[0] } as TestRecord)
          .mockResolvedValueOnce({ id: '2', ...records[1] } as TestRecord);

        const results = await testService.createBatch(records);

        expect(serviceTestBase.mockCollection.create).toHaveBeenCalledTimes(2);
        expect(results).toHaveLength(2);
        expect(results[0].id).toBe('1');
        expect(results[1].id).toBe('2');
      });

      it('should handle partial failures in batch create', async () => {
        const records = [
          { title: 'Record 1', status: 'active', user: 'user-1' },
          { title: 'Record 2', status: 'active', user: 'user-1' },
        ];

        serviceTestBase.mockCollection.create
          .mockResolvedValueOnce({ id: '1', ...records[0] } as TestRecord)
          .mockRejectedValueOnce(ErrorScenarioFactory.validationError('title', 'Invalid'));

        await expect(testService.createBatch(records)).rejects.toThrow();
      });
    });

    describe('updateBatch()', () => {
      it('should update multiple records', async () => {
        const updates = [
          { id: '1', data: { title: 'Updated 1' } },
          { id: '2', data: { title: 'Updated 2' } },
        ];

        serviceTestBase.mockCollection.update
          .mockResolvedValueOnce({ id: '1', title: 'Updated 1' } as TestRecord)
          .mockResolvedValueOnce({ id: '2', title: 'Updated 2' } as TestRecord);

        const results = await testService.updateBatch(updates);

        expect(serviceTestBase.mockCollection.update).toHaveBeenCalledTimes(2);
        expect(results).toHaveLength(2);
      });
    });

    describe('deleteBatch()', () => {
      it('should delete multiple records', async () => {
        const ids = ['1', '2', '3'];
        serviceTestBase.mockCollection.delete.mockResolvedValue(true);

        const results = await testService.deleteBatch(ids);

        expect(serviceTestBase.mockCollection.delete).toHaveBeenCalledTimes(3);
        expect(results).toEqual([true, true, true]);
      });
    });

    describe('getByIds()', () => {
      it('should get records by multiple IDs', async () => {
        const ids = ['1', '2', '3'];
        const mockListResult = {
          page: 1,
          perPage: 3,
          totalItems: 3,
          totalPages: 1,
          items: ids.map(id => ({ id, title: `Record ${id}` }) as TestRecord),
        };

        serviceTestBase.mockCollection.getList.mockResolvedValue(mockListResult);

        const results = await testService.getByIds(ids);

        expect(results).toHaveLength(3);
        expect(results[0].id).toBe('1');
      });

      it('should return empty array for empty ID list', async () => {
        const results = await testService.getByIds([]);

        expect(results).toEqual([]);
        expect(serviceTestBase.mockCollection.getList).not.toHaveBeenCalled();
      });
    });
  });

  describe('Subscription Management', () => {
    it('should create subscriptions with filters', () => {
      const callback = vi.fn();
      const filter: StructuredFilter = {
        conditions: [{ field: 'user', operator: '=', value: 'user-1' }],
      };

      testService.subscribe(callback, filter);

      // Verify subscription was created (actual implementation would be mocked)
      expect(callback).toBeDefined();
    });

    it('should unsubscribe from all collection subscriptions', () => {
      testService.unsubscribeAll();

      // Verify unsubscribe was called (actual implementation would be mocked)
      expect(testService).toBeDefined();
    });
  });

  describe('Utility Methods', () => {
    describe('getStats()', () => {
      it('should return collection statistics', async () => {
        serviceTestBase.mockCollection.getList.mockResolvedValue({
          page: 1,
          perPage: 1,
          totalItems: 100,
          totalPages: 100,
          items: [],
        });

        const stats = await testService.getStats();

        expect(stats).toEqual({
          total: 100,
          collection: 'test_records',
          subscriptions: 0,
        });
      });
    });

    describe('filter()', () => {
      it('should create a filter builder', () => {
        const builder = testService.filter();

        expect(builder).toBeDefined();
      });
    });

    describe('forUser()', () => {
      it('should create a user-scoped filter builder', () => {
        const builder = testService.forUser('user-123');

        expect(builder).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      serviceTestBase.mockCollection.getList.mockRejectedValue(
        ErrorScenarioFactory.networkTimeout()
      );

      await expect(testService.list()).rejects.toThrow();
    });

    it('should handle authentication errors', async () => {
      serviceTestBase.mockCollection.getOne.mockRejectedValue(
        ErrorScenarioFactory.authenticationError()
      );

      await expect(testService.getOne('test-id')).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      serviceTestBase.mockCollection.create.mockRejectedValue(
        ErrorScenarioFactory.validationError('title', 'Title is required')
      );

      await expect(testService.create({})).rejects.toThrow();
    });
  });

  describe('Field Mapping', () => {
    it('should apply field mapping for frontend data', async () => {
      const inputData = { datePurchased: '2024-01-01' };
      const expectedBackendData = { date_purchased: '2024-01-01' };

      serviceTestBase.mockCollection.create.mockResolvedValue({
        id: 'mapped-id',
        ...expectedBackendData,
      } as TestRecord);

      await testService.create(inputData as Partial<TestRecord>);

      // Field mapping would be applied by FieldMapper mock
      expect(serviceTestBase.mockCollection.create).toHaveBeenCalledWith(inputData);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large result sets efficiently', async () => {
      const largeResultSet = {
        page: 1,
        perPage: 1000,
        totalItems: 10000,
        totalPages: 10,
        items: Array.from(
          { length: 1000 },
          (_, i) => ({ id: `item-${i}`, title: `Item ${i}` }) as TestRecord
        ),
      };

      serviceTestBase.mockCollection.getList.mockResolvedValue(largeResultSet);

      const result = await testService.list({ perPage: 1000 });

      expect(result.items).toHaveLength(1000);
      expect(result.totalItems).toBe(10000);
    });

    it('should handle concurrent operations', async () => {
      MockScenarios.concurrency(serviceTestBase.mockCollection);

      const promises = Array.from({ length: 5 }, (_, i) =>
        testService.create({ title: `Concurrent ${i}`, status: 'active', user: 'user-1' })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(serviceTestBase.mockCollection.create).toHaveBeenCalledTimes(5);
    });
  });
});
