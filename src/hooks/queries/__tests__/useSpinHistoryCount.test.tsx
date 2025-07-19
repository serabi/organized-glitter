/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useSpinHistoryCount, invalidateSpinHistoryCount } from '../useSpinHistoryCount';
import { getSpinHistoryCountEnhanced } from '@/services/pocketbase/randomizerService';
import { randomizerQueryKeys } from '@/hooks/queries/useSpinHistory';

// Mock dependencies
vi.mock('@/services/pocketbase/randomizerService');
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
  }),
}));

const mockGetSpinHistoryCountEnhanced = vi.mocked(getSpinHistoryCountEnhanced);

// Mock React Query
const mockUseQuery = vi.fn();
const mockUseQueryClient = vi.fn();
const mockQueryClient = {
  invalidateQueries: vi.fn(),
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: (config: any) => mockUseQuery(config),
  useQueryClient: () => mockQueryClient,
}));

describe('useSpinHistoryCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock return
    mockUseQuery.mockReturnValue({
      data: 0,
      isLoading: false,
      error: null,
    });
  });

  it('calls useQuery with correct default configuration', () => {
    renderHook(() => useSpinHistoryCount({ userId: 'user1' }));

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: randomizerQueryKeys.count('user1'),
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 60000, // 1 minute default
      gcTime: 300000, // 5 minutes default
      refetchOnWindowFocus: true, // enableBackgroundRefresh default
      refetchInterval: 300000, // 5 minutes background polling
      refetchIntervalInBackground: false,
      retry: expect.any(Function),
      retryDelay: expect.any(Function),
      onError: expect.any(Function),
      onSuccess: expect.any(Function),
    });
  });

  it('calls useQuery with custom configuration', () => {
    renderHook(() =>
      useSpinHistoryCount({
        userId: 'user1',
        staleTime: 120000,
        cacheTime: 600000,
        enableBackgroundRefresh: false,
      })
    );

    const callArgs = mockUseQuery.mock.calls[0][0];
    expect(callArgs.staleTime).toBe(120000);
    expect(callArgs.gcTime).toBe(600000);
    expect(callArgs.refetchOnWindowFocus).toBe(false);
    expect(callArgs.refetchInterval).toBe(false);
  });

  it('disables query when userId is undefined', () => {
    renderHook(() => useSpinHistoryCount({ userId: undefined }));

    const callArgs = mockUseQuery.mock.calls[0][0];
    expect(callArgs.enabled).toBe(false);
  });

  it('disables query when enabled is false', () => {
    renderHook(() => useSpinHistoryCount({ userId: 'user1', enabled: false }));

    const callArgs = mockUseQuery.mock.calls[0][0];
    expect(callArgs.enabled).toBe(false);
  });

  it('returns correct query result', () => {
    const mockResult = {
      data: 42,
      isLoading: false,
      error: null,
      isStale: false,
      dataUpdatedAt: Date.now(),
    };

    mockUseQuery.mockReturnValue(mockResult);

    const { result } = renderHook(() => useSpinHistoryCount({ userId: 'user1' }));

    expect(result.current).toBe(mockResult);
  });

  describe('queryFn', () => {
    it('calls getSpinHistoryCountEnhanced with correct userId', async () => {
      mockGetSpinHistoryCountEnhanced.mockResolvedValue(15);

      renderHook(() => useSpinHistoryCount({ userId: 'test-user' }));

      const callArgs = mockUseQuery.mock.calls[0][0];
      const queryFn = callArgs.queryFn;

      const result = await queryFn();

      expect(mockGetSpinHistoryCountEnhanced).toHaveBeenCalledWith('test-user');
      expect(result).toBe(15);
    });

    it('returns 0 when userId is undefined', async () => {
      renderHook(() => useSpinHistoryCount({ userId: undefined }));

      const callArgs = mockUseQuery.mock.calls[0][0];
      const queryFn = callArgs.queryFn;

      const result = await queryFn();

      expect(mockGetSpinHistoryCountEnhanced).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });

  describe('background refresh', () => {
    beforeEach(() => {
      // Mock document.addEventListener and removeEventListener
      vi.spyOn(document, 'addEventListener').mockImplementation(vi.fn());
      vi.spyOn(document, 'removeEventListener').mockImplementation(vi.fn());
    });

    it('sets up visibility change listener when background refresh is enabled', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() =>
        useSpinHistoryCount({
          userId: 'user1',
          enableBackgroundRefresh: true,
        })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('does not set up visibility change listener when background refresh is disabled', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() =>
        useSpinHistoryCount({
          userId: 'user1',
          enableBackgroundRefresh: false,
        })
      );

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });

    it('does not set up listener when userId is undefined', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() =>
        useSpinHistoryCount({
          userId: undefined,
          enableBackgroundRefresh: true,
        })
      );

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });
  });

  describe('retry logic', () => {
    it('retries up to 3 times for server errors', () => {
      renderHook(() => useSpinHistoryCount({ userId: 'user1' }));

      const callArgs = mockUseQuery.mock.calls[0][0];
      const retryFn = callArgs.retry;

      // Should retry for server errors
      expect(retryFn(0, new Error('500 Server Error'))).toBe(true);
      expect(retryFn(1, new Error('500 Server Error'))).toBe(true);
      expect(retryFn(2, new Error('500 Server Error'))).toBe(true);
      expect(retryFn(3, new Error('500 Server Error'))).toBe(false);
    });

    it('does not retry for client errors', () => {
      renderHook(() => useSpinHistoryCount({ userId: 'user1' }));

      const callArgs = mockUseQuery.mock.calls[0][0];
      const retryFn = callArgs.retry;

      // Should not retry for client errors
      expect(retryFn(0, new Error('400 Bad Request'))).toBe(false);
      expect(retryFn(0, new Error('401 Unauthorized'))).toBe(false);
      expect(retryFn(0, new Error('403 Forbidden'))).toBe(false);
      expect(retryFn(0, new Error('404 Not Found'))).toBe(false);
    });

    it('handles RandomizerError types correctly', () => {
      renderHook(() => useSpinHistoryCount({ userId: 'user1' }));

      const callArgs = mockUseQuery.mock.calls[0][0];
      const retryFn = callArgs.retry;

      const retryableError = { type: 'network_error', canRetry: true };
      const nonRetryableError = { type: 'validation_error', canRetry: false };

      expect(retryFn(0, retryableError)).toBe(true);
      expect(retryFn(0, nonRetryableError)).toBe(false);
      expect(retryFn(3, retryableError)).toBe(false); // Max retries exceeded
    });
  });

  describe('invalidateSpinHistoryCount', () => {
    it('calls queryClient.invalidateQueries with correct parameters', () => {
      const userId = 'test-user';

      invalidateSpinHistoryCount(mockQueryClient, userId);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: randomizerQueryKeys.count(userId),
        exact: true,
        refetchType: 'active',
      });
    });

    it('respects custom options', () => {
      const userId = 'test-user';

      invalidateSpinHistoryCount(mockQueryClient, userId, {
        refetch: false,
        exact: false,
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: randomizerQueryKeys.count(userId),
        exact: false,
        refetchType: 'none',
      });
    });
  });
});
