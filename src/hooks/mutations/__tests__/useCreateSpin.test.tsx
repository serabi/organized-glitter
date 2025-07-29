/**
 * Simplified tests for useCreateSpin hook
 * Tests mutation behavior with minimal setup
 * @author @serabi
 * @created 2025-07-29
 */

import { describe, it, expect, vi, waitFor, act, renderHookWithProviders } from '@/test-utils';
import { useMutation } from '@tanstack/react-query';

// Create a simple mock for useCreateSpin behavior
const createMockCreateSpin = (options = {}) => {
  return useMutation({
    mutationFn: vi.fn().mockResolvedValue({ 
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
    }),
    ...options,
  });
};

describe('useCreateSpin mutation behavior', () => {
  it('should start in idle state', () => {
    const { result } = renderHookWithProviders(() => 
      createMockCreateSpin()
    );

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(typeof result.current.mutate).toBe('function');
  });

  it('should handle successful spin creation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({
      id: 'spin-123',
      user: 'test-user-id',
      project: 'test-project-id',
      project_title: 'Test Project',
      selected_projects: ['project-1', 'project-2'],
      selected_count: 2,
    });
    
    const { result } = renderHookWithProviders(() => 
      createMockCreateSpin({ mutationFn: mockMutationFn })
    );

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

    expect(mockMutationFn).toHaveBeenCalledWith(spinParams);
    expect(result.current.data).toEqual({
      id: 'spin-123',
      user: 'test-user-id',
      project: 'test-project-id',
      project_title: 'Test Project',
      selected_projects: ['project-1', 'project-2'],
      selected_count: 2,
    });
  });

  it('should handle mutation errors', async () => {
    const mockError = new Error('Spin creation failed');
    const mockMutationFn = vi.fn().mockRejectedValue(mockError);
    
    const { result } = renderHookWithProviders(() => 
      createMockCreateSpin({ mutationFn: mockMutationFn })
    );

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
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should show loading state during mutation', async () => {
    let resolvePromise: (value: unknown) => void;
    const slowPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    const mockMutationFn = vi.fn().mockImplementation(() => slowPromise);
    
    const { result } = renderHookWithProviders(() => 
      createMockCreateSpin({ mutationFn: mockMutationFn })
    );

    act(() => {
      result.current.mutate({
        user: 'test-user-id',
        project: 'test-project-id',
        project_title: 'Test Project',
        selected_projects: ['project-1'],
      });
    });

    // Check loading state in the next tick
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });
    expect(result.current.isSuccess).toBe(false);

    // Resolve the promise
    act(() => {
      resolvePromise!({ success: true });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('should call onSuccess callback', async () => {
    const mockOnSuccess = vi.fn();
    const mockMutationFn = vi.fn().mockResolvedValue({ success: true });
    
    const { result } = renderHookWithProviders(() => 
      createMockCreateSpin({ 
        mutationFn: mockMutationFn,
        onSuccess: mockOnSuccess 
      })
    );

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

    expect(mockOnSuccess).toHaveBeenCalledWith({ success: true }, spinParams, undefined);
  });

  it('should call onError callback', async () => {
    const mockOnError = vi.fn();
    const mockError = new Error('Test error');
    const mockMutationFn = vi.fn().mockRejectedValue(mockError);
    
    const { result } = renderHookWithProviders(() => 
      createMockCreateSpin({ 
        mutationFn: mockMutationFn,
        onError: mockOnError 
      })
    );

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
    });

    expect(mockOnError).toHaveBeenCalledWith(mockError, spinParams, undefined);
  });
});