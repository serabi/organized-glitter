import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSpinHistory, randomizerQueryKeys } from '../useSpinHistory';
import {
  getSpinHistoryEnhanced,
  getSpinHistoryCountEnhanced,
} from '@/services/pocketbase/randomizerService';
import type { MockUseQueryResult } from '@/types/test-mocks';

// Mock dependencies
vi.mock('@tanstack/react-query');
vi.mock('@/services/pocketbase/randomizerService');
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockUseQuery = vi.mocked(useQuery);
const mockUseQueryClient = vi.mocked(useQueryClient);
const mockGetSpinHistoryEnhanced = vi.mocked(getSpinHistoryEnhanced);
const _mockGetSpinHistoryCountEnhanced = vi.mocked(getSpinHistoryCountEnhanced);

const mockSpinHistory = [
  {
    id: '1',
    user: 'user1',
    project: 'proj1',
    project_title: 'Test Project 1',
    project_company: 'Test Company',
    project_artist: 'Test Artist',
    selected_count: 2,
    selected_projects: ['proj1', 'proj2'],
    spun_at: '2024-01-01T12:00:00Z',
    created: '2024-01-01T12:00:00Z',
    updated: '2024-01-01T12:00:00Z',
    collectionId: 'randomizer_spins',
    collectionName: 'randomizer_spins' as any,
  },
  {
    id: '2',
    user: 'user1',
    project: 'proj2',
    project_title: 'Test Project 2',
    project_company: 'Test Company 2',
    project_artist: 'Test Artist 2',
    selected_count: 3,
    selected_projects: ['proj1', 'proj2', 'proj3'],
    spun_at: '2024-01-01T11:00:00Z',
    created: '2024-01-01T11:00:00Z',
    updated: '2024-01-01T11:00:00Z',
    collectionId: 'randomizer_spins',
    collectionName: 'randomizer_spins' as any,
  },
];

// Mock query client
const mockQueryClient = {
  prefetchQuery: vi.fn(),
};

beforeEach(() => {
  mockUseQueryClient.mockReturnValue(mockQueryClient as any);
});

describe('useSpinHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('calls useQuery with correct parameters', () => {
      mockUseQuery.mockReturnValue({
        data: mockSpinHistory,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: randomizerQueryKeys.history('user1', { limit: 8, expand: false }),
        queryFn: expect.any(Function),
        enabled: true,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: expect.any(Function),
        retryDelay: expect.any(Function),
      });
    });

    it('returns query result correctly', () => {
      mockUseQuery.mockReturnValue({
        data: mockSpinHistory,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(result.current.data).toEqual(mockSpinHistory);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Query Key Generation', () => {
    it('generates correct query key with default parameters', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: randomizerQueryKeys.history('user1', { limit: 8, expand: false }),
        })
      );
    });

    it('generates correct query key with custom limit', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1', limit: 50 }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: randomizerQueryKeys.history('user1', { limit: 50, expand: false }),
        })
      );
    });

    it('generates correct query key with project expansion', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1', expandProject: true }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: randomizerQueryKeys.history('user1', { limit: 8, expand: true }),
        })
      );
    });

    it('handles undefined userId in query key', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: undefined }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: randomizerQueryKeys.history('', { limit: 8, expand: false }),
        })
      );
    });
  });

  describe('Query Function', () => {
    it('calls getSpinHistoryEnhanced with correct parameters', async () => {
      mockGetSpinHistoryEnhanced.mockResolvedValue(mockSpinHistory);
      let queryFn: () => Promise<unknown>;

      mockUseQuery.mockImplementation(config => {
        queryFn = config.queryFn as typeof queryFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'user1', limit: 10, expandProject: true }));

      const result = await queryFn();

      expect(mockGetSpinHistoryEnhanced).toHaveBeenCalledWith('user1', 10, true);
      expect(result).toEqual(mockSpinHistory);
    });

    it('calls getSpinHistoryEnhanced with default expand parameter', async () => {
      mockGetSpinHistoryEnhanced.mockResolvedValue(mockSpinHistory);
      let queryFn: () => Promise<unknown>;

      mockUseQuery.mockImplementation(config => {
        queryFn = config.queryFn as typeof queryFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'user1', limit: 10 }));

      const result = await queryFn();

      expect(mockGetSpinHistoryEnhanced).toHaveBeenCalledWith('user1', 10, false);
      expect(result).toEqual(mockSpinHistory);
    });

    it('returns empty array when userId is not provided', async () => {
      let queryFn: () => Promise<unknown>;

      mockUseQuery.mockImplementation(config => {
        queryFn = config.queryFn as typeof queryFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: undefined }));

      const result = await queryFn();

      expect(mockGetSpinHistoryEnhanced).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('handles getSpinHistoryEnhanced errors', async () => {
      const error = new Error('Database error');
      mockGetSpinHistoryEnhanced.mockRejectedValue(error);
      let queryFn: () => Promise<unknown>;

      mockUseQuery.mockImplementation(config => {
        queryFn = config.queryFn as typeof queryFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      await expect(queryFn()).rejects.toThrow('Database error');
    });
  });

  describe('Enabled State', () => {
    it('is enabled by default when userId is provided', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      );
    });

    it('is disabled when enabled is explicitly false', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1', enabled: false }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('is disabled when userId is not provided even if enabled is true', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: undefined, enabled: true }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });

  describe('Caching Configuration', () => {
    it('uses correct stale time', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 30 * 1000, // 30 seconds
        })
      );
    });

    it('uses correct garbage collection time', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          gcTime: 5 * 60 * 1000, // 5 minutes
        })
      );
    });

    it('disables refetch on window focus', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          refetchOnWindowFocus: false,
        })
      );
    });
  });

  describe('Retry Logic', () => {
    it('does not retry on 4xx errors', () => {
      let retryFn: (failureCount: number, error: unknown) => boolean;

      mockUseQuery.mockImplementation(config => {
        retryFn = config.retry as typeof retryFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      // Test 400 error
      const error400 = { message: 'Bad Request 400' };
      expect(retryFn(1, error400)).toBe(false);

      // Test 401 error
      const error401 = { message: 'Unauthorized 401' };
      expect(retryFn(1, error401)).toBe(false);

      // Test 403 error
      const error403 = { message: 'Forbidden 403' };
      expect(retryFn(1, error403)).toBe(false);

      // Test 404 error
      const error404 = { message: 'Not Found 404' };
      expect(retryFn(1, error404)).toBe(false);
    });

    it('retries on 5xx errors up to 2 times', () => {
      let retryFn: (failureCount: number, error: unknown) => boolean;

      mockUseQuery.mockImplementation(config => {
        retryFn = config.retry as typeof retryFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      const error500 = { message: 'Internal Server Error 500' };

      expect(retryFn(0, error500)).toBe(true); // First retry
      expect(retryFn(1, error500)).toBe(true); // Second retry
      expect(retryFn(2, error500)).toBe(false); // No third retry
    });

    it('retries on network errors up to 2 times', () => {
      let retryFn: (failureCount: number, error: unknown) => boolean;

      mockUseQuery.mockImplementation(config => {
        retryFn = config.retry as typeof retryFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      const networkError = { message: 'Network Error' };

      expect(retryFn(0, networkError)).toBe(true);
      expect(retryFn(1, networkError)).toBe(true);
      expect(retryFn(2, networkError)).toBe(false);
    });

    it('handles errors without message property', () => {
      let retryFn: (failureCount: number, error: unknown) => boolean;

      mockUseQuery.mockImplementation(config => {
        retryFn = config.retry as typeof retryFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      const errorWithoutMessage = {};

      expect(retryFn(0, errorWithoutMessage)).toBe(true);
      expect(retryFn(1, errorWithoutMessage)).toBe(true);
      expect(retryFn(2, errorWithoutMessage)).toBe(false);
    });
  });

  describe('Retry Delay', () => {
    it('calculates exponential backoff correctly', () => {
      let retryDelayFn: (attemptIndex: number) => number;

      mockUseQuery.mockImplementation(config => {
        retryDelayFn = config.retryDelay as typeof retryDelayFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(retryDelayFn(0)).toBe(1000); // 1000 * 2^0 = 1000ms
      expect(retryDelayFn(1)).toBe(2000); // 1000 * 2^1 = 2000ms
      expect(retryDelayFn(2)).toBe(4000); // 1000 * 2^2 = 4000ms
    });

    it('caps retry delay at 30 seconds', () => {
      let retryDelayFn: (attemptIndex: number) => number;

      mockUseQuery.mockImplementation(config => {
        retryDelayFn = config.retryDelay as typeof retryDelayFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      // Very high attempt should be capped at 30000ms
      expect(retryDelayFn(10)).toBe(30000);
    });
  });

  describe('Default Parameters', () => {
    it('uses default limit of 8', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: randomizerQueryKeys.history('user1', { limit: 8, expand: false }),
        })
      );
    });

    it('uses default enabled of true', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      );
    });
  });

  describe('Error Scenarios', () => {
    it('handles service errors gracefully', () => {
      const serviceError = new Error('Service unavailable');
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: serviceError,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(result.current.error).toBe(serviceError);
      expect(result.current.data).toBeUndefined();
    });

    it('handles loading state', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('Integration with Service Layer', () => {
    it('passes correct parameters to service layer', async () => {
      mockGetSpinHistoryEnhanced.mockResolvedValue(mockSpinHistory);
      let queryFn: () => Promise<unknown>;

      mockUseQuery.mockImplementation(config => {
        queryFn = config.queryFn as typeof queryFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'test-user', limit: 25 }));

      await queryFn();

      expect(mockGetSpinHistoryEnhanced).toHaveBeenCalledWith('test-user', 25, false);
    });

    it('returns service layer data unchanged', async () => {
      const customSpinHistory = [
        {
          id: 'custom1',
          user: 'user1',
          project: 'proj1',
          project_title: 'Custom Project',
          project_company: 'Custom Company',
          project_artist: 'Custom Artist',
          selected_count: 1,
          selected_projects: ['proj1'],
          spun_at: '2024-01-01T09:00:00Z',
          created: '2024-01-01T09:00:00Z',
          updated: '2024-01-01T09:00:00Z',
          collectionId: 'randomizer_spins',
          collectionName: 'randomizer_spins' as any,
        },
      ];

      mockGetSpinHistoryEnhanced.mockResolvedValue(customSpinHistory);
      let queryFn: () => Promise<unknown>;

      mockUseQuery.mockImplementation(config => {
        queryFn = config.queryFn as typeof queryFn;
        return {
          data: undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        };
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      const result = await queryFn();

      expect(result).toEqual(customSpinHistory);
    });
  });
});
