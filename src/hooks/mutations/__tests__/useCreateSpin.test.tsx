/**
 * Tests for useCreateSpin hook
 * Tests actual hook behavior with real implementation
 * @author @serabi
 * @created 2025-07-29
 */

import { describe, it, expect, vi, waitFor, act, renderHookWithProviders } from '@/test-utils';

// Mock the dependencies
const mockCreateSpinEnhanced = vi.fn();
const mockToast = vi.fn();

// Use doMock to avoid hoisting issues
vi.doMock('@/services/pocketbase/randomizerService', () => ({
  createSpinEnhanced: mockCreateSpinEnhanced,
  detectDeviceType: vi.fn(() => 'desktop'),
  RandomizerErrorType: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  },
}));

vi.doMock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.doMock('@/hooks/queries/useSpinHistory', () => ({
  randomizerQueryKeys: {
    all: ['randomizer'],
    history: vi.fn((userId: string, options?: object) => ['randomizer', 'history', userId, options]),
    count: vi.fn((userId: string) => ['randomizer', 'count', userId]),
  },
}));

// Import after mocking
const { useCreateSpin } = await import('../useCreateSpin');

describe('useCreateSpin hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in idle state', () => {
    const { result } = renderHookWithProviders(() => useCreateSpin());

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(typeof result.current.mutate).toBe('function');
  });

  it('should handle successful spin creation', async () => {
    const mockResponse = {
      id: 'spin-123',
      user: 'test-user-id',
      project: 'test-project-id',
      project_title: 'Test Project',
      selected_projects: ['project-1', 'project-2'],
      selected_count: 2,
      spun_at: new Date().toISOString(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      collectionId: 'randomizer_spins',
      collectionName: 'randomizer_spins',
    };

    mockCreateSpinEnhanced.mockResolvedValue(mockResponse);

    const { result } = renderHookWithProviders(() => useCreateSpin());

    const spinParams = {
      user: 'test-user-id',
      project: 'test-project-id',
      project_title: 'Test Project',
      selected_projects: ['project-1', 'project-2'],
    };

    act(() => {
      result.current.mutate(spinParams);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateSpinEnhanced).toHaveBeenCalledWith(expect.objectContaining({
      user: spinParams.user,
      project: spinParams.project,
      project_title: spinParams.project_title,
      selected_projects: spinParams.selected_projects,
      metadata: expect.any(Object),
    }));
    expect(result.current.data).toEqual(mockResponse);
  });

  it('should handle mutation errors', async () => {
    const mockError = new Error('Permission denied');
    mockCreateSpinEnhanced.mockRejectedValue(mockError);

    const { result } = renderHookWithProviders(() => useCreateSpin());

    act(() => {
      result.current.mutate({
        user: 'test-user-id',
        project: 'test-project-id',
        project_title: 'Test Project',
        selected_projects: ['project-1'],
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.error).toBe(mockError);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should show loading state during mutation', async () => {
    let resolvePromise: (value: unknown) => void;
    const slowPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    mockCreateSpinEnhanced.mockImplementation(() => slowPromise);

    const { result } = renderHookWithProviders(() => useCreateSpin());

    act(() => {
      result.current.mutate({
        user: 'test-user-id',
        project: 'test-project-id',
        project_title: 'Test Project',  
        selected_projects: ['project-1'],
      });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });
    expect(result.current.isSuccess).toBe(false);

    act(() => {
      resolvePromise!({ success: true });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('should call toast on success', async () => {
    const mockResponse = {
      id: 'spin-123',
      user: 'test-user-id',
      project: 'test-project-id',
      project_title: 'Test Project',
      selected_projects: ['project-1'],
      selected_count: 1,
      spun_at: new Date().toISOString(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      collectionId: 'randomizer_spins',
      collectionName: 'randomizer_spins',
    };

    mockCreateSpinEnhanced.mockResolvedValue(mockResponse);

    const { result } = renderHookWithProviders(() => useCreateSpin());

    const spinParams = {
      user: 'test-user-id',
      project: 'test-project-id',
      project_title: 'Test Project',
      selected_projects: ['project-1'],
    };

    act(() => {
      result.current.mutate(spinParams);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Spin recorded!',
      description: 'Selected: Test Project',
    });
  });

  it('should call toast on error', async () => {
    const mockError = new Error('Permission denied');
    mockCreateSpinEnhanced.mockRejectedValue(mockError);

    const { result } = renderHookWithProviders(() => useCreateSpin());

    const spinParams = {
      user: 'test-user-id',
      project: 'test-project-id',
      project_title: 'Test Project',
      selected_projects: ['project-1'],
    };

    act(() => {
      result.current.mutate(spinParams);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    }, { timeout: 3000 });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Action Required',
      description: 'Please log in again',
      variant: 'destructive',
    });
  });
});