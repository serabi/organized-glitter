import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCreateSpin } from '../useCreateSpin';
import { createSpin } from '@/services/pocketbase/randomizerService';
import { toast } from 'sonner';
import type {
  MockQueryClient,
  MockUseMutationResult,
  MockCreateSpinParams,
} from '@/types/test-mocks';
import type { RandomizerSpinsResponse } from '@/types/pocketbase.types';

// Mock dependencies
vi.mock('@tanstack/react-query');
vi.mock('@/services/pocketbase/randomizerService');
vi.mock('sonner');
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockUseMutation = vi.mocked(useMutation);
const mockUseQueryClient = vi.mocked(useQueryClient);
const mockCreateSpin = vi.mocked(createSpin);
const mockToast = vi.mocked(toast);

const mockQueryClient: MockQueryClient = {
  invalidateQueries: vi.fn(),
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
  cancelQueries: vi.fn(),
  refetchQueries: vi.fn(),
};

const mockSpinData: MockCreateSpinParams = {
  user: 'user1',
  project: 'proj1',
  project_title: 'Test Project',
  selected_projects: ['proj1', 'proj2', 'proj3'],
};

const mockSpinRecord: RandomizerSpinsResponse = {
  id: 'spin1',
  user: 'user1',
  project: 'proj1',
  project_title: 'Test Project',
  selected_projects: ['proj1', 'proj2', 'proj3'],
  spun_at: '2024-01-01T12:00:00Z',
  created: '2024-01-01T12:00:00Z',
  updated: '2024-01-01T12:00:00Z',
  collectionId: 'randomizer_spins',
  collectionName: 'randomizer_spins',
};

describe('useCreateSpin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQueryClient.mockReturnValue(mockQueryClient);
  });

  describe('Basic Functionality', () => {
    it('calls useMutation with correct configuration', () => {
      const mockMutation: MockUseMutationResult = {
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
        error: null,
      };

      mockUseMutation.mockReturnValue(mockMutation);

      renderHook(() => useCreateSpin());

      expect(mockUseMutation).toHaveBeenCalledWith({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      });
    });

    it('returns mutation object correctly', () => {
      const mockMutation: MockUseMutationResult = {
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
        error: null,
      };

      mockUseMutation.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateSpin());

      expect(result.current).toBe(mockMutation);
    });
  });

  describe('Mutation Function', () => {
    it('calls createSpin service with correct parameters', async () => {
      mockCreateSpin.mockResolvedValue(mockSpinRecord);
      let mutationFn: (data: MockCreateSpinParams) => Promise<RandomizerSpinsResponse>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const result = await mutationFn(mockSpinData);

      expect(mockCreateSpin).toHaveBeenCalledWith(mockSpinData);
      expect(result).toEqual(mockSpinRecord);
    });

    it('handles service errors', async () => {
      const serviceError = new Error('Database error');
      mockCreateSpin.mockRejectedValue(serviceError);
      let mutationFn: (data: MockCreateSpinParams) => Promise<RandomizerSpinsResponse>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      await expect(mutationFn(mockSpinData)).rejects.toThrow('Database error');
    });
  });

  describe('Success Handler', () => {
    it('invalidates spin history queries on success', async () => {
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: MockCreateSpinParams
      ) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        onSuccess = config.onSuccess as typeof onSuccess;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      await onSuccess(mockSpinRecord, mockSpinData);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['randomizer', 'history'],
      });
    });

    it('shows success toast on successful spin creation', async () => {
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: MockCreateSpinParams
      ) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        onSuccess = config.onSuccess as typeof onSuccess;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      await onSuccess(mockSpinRecord, mockSpinData);

      expect(mockToast.success).toHaveBeenCalledWith('Spin recorded successfully!');
    });

    it('handles success without errors', async () => {
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: MockCreateSpinParams
      ) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        onSuccess = config.onSuccess as typeof onSuccess;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      // Should not throw
      await expect(onSuccess(mockSpinRecord, mockSpinData)).resolves.toBeUndefined();
    });
  });

  describe('Error Handler', () => {
    it('shows error toast on mutation failure', async () => {
      let onError: (error: Error, variables: MockCreateSpinParams) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        onError = config.onError as typeof onError;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const error = new Error('Network error');
      await onError(error, mockSpinData);

      expect(mockToast.error).toHaveBeenCalledWith('Failed to record spin. Please try again.');
    });

    it('handles different error types', async () => {
      let onError: (error: unknown, variables: MockCreateSpinParams) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        onError = config.onError as typeof onError;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      // Test with different error types
      const networkError = new Error('Network failure');
      const validationError = new Error('Validation failed');
      const unknownError = { message: 'Unknown error' };

      await onError(networkError, mockSpinData);
      await onError(validationError, mockSpinData);
      await onError(unknownError, mockSpinData);

      expect(mockToast.error).toHaveBeenCalledTimes(3);
      expect(mockToast.error).toHaveBeenCalledWith('Failed to record spin. Please try again.');
    });

    it('handles errors without message', async () => {
      let onError: (error: unknown, variables: MockCreateSpinParams) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        onError = config.onError as typeof onError;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const errorWithoutMessage = {};

      await expect(onError(errorWithoutMessage, mockSpinData)).resolves.toBeUndefined();
      expect(mockToast.error).toHaveBeenCalledWith('Failed to record spin. Please try again.');
    });
  });

  describe('Query Invalidation', () => {
    it('invalidates all randomizer history queries', async () => {
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: MockCreateSpinParams
      ) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        onSuccess = config.onSuccess as typeof onSuccess;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      await onSuccess(mockSpinRecord, mockSpinData);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['randomizer', 'history'],
      });
    });

    it('handles query invalidation errors gracefully', async () => {
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: MockCreateSpinParams
      ) => Promise<void>;
      mockQueryClient.invalidateQueries.mockRejectedValue(new Error('Invalidation failed'));

      mockUseMutation.mockImplementation(config => {
        onSuccess = config.onSuccess as typeof onSuccess;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      // Should not throw even if invalidation fails
      await expect(onSuccess(mockSpinRecord, mockSpinData)).resolves.toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    it('works with realistic data flow', async () => {
      mockCreateSpin.mockResolvedValue(mockSpinRecord);

      let mutationFn: (data: MockCreateSpinParams) => Promise<RandomizerSpinsResponse>;
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: MockCreateSpinParams
      ) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        onSuccess = config.onSuccess as typeof onSuccess;
        return {
          mutateAsync: async (data: MockCreateSpinParams) => {
            const result = await mutationFn(data);
            await onSuccess(result, data);
            return result;
          },
        } as MockUseMutationResult;
      });

      const { result } = renderHook(() => useCreateSpin());

      const spinResult = await result.current.mutateAsync(mockSpinData);

      expect(mockCreateSpin).toHaveBeenCalledWith(mockSpinData);
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['randomizer', 'history'],
      });
      expect(mockToast.success).toHaveBeenCalledWith('Spin recorded successfully!');
      expect(spinResult).toEqual(mockSpinRecord);
    });

    it('handles complete error flow', async () => {
      const serviceError = new Error('Service unavailable');
      mockCreateSpin.mockRejectedValue(serviceError);

      let mutationFn: (data: MockCreateSpinParams) => Promise<RandomizerSpinsResponse>;
      let onError: (error: unknown, variables: MockCreateSpinParams) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        onError = config.onError as typeof onError;
        return {
          mutateAsync: async (data: MockCreateSpinParams) => {
            try {
              return await mutationFn(data);
            } catch (error) {
              await onError(error, data);
              throw error;
            }
          },
        } as MockUseMutationResult;
      });

      const { result } = renderHook(() => useCreateSpin());

      await expect(result.current.mutateAsync(mockSpinData)).rejects.toThrow('Service unavailable');

      expect(mockCreateSpin).toHaveBeenCalledWith(mockSpinData);
      expect(mockToast.error).toHaveBeenCalledWith('Failed to record spin. Please try again.');
      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('Parameter Validation', () => {
    it('passes through all required spin parameters', async () => {
      mockCreateSpin.mockResolvedValue(mockSpinRecord);
      let mutationFn: (data: MockCreateSpinParams) => Promise<RandomizerSpinsResponse>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const completeSpinData: MockCreateSpinParams = {
        user: 'test-user-123',
        project: 'test-project-456',
        project_title: 'My Awesome Project',
        selected_projects: ['proj1', 'proj2', 'proj3', 'proj4'],
      };

      await mutationFn(completeSpinData);

      expect(mockCreateSpin).toHaveBeenCalledWith(completeSpinData);
    });

    it('handles minimal valid parameters', async () => {
      mockCreateSpin.mockResolvedValue(mockSpinRecord);
      let mutationFn: (data: MockCreateSpinParams) => Promise<RandomizerSpinsResponse>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const minimalSpinData: MockCreateSpinParams = {
        user: 'user1',
        project: 'proj1',
        project_title: 'Project',
        selected_projects: ['proj1'],
      };

      await mutationFn(minimalSpinData);

      expect(mockCreateSpin).toHaveBeenCalledWith(minimalSpinData);
    });
  });

  describe('Toast Messages', () => {
    it('shows appropriate success message', async () => {
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: MockCreateSpinParams
      ) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        onSuccess = config.onSuccess as typeof onSuccess;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      await onSuccess(mockSpinRecord, mockSpinData);

      expect(mockToast.success).toHaveBeenCalledWith('Spin recorded successfully!');
      expect(mockToast.success).toHaveBeenCalledTimes(1);
    });

    it('shows appropriate error message', async () => {
      let onError: (error: Error, variables: MockCreateSpinParams) => Promise<void>;

      mockUseMutation.mockImplementation(config => {
        onError = config.onError as typeof onError;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      await onError(new Error('Test error'), mockSpinData);

      expect(mockToast.error).toHaveBeenCalledWith('Failed to record spin. Please try again.');
      expect(mockToast.error).toHaveBeenCalledTimes(1);
    });
  });
});
