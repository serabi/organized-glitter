/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useSpinHistoryCount } from '../useSpinHistoryCount';
import { getSpinHistoryCount } from '@/services/pocketbase/randomizerService';

// Mock dependencies
vi.mock('@/services/pocketbase/randomizerService');
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
  }),
}));

const mockGetSpinHistoryCount = vi.mocked(getSpinHistoryCount);

// Mock React Query
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (config: any) => mockUseQuery(config),
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

  it('calls useQuery with correct configuration', () => {
    renderHook(() => useSpinHistoryCount({ userId: 'user1' }));

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['randomizer', 'history', 'count', 'user1'],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: true,
      retry: expect.any(Function),
      retryDelay: expect.any(Function),
    });
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
    };

    mockUseQuery.mockReturnValue(mockResult);

    const { result } = renderHook(() => useSpinHistoryCount({ userId: 'user1' }));

    expect(result.current).toBe(mockResult);
  });

  describe('queryFn', () => {
    it('calls getSpinHistoryCount with correct userId', async () => {
      mockGetSpinHistoryCount.mockResolvedValue(15);
      
      renderHook(() => useSpinHistoryCount({ userId: 'test-user' }));

      const callArgs = mockUseQuery.mock.calls[0][0];
      const queryFn = callArgs.queryFn;

      const result = await queryFn();

      expect(mockGetSpinHistoryCount).toHaveBeenCalledWith('test-user');
      expect(result).toBe(15);
    });

    it('returns 0 when userId is undefined', async () => {
      renderHook(() => useSpinHistoryCount({ userId: undefined }));

      const callArgs = mockUseQuery.mock.calls[0][0];
      const queryFn = callArgs.queryFn;

      const result = await queryFn();

      expect(mockGetSpinHistoryCount).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });
});