import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { useSpinHistory } from '../useSpinHistory';
import { getSpinHistory } from '@/services/pocketbase/randomizerService';

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
const mockGetSpinHistory = vi.mocked(getSpinHistory);

const mockSpinHistory = [
  {
    id: '1',
    user: 'user1',
    project: 'proj1',
    project_title: 'Test Project 1',
    selected_projects: ['proj1', 'proj2'],
    spun_at: '2024-01-01T12:00:00Z',
    created: '2024-01-01T12:00:00Z',
    updated: '2024-01-01T12:00:00Z',
  },
  {
    id: '2',
    user: 'user1',
    project: 'proj2',
    project_title: 'Test Project 2',
    selected_projects: ['proj1', 'proj2', 'proj3'],
    spun_at: '2024-01-01T11:00:00Z',
    created: '2024-01-01T11:00:00Z',
    updated: '2024-01-01T11:00:00Z',
  },
];

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
      } as any);

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['randomizer', 'history', 'user1', { limit: 8 }],
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
      } as any);

      const { result } = renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(result.current.data).toEqual(mockSpinHistory);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Query Key Generation', () => {
    it('generates correct query key with default parameters', () => {
      mockUseQuery.mockReturnValue({} as any);

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['randomizer', 'history', 'user1', { limit: 8 }],
        })
      );
    });

    it('generates correct query key with custom limit', () => {
      mockUseQuery.mockReturnValue({} as any);

      renderHook(() => useSpinHistory({ userId: 'user1', limit: 50 }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['randomizer', 'history', 'user1', { limit: 50 }],
        })
      );
    });

    it('handles undefined userId in query key', () => {
      mockUseQuery.mockReturnValue({} as any);

      renderHook(() => useSpinHistory({ userId: undefined }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['randomizer', 'history', undefined, { limit: 8 }],
        })
      );
    });
  });

  describe('Query Function', () => {
    it('calls getSpinHistory with correct parameters', async () => {
      mockGetSpinHistory.mockResolvedValue(mockSpinHistory);
      let queryFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        queryFn = config.queryFn;
        return {} as any;
      });

      renderHook(() => useSpinHistory({ userId: 'user1', limit: 10 }));

      const result = await queryFn();

      expect(mockGetSpinHistory).toHaveBeenCalledWith('user1', 10);
      expect(result).toEqual(mockSpinHistory);
    });

    it('returns empty array when userId is not provided', async () => {
      let queryFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        queryFn = config.queryFn;
        return {} as any;
      });

      renderHook(() => useSpinHistory({ userId: undefined }));

      const result = await queryFn();

      expect(mockGetSpinHistory).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('handles getSpinHistory errors', async () => {
      const error = new Error('Database error');
      mockGetSpinHistory.mockRejectedValue(error);
      let queryFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        queryFn = config.queryFn;
        return {} as any;
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      await expect(queryFn()).rejects.toThrow('Database error');
    });
  });

  describe('Enabled State', () => {
    it('is enabled by default when userId is provided', () => {
      mockUseQuery.mockReturnValue({} as any);

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      );
    });

    it('is disabled when enabled is explicitly false', () => {
      mockUseQuery.mockReturnValue({} as any);

      renderHook(() => useSpinHistory({ userId: 'user1', enabled: false }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('is disabled when userId is not provided even if enabled is true', () => {
      mockUseQuery.mockReturnValue({} as any);

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
      mockUseQuery.mockReturnValue({} as any);

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 30 * 1000, // 30 seconds
        })
      );
    });

    it('uses correct garbage collection time', () => {
      mockUseQuery.mockReturnValue({} as any);

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          gcTime: 5 * 60 * 1000, // 5 minutes
        })
      );
    });

    it('disables refetch on window focus', () => {
      mockUseQuery.mockReturnValue({} as any);

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
      let retryFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        retryFn = config.retry;
        return {} as any;
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
      let retryFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        retryFn = config.retry;
        return {} as any;
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      const error500 = { message: 'Internal Server Error 500' };

      expect(retryFn(0, error500)).toBe(true); // First retry
      expect(retryFn(1, error500)).toBe(true); // Second retry
      expect(retryFn(2, error500)).toBe(false); // No third retry
    });

    it('retries on network errors up to 2 times', () => {
      let retryFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        retryFn = config.retry;
        return {} as any;
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      const networkError = { message: 'Network Error' };

      expect(retryFn(0, networkError)).toBe(true);
      expect(retryFn(1, networkError)).toBe(true);
      expect(retryFn(2, networkError)).toBe(false);
    });

    it('handles errors without message property', () => {
      let retryFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        retryFn = config.retry;
        return {} as any;
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
      let retryDelayFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        retryDelayFn = config.retryDelay;
        return {} as any;
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(retryDelayFn(0)).toBe(1000); // 1000 * 2^0 = 1000ms
      expect(retryDelayFn(1)).toBe(2000); // 1000 * 2^1 = 2000ms
      expect(retryDelayFn(2)).toBe(4000); // 1000 * 2^2 = 4000ms
    });

    it('caps retry delay at 30 seconds', () => {
      let retryDelayFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        retryDelayFn = config.retryDelay;
        return {} as any;
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      // Very high attempt should be capped at 30000ms
      expect(retryDelayFn(10)).toBe(30000);
    });
  });

  describe('Default Parameters', () => {
    it('uses default limit of 8', () => {
      mockUseQuery.mockReturnValue({} as any);

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['randomizer', 'history', 'user1', { limit: 8 }],
        })
      );
    });

    it('uses default enabled of true', () => {
      mockUseQuery.mockReturnValue({} as any);

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
      } as any);

      const { result } = renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(result.current.error).toBe(serviceError);
      expect(result.current.data).toBeUndefined();
    });

    it('handles loading state', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      const { result } = renderHook(() => useSpinHistory({ userId: 'user1' }));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('Integration with Service Layer', () => {
    it('passes correct parameters to service layer', async () => {
      mockGetSpinHistory.mockResolvedValue(mockSpinHistory);
      let queryFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        queryFn = config.queryFn;
        return {} as any;
      });

      renderHook(() => useSpinHistory({ userId: 'test-user', limit: 25 }));

      await queryFn();

      expect(mockGetSpinHistory).toHaveBeenCalledWith('test-user', 25);
    });

    it('returns service layer data unchanged', async () => {
      const customSpinHistory = [
        {
          id: 'custom1',
          user: 'user1',
          project: 'proj1',
          project_title: 'Custom Project',
          selected_projects: ['proj1'],
          spun_at: '2024-01-01T09:00:00Z',
          created: '2024-01-01T09:00:00Z',
          updated: '2024-01-01T09:00:00Z',
        },
      ];

      mockGetSpinHistory.mockResolvedValue(customSpinHistory);
      let queryFn: any;

      mockUseQuery.mockImplementation((config: any) => {
        queryFn = config.queryFn;
        return {} as any;
      });

      renderHook(() => useSpinHistory({ userId: 'user1' }));

      const result = await queryFn();

      expect(result).toEqual(customSpinHistory);
    });
  });
});
