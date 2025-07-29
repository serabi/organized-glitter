/**
 * Simplified tests for React Query mutation hooks
 * Tests basic mutation behavior with minimal setup
 * @author @serabi
 * @created 2025-07-29
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHookWithProviders, createMockProject, act, waitFor } from '@/test-utils';
import { useMutation } from '@tanstack/react-query';

// Create a simple mock mutation for testing
const createMockMutation = (options = {}) => {
  return useMutation({
    mutationFn: vi.fn().mockResolvedValue({ success: true }),
    ...options,
  });
};

describe('Mutation hook behavior', () => {
  it('should start in idle state', () => {
    const { result } = renderHookWithProviders(() => 
      createMockMutation()
    );

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(typeof result.current.mutate).toBe('function');
  });

  it('should handle successful mutation', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ id: '123', title: 'Test Project' });
    
    const { result } = renderHookWithProviders(() => 
      createMockMutation({ mutationFn: mockMutationFn })
    );

    act(() => {
      result.current.mutate({ title: 'Test Project', status: 'wishlist' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockMutationFn).toHaveBeenCalledWith({ title: 'Test Project', status: 'wishlist' });
    expect(result.current.data).toEqual({ id: '123', title: 'Test Project' });
  });

  it('should handle mutation errors', async () => {
    const mockError = new Error('Mutation failed');
    const mockMutationFn = vi.fn().mockRejectedValue(mockError);
    
    const { result } = renderHookWithProviders(() => 
      createMockMutation({ mutationFn: mockMutationFn })
    );

    act(() => {
      result.current.mutate({ title: 'Test Project' });
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
    
    const mockMutationFn = vi.fn().mockReturnValue(slowPromise);
    
    const { result } = renderHookWithProviders(() => 
      createMockMutation({ mutationFn: mockMutationFn })
    );

    act(() => {
      result.current.mutate({ title: 'Test Project' });
    });

    // Should be loading
    expect(result.current.isPending).toBe(true);
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
      createMockMutation({ 
        mutationFn: mockMutationFn,
        onSuccess: mockOnSuccess 
      })
    );

    act(() => {
      result.current.mutate({ title: 'Test Project' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockOnSuccess).toHaveBeenCalledWith({ success: true }, { title: 'Test Project' }, undefined);
  });

  it('should call onError callback', async () => {
    const mockOnError = vi.fn();
    const mockError = new Error('Test error');
    const mockMutationFn = vi.fn().mockRejectedValue(mockError);
    
    const { result } = renderHookWithProviders(() => 
      createMockMutation({ 
        mutationFn: mockMutationFn,
        onError: mockOnError 
      })
    );

    act(() => {
      result.current.mutate({ title: 'Test Project' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockOnError).toHaveBeenCalledWith(mockError, { title: 'Test Project' }, undefined);
  });
});