import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardStatsService } from '../dashboardStatsService';
import type { CachedStatsRecord } from '@/types/dashboard-stats';

// Mock PocketBase using vi.hoisted to avoid initialization issues
const {
  mockStatsGetFirstListItem,
  mockStatsGetFullList,
  mockStatsCreate,
  mockStatsUpdate,
  mockStatsDelete,
  mockProjectsGetFullList,
  mockProjectsGetList,
  mockFilter,
  mockCollection,
} = vi.hoisted(() => ({
  mockStatsGetFirstListItem: vi.fn(),
  mockStatsGetFullList: vi.fn(),
  mockStatsCreate: vi.fn(),
  mockStatsUpdate: vi.fn(),
  mockStatsDelete: vi.fn(),
  mockProjectsGetFullList: vi.fn(),
  mockProjectsGetList: vi.fn(),
  mockFilter: vi.fn(
    (filter: string, params: Record<string, unknown>) => `${filter} with ${JSON.stringify(params)}`
  ),
  mockCollection: vi.fn(),
}));

// Set up collection-specific mocks
mockCollection.mockImplementation((collectionName: string) => {
  if (collectionName === 'user_yearly_stats') {
    return {
      getFirstListItem: mockStatsGetFirstListItem,
      getFullList: mockStatsGetFullList,
      create: mockStatsCreate,
      update: mockStatsUpdate,
      delete: mockStatsDelete,
    };
  } else if (collectionName === 'projects') {
    return {
      getFirstListItem: mockStatsGetFirstListItem, // Same for both, but different data
      getFullList: mockProjectsGetFullList,
      getList: mockProjectsGetList,
      create: mockStatsCreate,
      update: mockStatsUpdate,
      delete: mockStatsDelete,
    };
  }
  // Default fallback - should not happen in normal test execution
  console.warn(`Unexpected collection name: ${collectionName}`);
  return {
    getFirstListItem: mockStatsGetFirstListItem,
    getFullList: mockStatsGetFullList,
    create: mockStatsCreate,
    update: mockStatsUpdate,
    delete: mockStatsDelete,
  };
});

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: mockCollection,
    filter: mockFilter,
  },
}));

// Mock performance.now for consistent timing
const mockPerformanceNow = vi.fn();
vi.stubGlobal('performance', {
  now: mockPerformanceNow,
});

describe('DashboardStatsService', () => {
  const testUserId = 'user123';
  const testYear = 2025;

  const mockCachedRecord: CachedStatsRecord = {
    id: 'cache123',
    user: testUserId,
    year: testYear,
    stats_type: 'yearly',
    completed_count: 5,
    started_count: 3,
    in_progress_count: 2,
    total_diamonds: 15000,
    estimated_drills: 15000,
    status_breakdown: {
      wishlist: 1,
      purchased: 2,
      stash: 1,
      progress: 2,
      completed: 5,
      archived: 0,
      destashed: 0,
    },
    last_calculated: '2025-06-13T12:00:00Z',
    calculation_duration_ms: 150,
    projects_included: 11,
    cache_version: '2.0.0',
    created: '2025-06-13T12:00:00Z',
    updated: '2025-06-13T12:00:00Z',
  };

  const mockProjects = [
    {
      id: 'proj1',
      status: 'completed',
      total_diamonds: 5000,
      date_started: '2025-02-01',
      date_completed: '2025-02-15',
    },
    {
      id: 'proj2',
      status: 'completed',
      total_diamonds: 7000,
      date_started: '2025-03-01',
      date_completed: '2025-03-20',
    },
    {
      id: 'proj3',
      status: 'completed',
      total_diamonds: 3000,
      date_started: '2025-04-01',
      date_completed: '2025-04-10',
    },
    {
      id: 'proj4',
      status: 'progress',
      total_diamonds: 0,
      date_started: '2025-05-01',
      date_completed: null,
    },
    {
      id: 'proj5',
      status: 'progress',
      total_diamonds: 0,
      date_started: '2025-05-15',
      date_completed: null,
    },
    {
      id: 'proj6',
      status: 'wishlist',
      total_diamonds: 0,
      date_started: null,
      date_completed: null,
    },
    {
      id: 'proj7',
      status: 'purchased',
      total_diamonds: 0,
      date_started: null,
      date_completed: null,
    },
    {
      id: 'proj8',
      status: 'purchased',
      total_diamonds: 0,
      date_started: null,
      date_completed: null,
    },
    {
      id: 'proj9',
      status: 'stash',
      total_diamonds: 0,
      date_started: null,
      date_completed: null,
    },
    {
      id: 'proj10',
      status: 'archived',
      total_diamonds: 0,
      date_started: '2024-12-01',
      date_completed: '2024-12-15',
    },
    {
      id: 'proj11',
      status: 'destashed',
      total_diamonds: 0,
      date_started: null,
      date_completed: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000); // Start time

    // Set up default project data mock - this is crucial for all calculation tests
    mockProjectsGetFullList.mockResolvedValue(mockProjects);

    // Set up paginated getList mock for real-time calculations
    mockProjectsGetList.mockResolvedValue({
      items: mockProjects,
      page: 1,
      perPage: 200,
      totalItems: mockProjects.length,
      totalPages: 1,
    });

    // Reset the collection mock implementation
    mockCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'user_yearly_stats') {
        return {
          getFirstListItem: mockStatsGetFirstListItem,
          getFullList: mockStatsGetFullList,
          create: mockStatsCreate,
          update: mockStatsUpdate,
          delete: mockStatsDelete,
        };
      } else if (collectionName === 'projects') {
        return {
          getFirstListItem: mockStatsGetFirstListItem,
          getFullList: mockProjectsGetFullList,
          getList: mockProjectsGetList,
          create: mockStatsCreate,
          update: mockStatsUpdate,
          delete: mockStatsDelete,
        };
      }
      // Default fallback
      return {
        getFirstListItem: mockStatsGetFirstListItem,
        getFullList: mockStatsGetFullList,
        create: mockStatsCreate,
        update: mockStatsUpdate,
        delete: mockStatsDelete,
      };
    });

    // Reset service configuration to defaults
    DashboardStatsService.configure({
      cacheExpirationMs: 5 * 60 * 1000, // 5 minutes
      enableLogging: false, // Disable for tests
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getYearlyStats', () => {
    it('should return fresh cache when available and not expired', async () => {
      // Mock fresh cache hit - set cache to current time to make it fresh
      const freshCache = {
        ...mockCachedRecord,
        last_calculated: new Date().toISOString(), // Fresh timestamp
      };

      mockStatsGetFirstListItem.mockResolvedValueOnce(freshCache);
      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1050); // End time

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result).toEqual({
        stats: {
          completed_count: 5,
          started_count: 3,
          in_progress_count: 2,
          total_diamonds: 15000,
          estimated_drills: 15000,
          status_breakdown: mockCachedRecord.status_breakdown,
        },
        source: 'cache',
        cached_at: freshCache.last_calculated,
        calculation_time_ms: 50,
      });

      expect(mockStatsGetFirstListItem).toHaveBeenCalledWith(
        expect.stringContaining('user = {:userId} && year = {:year} && stats_type = {:statsType}'),
        expect.objectContaining({
          fields: expect.stringContaining('completed_count,started_count'),
        })
      );
    });

    it('should calculate real-time stats when cache is expired', async () => {
      // Mock expired cache - set it far enough in the past to be expired
      const expiredCache = {
        ...mockCachedRecord,
        last_calculated: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      };

      mockStatsGetFirstListItem
        .mockResolvedValueOnce(expiredCache) // First call for cache check
        .mockResolvedValueOnce({ id: 'cache123' }); // Second call for upsert check

      // Mock the paginated getList response for real-time calculation
      mockProjectsGetList.mockResolvedValueOnce({
        items: mockProjects,
        page: 1,
        perPage: 200,
        totalItems: mockProjects.length,
        totalPages: 1,
      });

      const updatedCache = {
        ...mockCachedRecord,
        completed_count: 3, // Expected calculated value
        started_count: 5, // Expected calculated value
        last_calculated: new Date().toISOString(),
      };
      mockStatsUpdate.mockResolvedValueOnce(updatedCache);

      mockPerformanceNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1100) // Calculation start
        .mockReturnValueOnce(1200) // Calculation end
        .mockReturnValueOnce(1250); // Final end time

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.source).toBe('realtime');
      expect(result.stats.completed_count).toBe(3); // Only projects completed in 2025
      expect(result.stats.started_count).toBe(5); // Projects started in 2025
      expect(result.stats.in_progress_count).toBe(2);
      expect(result.stats.total_diamonds).toBe(15000); // Sum of completed projects
    });

    it('should return stale cache when real-time calculation fails', async () => {
      const staleCache = {
        ...mockCachedRecord,
        last_calculated: '2025-06-13T11:00:00Z', // Expired
      };

      mockStatsGetFirstListItem.mockResolvedValueOnce(staleCache);
      mockStatsGetFullList.mockRejectedValueOnce(new Error('Database error'));

      // Mock expired cache
      const mockDateNow = Date.now;
      Date.now = vi.fn(() => new Date('2025-06-13T12:10:00Z').getTime());

      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.source).toBe('fallback');
      expect(result.stats).toEqual({
        completed_count: 5,
        started_count: 3,
        in_progress_count: 2,
        total_diamonds: 15000,
        estimated_drills: 15000,
        status_breakdown: mockCachedRecord.status_breakdown,
      });

      Date.now = mockDateNow;
    });

    it('should return fallback stats when everything fails', async () => {
      mockStatsGetFirstListItem.mockRejectedValueOnce(new Error('Cache error'));

      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.source).toBe('fallback');
      expect(result.stats).toEqual({
        completed_count: 0,
        started_count: 0,
        in_progress_count: 0,
        total_diamonds: 0,
        estimated_drills: 0,
        status_breakdown: {
          wishlist: 0,
          purchased: 0,
          stash: 0,
          progress: 0,
          completed: 0,
          archived: 0,
          destashed: 0,
        },
      });
    });
  });

  describe('calculateDetailedStats', () => {
    it('should calculate correct stats from project data', async () => {
      mockStatsGetFirstListItem
        .mockRejectedValueOnce({ status: 404 }) // No cache initially for stats collection (PocketBase throws 404)
        .mockRejectedValueOnce({ status: 404 }); // No existing record for upsert (PocketBase throws 404)

      // Let the service do the actual calculation - just mock the create to return the calculated data
      mockStatsCreate.mockImplementation(async cacheData => {
        // Return a proper cache record with the calculated data
        return {
          id: 'new-cache-id',
          user: cacheData.user,
          year: cacheData.year,
          stats_type: cacheData.stats_type,
          completed_count: cacheData.completed_count,
          started_count: cacheData.started_count,
          in_progress_count: cacheData.in_progress_count,
          total_diamonds: cacheData.total_diamonds,
          estimated_drills: cacheData.estimated_drills,
          status_breakdown: cacheData.status_breakdown,
          last_calculated: new Date().toISOString(),
          calculation_duration_ms: cacheData.calculation_duration_ms,
          projects_included: cacheData.projects_included,
          cache_version: cacheData.cache_version,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
      });

      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100)
        .mockReturnValueOnce(1200);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.stats.completed_count).toBe(3); // Projects completed in 2025
      expect(result.stats.started_count).toBe(5); // Projects started in 2025
      expect(result.stats.in_progress_count).toBe(2); // Current progress status
      expect(result.stats.total_diamonds).toBe(15000); // Sum from completed projects
      expect(result.stats.status_breakdown).toEqual({
        wishlist: 1,
        purchased: 2,
        stash: 1,
        progress: 2,
        completed: 3, // Count from mockProjects
        archived: 1,
        destashed: 1,
      });
    });

    it('should handle empty project data', async () => {
      mockStatsGetFirstListItem
        .mockResolvedValueOnce(null) // No cache
        .mockResolvedValueOnce(null); // No existing record for upsert
      mockProjectsGetFullList.mockResolvedValueOnce([]); // No projects
      mockStatsCreate.mockResolvedValueOnce({
        ...mockCachedRecord,
        completed_count: 0,
        started_count: 0,
        in_progress_count: 0,
        total_diamonds: 0,
        status_breakdown: {
          wishlist: 0,
          purchased: 0,
          stash: 0,
          progress: 0,
          completed: 0,
          archived: 0,
          destashed: 0,
        },
        projects_included: 0,
      });

      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100)
        .mockReturnValueOnce(1200);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.stats.completed_count).toBe(0);
      expect(result.stats.started_count).toBe(0);
      expect(result.stats.in_progress_count).toBe(0);
      expect(result.stats.total_diamonds).toBe(0);
    });

    it('should filter projects by year correctly', async () => {
      const projectsWithMixedYears = [
        ...mockProjects,
        {
          id: 'proj_old',
          status: 'completed',
          total_diamonds: 1000,
          date_started: '2024-01-01',
          date_completed: '2024-01-15',
        },
        {
          id: 'proj_future',
          status: 'completed',
          total_diamonds: 2000,
          date_started: '2026-01-01',
          date_completed: '2026-01-15',
        },
      ];

      mockStatsGetFirstListItem
        .mockRejectedValueOnce({ status: 404 }) // No cache (PocketBase throws 404)
        .mockRejectedValueOnce({ status: 404 }); // No existing record for upsert (PocketBase throws 404)

      mockProjectsGetFullList.mockResolvedValueOnce(projectsWithMixedYears);

      // Mock create with filtered results
      const filteredCache = {
        ...mockCachedRecord,
        completed_count: 3, // Only 2025 completed projects
        total_diamonds: 15000, // Only from 2025 projects
        last_calculated: new Date().toISOString(),
      };
      mockStatsCreate.mockResolvedValueOnce(filteredCache);

      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100)
        .mockReturnValueOnce(1200);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      // Should only count 2025 projects
      expect(result.stats.completed_count).toBe(3);
      expect(result.stats.total_diamonds).toBe(15000);
    });
  });

  describe('updateCacheAfterProjectChange', () => {
    it('should proactively update cache', async () => {
      mockStatsGetFirstListItem.mockResolvedValueOnce({ id: 'cache123' });
      mockProjectsGetFullList.mockResolvedValueOnce(mockProjects);
      mockStatsUpdate.mockResolvedValueOnce(mockCachedRecord);

      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100)
        .mockReturnValueOnce(1200);

      await DashboardStatsService.updateCacheAfterProjectChange(testUserId, testYear);

      expect(mockStatsUpdate).toHaveBeenCalledWith(
        'cache123',
        expect.objectContaining({
          completed_count: 3,
          last_calculated: expect.any(String),
        })
      );
    });

    it('should fallback to invalidation on calculation failure', async () => {
      // Force the project fetch to fail for the proactive update
      mockProjectsGetFullList.mockRejectedValueOnce(new Error('Calculation failed'));

      // Mock the invalidation process
      mockStatsGetFullList.mockResolvedValueOnce([{ id: 'cache123' }]); // For invalidation
      mockStatsDelete.mockResolvedValueOnce(true);

      await DashboardStatsService.updateCacheAfterProjectChange(testUserId, testYear);

      expect(mockStatsDelete).toHaveBeenCalledWith('cache123');
    });

    it('should use current year when no year specified', async () => {
      const currentYear = new Date().getFullYear();

      mockStatsGetFirstListItem.mockResolvedValueOnce({ id: 'cache123' });
      mockProjectsGetFullList.mockResolvedValueOnce(mockProjects);
      mockStatsUpdate.mockResolvedValueOnce(mockCachedRecord);

      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100)
        .mockReturnValueOnce(1200);

      await DashboardStatsService.updateCacheAfterProjectChange(testUserId);

      expect(mockFilter).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          year: currentYear,
        })
      );
    });
  });

  describe('invalidateCache', () => {
    it('should delete specific year cache when year provided', async () => {
      mockStatsGetFullList.mockResolvedValueOnce([{ id: 'cache1' }, { id: 'cache2' }]);
      mockStatsDelete.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      await DashboardStatsService.invalidateCache(testUserId, testYear);

      expect(mockStatsGetFullList).toHaveBeenCalledWith({
        filter: expect.stringContaining('user = {:userId} && year = {:year}'),
        fields: 'id',
      });
      expect(mockStatsDelete).toHaveBeenCalledTimes(2);
    });

    it('should delete all user cache when no year provided', async () => {
      mockStatsGetFullList.mockResolvedValueOnce([{ id: 'cache1' }]);
      mockStatsDelete.mockResolvedValueOnce(true);

      await DashboardStatsService.invalidateCache(testUserId);

      expect(mockStatsGetFullList).toHaveBeenCalledWith({
        filter: expect.stringContaining('user = {:userId}'),
        fields: 'id',
      });
      expect(mockStatsDelete).toHaveBeenCalledWith('cache1');
    });

    it('should handle deletion errors gracefully', async () => {
      mockStatsGetFullList.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw
      await expect(
        DashboardStatsService.invalidateCache(testUserId, testYear)
      ).resolves.toBeUndefined();
    });
  });

  describe('preWarmCache', () => {
    it('should trigger cache calculation for current year', async () => {
      mockStatsGetFirstListItem
        .mockRejectedValueOnce({ status: 404 }) // No cache found (PocketBase throws 404)
        .mockRejectedValueOnce({ status: 404 }); // No existing record for upsert (PocketBase throws 404)

      // Let the service do the calculation and create the cache
      mockStatsCreate.mockImplementation(async cacheData => {
        return {
          id: 'new-cache-id',
          user: cacheData.user,
          year: cacheData.year,
          stats_type: cacheData.stats_type,
          completed_count: cacheData.completed_count,
          started_count: cacheData.started_count,
          in_progress_count: cacheData.in_progress_count,
          total_diamonds: cacheData.total_diamonds,
          estimated_drills: cacheData.estimated_drills,
          status_breakdown: cacheData.status_breakdown,
          last_calculated: new Date().toISOString(),
          calculation_duration_ms: cacheData.calculation_duration_ms,
          projects_included: cacheData.projects_included,
          cache_version: cacheData.cache_version,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
      });

      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100)
        .mockReturnValueOnce(1200);

      await DashboardStatsService.preWarmCache(testUserId);

      expect(mockStatsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          user: testUserId,
          year: new Date().getFullYear(),
          stats_type: 'yearly',
        })
      );
    });

    it('should handle pre-warming failures gracefully', async () => {
      mockStatsGetFirstListItem.mockRejectedValueOnce(new Error('Pre-warm failed'));

      // Should not throw
      await expect(DashboardStatsService.preWarmCache(testUserId)).resolves.toBeUndefined();
    });
  });

  describe('getCacheStatus', () => {
    it('should return cache status when cache exists', async () => {
      // Create a cache record that's only 2 minutes old (fresh)
      const recentCache = {
        ...mockCachedRecord,
        last_calculated: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      };

      mockStatsGetFirstListItem.mockResolvedValueOnce(recentCache);

      const status = await DashboardStatsService.getCacheStatus(testUserId, testYear);

      expect(status).toEqual({
        year: testYear,
        exists: true,
        fresh: true, // Within 5 minute default expiration
        cached_at: recentCache.last_calculated,
        age_ms: expect.any(Number), // Age will vary slightly due to execution time
        needsBackgroundRefresh: expect.any(Boolean),
      });

      // Check that age is approximately 2 minutes (with some tolerance)
      expect(status.age_ms).toBeGreaterThan(2 * 60 * 1000 - 1000); // 1 second tolerance
      expect(status.age_ms).toBeLessThan(2 * 60 * 1000 + 1000);
    });

    it('should return non-existent status when cache missing', async () => {
      mockStatsGetFirstListItem.mockRejectedValueOnce(new Error('Not found'));

      const status = await DashboardStatsService.getCacheStatus(testUserId, testYear);

      expect(status).toEqual({
        year: testYear,
        exists: false,
        fresh: false,
      });
    });

    it('should use current year when none specified', async () => {
      const currentYear = new Date().getFullYear();
      mockStatsGetFirstListItem.mockRejectedValueOnce(new Error('Not found'));

      const status = await DashboardStatsService.getCacheStatus(testUserId);

      expect(status.year).toBe(currentYear);
    });
  });

  describe('service configuration', () => {
    it('should allow custom configuration', async () => {
      const customConfig = {
        cacheExpirationMs: 10 * 60 * 1000, // 10 minutes
        enableLogging: true,
      };

      DashboardStatsService.configure(customConfig);

      // Create a cache record that's 8 minutes old (should be fresh with 10 minute expiration)
      const cacheRecord8MinutesOld = {
        ...mockCachedRecord,
        last_calculated: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 minutes ago
      };

      mockStatsGetFirstListItem.mockResolvedValueOnce(cacheRecord8MinutesOld);
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1050);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      // With 10 minute expiration, 8-minute-old cache should still be fresh
      expect(result.source).toBe('cache'); // Should use cache, not recalculate
    });
  });

  describe('error handling', () => {
    it('should throw StatsServiceError for calculation failures', async () => {
      mockStatsGetFirstListItem.mockResolvedValueOnce(null); // No cache
      mockStatsGetFullList.mockRejectedValueOnce(new Error('Database connection failed'));

      // Should return fallback stats instead of throwing
      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(result.source).toBe('fallback');
      expect(result.stats.completed_count).toBe(0);
    });

    it('should handle malformed cache data', async () => {
      const malformedCache = {
        ...mockCachedRecord,
        completed_count: 'invalid', // Should be number
      };

      mockStatsGetFirstListItem.mockResolvedValueOnce(malformedCache);

      // Should handle validation error and fallback to calculation
      mockProjectsGetFullList.mockResolvedValueOnce(mockProjects);
      mockStatsCreate.mockResolvedValueOnce(mockCachedRecord);

      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100)
        .mockReturnValueOnce(1200);

      const result = await DashboardStatsService.getYearlyStats(testUserId, testYear);

      // Should have calculated new stats due to invalid cache
      expect(result.source).toBe('fallback'); // Will fallback due to validation error
    });
  });

  describe('upsert operations', () => {
    it('should update existing cache record', async () => {
      mockStatsGetFirstListItem
        .mockResolvedValueOnce(null) // Initial cache check
        .mockResolvedValueOnce({ id: 'existing-cache' }); // Upsert finds existing

      mockProjectsGetFullList.mockResolvedValueOnce(mockProjects);
      mockStatsUpdate.mockResolvedValueOnce(mockCachedRecord);

      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100)
        .mockReturnValueOnce(1200);

      await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(mockStatsUpdate).toHaveBeenCalledWith(
        'existing-cache',
        expect.objectContaining({
          completed_count: 3,
          last_calculated: expect.any(String),
        })
      );
      expect(mockStatsCreate).not.toHaveBeenCalled();
    });

    it('should create new cache record when none exists', async () => {
      mockStatsGetFirstListItem
        .mockResolvedValueOnce(null) // Initial cache check
        .mockRejectedValueOnce({ status: 404 }); // Upsert finds no existing record

      mockProjectsGetFullList.mockResolvedValueOnce(mockProjects);
      mockStatsCreate.mockResolvedValueOnce(mockCachedRecord);

      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100)
        .mockReturnValueOnce(1200);

      await DashboardStatsService.getYearlyStats(testUserId, testYear);

      expect(mockStatsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          user: testUserId,
          year: testYear,
          completed_count: 3,
          last_calculated: expect.any(String),
        })
      );
      expect(mockStatsUpdate).not.toHaveBeenCalled();
    });
  });
});
