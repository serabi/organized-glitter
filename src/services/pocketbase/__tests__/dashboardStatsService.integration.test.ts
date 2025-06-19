/**
 * Integration Tests for DashboardStatsService
 *
 * These tests verify the complete cache behavior including:
 * - Cache hit/miss scenarios
 * - Request deduplication
 * - Background refresh
 * - Error handling and fallback strategies
 * - Real PocketBase integration scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { DashboardStatsService } from '../dashboardStatsService';
import { ClientResponseError } from 'pocketbase';

// Mock PocketBase with proper method signatures
vi.mock('@/lib/pocketbase', () => {
  const mockCollections = new Map();

  const createMockCollection = () => ({
    getFirstListItem: vi.fn(),
    getList: vi.fn(), // This returns paginated results
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  });

  return {
    pb: {
      collection: vi.fn((name: string) => {
        if (!mockCollections.has(name)) {
          mockCollections.set(name, createMockCollection());
        }
        return mockCollections.get(name);
      }),
      filter: vi.fn((template: string, ...params: any[]) => {
        // Mock filter method that builds query strings like PocketBase does
        let result = template;
        let paramIndex = 0;
        // Replace {:paramName} placeholders with parameter values
        result = result.replace(/\{\s*\:\s*\w+\s*\}/g, () => {
          const param = params[paramIndex++];
          if (typeof param === 'string') {
            return `"${param}"`;
          }
          return String(param);
        });
        return result;
      }),
      authStore: {
        isValid: true,
        model: { id: 'test-user' },
      },
    },
  };
});

import { pb } from '@/lib/pocketbase';

interface MockCollection {
  getFirstListItem: ReturnType<typeof vi.fn>;
  getList?: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
}

// Mock PocketBase responses
const mockProjectsData = [
  {
    id: 'proj1',
    status: 'completed',
    total_diamonds: 1000,
    date_completed: '2025-01-15',
    date_started: '2025-01-01',
  },
  {
    id: 'proj2',
    status: 'progress',
    total_diamonds: 500,
    date_completed: null,
    date_started: '2025-01-10',
  },
  {
    id: 'proj3',
    status: 'completed',
    total_diamonds: 750,
    date_completed: '2025-02-01',
    date_started: '2024-12-20',
  },
];

const mockCachedStatsRecord = {
  id: 'cache1',
  user: 'test-user',
  year: 2025,
  stats_type: 'yearly',
  completed_count: 2,
  started_count: 2,
  in_progress_count: 1,
  total_diamonds: 1750,
  estimated_drills: 1750,
  status_breakdown: {
    wishlist: 0,
    purchased: 0,
    stash: 0,
    progress: 1,
    completed: 2,
    archived: 0,
    destashed: 0,
  },
  last_calculated: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
  calculation_duration_ms: 150,
  projects_included: 3,
  cache_version: '2.0.0',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
};

describe('DashboardStatsService Integration Tests', () => {
  const testUserId = 'test-user-integration';
  const testYear = 2025;

  beforeAll(() => {
    // Configure service for testing
    DashboardStatsService.configure({
      cacheExpirationMs: 60 * 60 * 1000, // 1 hour
      retryAttempts: 2,
      timeoutMs: 5000,
      enableLogging: false,
      backgroundRefreshThreshold: 0.75,
      maxBackgroundRefreshDelay: 1000,
    });
  });

  beforeEach(() => {
    // Reset metrics before each test
    DashboardStatsService.resetMetrics();
    DashboardStatsService.clearPendingOperations();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    DashboardStatsService.clearPendingOperations();
  });

  describe('Cache Hit Scenarios', () => {
    it('should return fresh cache when available', async () => {
      // Mock fresh cache hit
      const userStatsCollection = pb.collection('user_yearly_stats');
      userStatsCollection.getFirstListItem.mockResolvedValue(mockCachedStatsRecord);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.source).toBe('cache');
      expect(result.stats.completed_count).toBe(2);
      expect(result.cached_at).toBe(mockCachedStatsRecord.last_calculated);
      expect(userStatsCollection.getFirstListItem).toHaveBeenCalledOnce();

      // Verify metrics
      const metrics = DashboardStatsService.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(0);
      expect(metrics.totalRequests).toBe(1);
    });

    it('should handle cache hit with background refresh trigger', async () => {
      // Mock stale but valid cache (older than 75% of cache lifetime)
      const staleCache = {
        ...mockCachedStatsRecord,
        last_calculated: new Date(Date.now() - 50 * 60 * 1000).toISOString(), // 50 minutes ago (83% of 1 hour)
      };

      const mockGetFirstListItem = vi.fn().mockResolvedValue(staleCache);
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockImplementation(
        mockGetFirstListItem
      );

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.source).toBe('cache');
      expect(result.stats.completed_count).toBe(2);

      // Background refresh should be scheduled (verified by timer being set)
      const metrics = DashboardStatsService.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.backgroundRefreshesActive).toBeGreaterThan(0);
    });
  });

  describe('Cache Miss Scenarios', () => {
    it('should calculate and cache stats on cache miss', async () => {
      // Mock cache miss (404 error)
      const mockCacheError = new Error('Not found');
      (mockCacheError as ClientResponseError).status = 404;

      const userStatsCollection = pb.collection('user_yearly_stats');
      const projectsCollection = pb.collection('projects');

      userStatsCollection.getFirstListItem.mockRejectedValue(mockCacheError);
      // Mock paginated response for getList instead of getFullList
      projectsCollection.getList.mockResolvedValue({
        page: 1,
        perPage: 500,
        totalPages: 1,
        totalItems: mockProjectsData.length,
        items: mockProjectsData,
      });
      userStatsCollection.create.mockResolvedValue({ ...mockCachedStatsRecord, id: 'new-cache' });

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.source).toBe('realtime');
      expect(result.stats.completed_count).toBe(2);
      expect(result.stats.in_progress_count).toBe(1);
      expect(result.stats.total_diamonds).toBe(1750);

      // Verify cache was created
      expect(userStatsCollection.create).toHaveBeenCalledOnce();

      // Verify metrics
      const metrics = DashboardStatsService.getMetrics();
      expect(metrics.misses).toBe(1);
      expect(metrics.hits).toBe(0);
      expect(metrics.totalRequests).toBe(1);
    });

    it('should update existing cache on expired cache', async () => {
      // Mock expired cache
      const expiredCache = {
        ...mockCachedStatsRecord,
        last_calculated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      };

      let callCount = 0;
      const mockGetFirstListItem = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: return expired cache
          return Promise.resolve(expiredCache);
        } else {
          // Second call (for upsert): return existing record for update
          return Promise.resolve({ id: 'existing-cache' });
        }
      });
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockImplementation(
        mockGetFirstListItem
      );

      // Mock projects query with paginated response
      vi.spyOn(pb.collection('projects'), 'getList').mockResolvedValue({
        page: 1,
        perPage: 500,
        totalPages: 1,
        totalItems: mockProjectsData.length,
        items: mockProjectsData,
      });

      // Mock cache update
      const mockUpdate = vi
        .fn()
        .mockResolvedValue({ ...mockCachedStatsRecord, id: 'updated-cache' });
      vi.spyOn(pb.collection('user_yearly_stats'), 'update').mockImplementation(mockUpdate);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.source).toBe('realtime');
      expect(mockUpdate).toHaveBeenCalledOnce();

      const metrics = DashboardStatsService.getMetrics();
      expect(metrics.misses).toBe(1);
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate concurrent requests for same user/year', async () => {
      let resolveFirstRequest: (value: unknown) => void;
      const firstRequestPromise = new Promise(resolve => {
        resolveFirstRequest = resolve;
      });

      // Mock slow first request
      let callCount = 0;
      const mockGetFirstListItem = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return firstRequestPromise;
        }
        return Promise.resolve(mockCachedStatsRecord);
      });
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockImplementation(
        mockGetFirstListItem
      );

      // Start multiple concurrent requests
      const request1 = DashboardStatsService.getYearlyStats(testUserId, testYear);
      const request2 = DashboardStatsService.getYearlyStats(testUserId, testYear);
      const request3 = DashboardStatsService.getYearlyStats(testUserId, testYear);

      // Check pending requests count
      const metrics = DashboardStatsService.getMetrics();
      expect(metrics.pendingRequestsCount).toBe(1);

      // Resolve the first request
      resolveFirstRequest!(mockCachedStatsRecord);

      // All requests should resolve with same result
      const [result1, result2, result3] = await Promise.all([request1, request2, request3]);

      expect(result1.source).toBe('cache');
      expect(result2.source).toBe('cache');
      expect(result3.source).toBe('cache');

      // Should only have made one actual database call
      expect(mockGetFirstListItem).toHaveBeenCalledTimes(1);

      // Verify all pending requests are cleaned up
      const finalMetrics = DashboardStatsService.getMetrics();
      expect(finalMetrics.pendingRequestsCount).toBe(0);
    });

    it('should not deduplicate requests for different users', async () => {
      const mockGetFirstListItem = vi.fn().mockResolvedValue(mockCachedStatsRecord);
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockImplementation(
        mockGetFirstListItem
      );

      // Concurrent requests for different users
      const request1 = DashboardStatsService.getYearlyStats('user1', testYear);
      const request2 = DashboardStatsService.getYearlyStats('user2', testYear);

      await Promise.all([request1, request2]);

      // Should make separate database calls for different users
      expect(mockGetFirstListItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should fall back to stale cache when calculation fails', async () => {
      // Mock expired cache
      const expiredCache = {
        ...mockCachedStatsRecord,
        last_calculated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      };

      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockResolvedValue(
        expiredCache
      );

      // Mock calculation failure
      const mockProjectsError = new Error('Database connection failed');
      vi.spyOn(pb.collection('projects'), 'getList').mockRejectedValue(mockProjectsError);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.source).toBe('fallback');
      expect(result.stats.completed_count).toBe(2);

      const metrics = DashboardStatsService.getMetrics();
      expect(metrics.errors).toBe(1);
    });

    it('should return zero stats when all methods fail', async () => {
      // Mock cache error
      const mockCacheError = new Error('Cache not found');
      (mockCacheError as ClientResponseError).status = 404;
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockRejectedValue(
        mockCacheError
      );

      // Mock calculation error
      const mockProjectsError = new Error('Database error');
      vi.spyOn(pb.collection('projects'), 'getList').mockRejectedValue(mockProjectsError);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.source).toBe('fallback');
      expect(result.stats.completed_count).toBe(0);
      expect(result.stats.started_count).toBe(0);
      expect(result.stats.total_diamonds).toBe(0);

      const metrics = DashboardStatsService.getMetrics();
      expect(metrics.errors).toBe(2); // Both cache miss and projects calculation error
    });
  });

  describe('Background Refresh', () => {
    it('should execute background refresh for aging cache', async () => {
      vi.useFakeTimers();

      // Mock cache that needs background refresh (75% of cache lifetime)
      const agingCache = {
        ...mockCachedStatsRecord,
        last_calculated: new Date(Date.now() - 46 * 60 * 1000).toISOString(), // 46 minutes ago (76% of 1 hour)
      };

      let getFirstCallCount = 0;
      const mockGetFirstListItem = vi.fn().mockImplementation(() => {
        getFirstCallCount++;
        if (getFirstCallCount === 1) {
          return Promise.resolve(agingCache);
        } else {
          // For background refresh
          return Promise.resolve({ id: 'existing-cache' });
        }
      });
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockImplementation(
        mockGetFirstListItem
      );

      // Mock projects query for background refresh with paginated response
      vi.spyOn(pb.collection('projects'), 'getList').mockResolvedValue({
        page: 1,
        perPage: 500,
        totalPages: 1,
        totalItems: mockProjectsData.length,
        items: mockProjectsData,
      });

      // Mock cache update for background refresh
      const mockUpdate = vi
        .fn()
        .mockResolvedValue({ ...mockCachedStatsRecord, id: 'refreshed-cache' });
      vi.spyOn(pb.collection('user_yearly_stats'), 'update').mockImplementation(mockUpdate);

      // Initial request should trigger background refresh
      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);
      expect(result.source).toBe('cache');

      // Fast-forward to trigger background refresh
      await vi.advanceTimersByTimeAsync(1100); // Just over the max delay

      // Verify background refresh was executed
      const metrics = DashboardStatsService.getMetrics();
      expect(metrics.backgroundRefreshes).toBe(1);
      expect(mockUpdate).toHaveBeenCalledOnce();

      vi.useRealTimers();
    });
  });

  describe('Cache Invalidation and Updates', () => {
    it('should invalidate cache for specific user and year', async () => {
      // Mock finding cache records
      const mockGetFullList = vi.fn().mockResolvedValue([{ id: 'cache1' }, { id: 'cache2' }]);
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFullList').mockImplementation(
        mockGetFullList
      );

      // Mock cache deletion
      const mockDelete = vi.fn().mockResolvedValue(true);
      vi.spyOn(pb.collection('user_yearly_stats'), 'delete').mockImplementation(mockDelete);

      await DashboardStatsService.invalidateCache(testUserId, testYear);

      // The exact filter call may vary based on how pb.filter processes parameters
      expect(mockGetFullList).toHaveBeenCalledWith({
        filter: expect.any(String),
        fields: 'id',
      });
      expect(mockDelete).toHaveBeenCalledTimes(2);
    });

    it('should update cache after project changes', async () => {
      // Mock projects query with paginated response
      vi.spyOn(pb.collection('projects'), 'getList').mockResolvedValue({
        page: 1,
        perPage: 500,
        totalPages: 1,
        totalItems: mockProjectsData.length,
        items: mockProjectsData,
      });

      // Mock cache creation
      const mockCreate = vi
        .fn()
        .mockResolvedValue({ ...mockCachedStatsRecord, id: 'updated-cache' });
      vi.spyOn(pb.collection('user_yearly_stats'), 'create').mockImplementation(mockCreate);

      // Mock cache miss for upsert
      const mockCacheError = new Error('Not found');
      (mockCacheError as ClientResponseError).status = 404;
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockRejectedValue(
        mockCacheError
      );

      await DashboardStatsService.updateCacheAfterProjectChange(testUserId, testYear);

      expect(mockCreate).toHaveBeenCalledOnce();
    });
  });

  describe('Performance Metrics', () => {
    it('should track comprehensive performance metrics', async () => {
      // Mock cache hit
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockResolvedValue(
        mockCachedStatsRecord
      );

      // Make multiple requests to build metrics
      await DashboardStatsService.getYearlyStats(testUserId, testYear);
      await DashboardStatsService.getYearlyStats(testUserId, testYear + 1);
      await DashboardStatsService.getYearlyStats(testUserId + '2', testYear);

      const metrics = DashboardStatsService.getMetrics();

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.hits).toBe(3);
      expect(metrics.misses).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.hitRate).toBe(1.0);
      expect(metrics.errorRate).toBe(0.0);
    });

    it('should reset metrics correctly', async () => {
      // Generate some metrics
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockResolvedValue(
        mockCachedStatsRecord
      );
      await DashboardStatsService.getYearlyStats(testUserId, testYear);

      let metrics = DashboardStatsService.getMetrics();
      expect(metrics.totalRequests).toBe(1);

      // Reset metrics
      DashboardStatsService.resetMetrics();

      metrics = DashboardStatsService.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.errors).toBe(0);
    });
  });

  describe('Cache Status Monitoring', () => {
    it('should provide detailed cache status information', async () => {
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockResolvedValue(
        mockCachedStatsRecord
      );

      const status = await DashboardStatsService.getCacheStatus(testUserId, testYear);

      expect(status.year).toBe(testYear);
      expect(status.exists).toBe(true);
      expect(status.fresh).toBe(true);
      expect(status.cached_at).toBe(mockCachedStatsRecord.last_calculated);
      expect(status.age_ms).toBeGreaterThan(0);
      expect(typeof status.needsBackgroundRefresh).toBe('boolean');
    });

    it('should handle non-existent cache status', async () => {
      const mockError = new Error('Not found');
      (mockError as ClientResponseError).status = 404;
      vi.spyOn(pb.collection('user_yearly_stats'), 'getFirstListItem').mockRejectedValue(mockError);

      const status = await DashboardStatsService.getCacheStatus(testUserId, testYear);

      expect(status.year).toBe(testYear);
      expect(status.exists).toBe(false);
      expect(status.fresh).toBe(false);
      expect(status.cached_at).toBeUndefined();
      expect(status.age_ms).toBeUndefined();
    });
  });
});
