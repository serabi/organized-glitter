import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCreateSpin, CreateSpinMutationParams } from '../useCreateSpin';
import {
  createSpinEnhanced,
  RandomizerError,
  RandomizerErrorType,
  detectDeviceType,
} from '@/services/pocketbase/randomizerService';
import type { MockQueryClient, MockUseMutationResult } from '@/types/test-mocks';
import type { RandomizerSpinsResponse } from '@/types/pocketbase.types';

// Mock dependencies
vi.mock('@tanstack/react-query');
vi.mock('@/services/pocketbase/randomizerService');
vi.mock('@/hooks/use-toast');
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockUseMutation = vi.mocked(useMutation);
const mockUseQueryClient = vi.mocked(useQueryClient);
const mockCreateSpinEnhanced = vi.mocked(createSpinEnhanced);
const mockDetectDeviceType = vi.mocked(detectDeviceType);

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockQueryClient: MockQueryClient = {
  invalidateQueries: vi.fn(),
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
  cancelQueries: vi.fn(),
  refetchQueries: vi.fn(),
};

const mockSpinData: CreateSpinMutationParams = {
  user: 'user1',
  project: 'proj1',
  project_title: 'Test Project',
  project_company: 'Test Company',
  project_artist: 'Test Artist',
  selected_projects: ['proj1', 'proj2', 'proj3'],
  metadata: {
    selectionTime: 1500,
    deviceType: 'desktop',
    spinMethod: 'click',
    userAgent: 'test-agent',
  },
};

const mockSpinRecord: RandomizerSpinsResponse = {
  id: 'spin1',
  user: 'user1',
  project: 'proj1',
  project_title: 'Test Project',
  project_company: 'Test Company',
  project_artist: 'Test Artist',
  selected_projects: ['proj1', 'proj2', 'proj3'],
  selected_count: 3,
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
    mockDetectDeviceType.mockReturnValue('desktop');

    // Mock navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'test-user-agent',
      configurable: true,
    });
  });

  describe('Basic Functionality', () => {
    it('calls useMutation with enhanced configuration', () => {
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
        onMutate: expect.any(Function),
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
        retry: expect.any(Function),
        retryDelay: expect.any(Function),
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

  describe('Enhanced Mutation Function', () => {
    it('calls createSpinEnhanced service with enhanced parameters', async () => {
      mockCreateSpinEnhanced.mockResolvedValue(mockSpinRecord);
      let mutationFn: (data: CreateSpinMutationParams) => Promise<RandomizerSpinsResponse>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const result = await mutationFn(mockSpinData);

      expect(mockCreateSpinEnhanced).toHaveBeenCalledWith({
        ...mockSpinData,
        metadata: expect.objectContaining({
          selectionTime: 1500,
          deviceType: 'desktop',
          spinMethod: 'click',
          userAgent: expect.any(String),
        }),
      });
      expect(result).toEqual(mockSpinRecord);
    });

    it('auto-generates metadata when not provided', async () => {
      mockCreateSpinEnhanced.mockResolvedValue(mockSpinRecord);
      let mutationFn: (data: CreateSpinMutationParams) => Promise<RandomizerSpinsResponse>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const dataWithoutMetadata = {
        ...mockSpinData,
        metadata: undefined,
      };

      await mutationFn(dataWithoutMetadata);

      expect(mockCreateSpinEnhanced).toHaveBeenCalledWith({
        ...dataWithoutMetadata,
        metadata: expect.objectContaining({
          selectionTime: 0,
          deviceType: 'desktop',
          spinMethod: 'click',
          userAgent: 'test-user-agent',
        }),
      });
    });

    it('handles RandomizerError types', async () => {
      const randomizerError: RandomizerError = {
        name: 'RandomizerError',
        message: 'Database unavailable',
        type: RandomizerErrorType.DATABASE_UNAVAILABLE,
        canRetry: true,
        suggestedAction: 'Please try again later',
        technicalDetails: { status: 503 },
      };

      mockCreateSpinEnhanced.mockRejectedValue(randomizerError);
      let mutationFn: (data: CreateSpinMutationParams) => Promise<RandomizerSpinsResponse>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      await expect(mutationFn(mockSpinData)).rejects.toEqual(randomizerError);
    });

    it('handles standard errors', async () => {
      const serviceError = new Error('Network error');
      mockCreateSpinEnhanced.mockRejectedValue(serviceError);
      let mutationFn: (data: CreateSpinMutationParams) => Promise<RandomizerSpinsResponse>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      await expect(mutationFn(mockSpinData)).rejects.toThrow('Network error');
    });
  });

  describe('Optimistic Updates', () => {
    it('applies optimistic update on mutation start', async () => {
      let onMutate: (variables: CreateSpinMutationParams) => Promise<any>;

      mockUseMutation.mockImplementation(config => {
        onMutate = config.onMutate as typeof onMutate;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const context = await onMutate(mockSpinData);

      expect(mockQueryClient.cancelQueries).toHaveBeenCalledWith({
        queryKey: ['randomizer', 'history', 'user1', undefined],
      });
      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(2); // history and count
      expect(context).toHaveProperty('previousHistory');
      expect(context).toHaveProperty('optimisticSpin');
    });

    it('updates cache with optimistic spin record', async () => {
      let onMutate: (variables: CreateSpinMutationParams) => Promise<any>;
      const mockSetQueryData = vi.fn();
      mockQueryClient.setQueryData = mockSetQueryData;

      mockUseMutation.mockImplementation(config => {
        onMutate = config.onMutate as typeof onMutate;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      await onMutate(mockSpinData);

      expect(mockSetQueryData).toHaveBeenCalledWith(
        ['randomizer', 'history', 'user1', { limit: 8, expand: false }],
        expect.any(Function)
      );
      expect(mockSetQueryData).toHaveBeenCalledWith(
        ['randomizer', 'count', 'user1'],
        expect.any(Function)
      );
    });
  });

  describe('Enhanced Success Handler', () => {
    it('replaces optimistic update with real data', async () => {
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: CreateSpinMutationParams,
        context: any
      ) => void;

      const mockContext = {
        previousHistory: [],
        optimisticSpin: { id: 'optimistic-123' },
      };

      mockUseMutation.mockImplementation(config => {
        onSuccess = config.onSuccess as typeof onSuccess;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      onSuccess(mockSpinRecord, mockSpinData, mockContext);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['randomizer', 'history', 'user1', { limit: 8, expand: false }],
        expect.any(Function)
      );
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['randomizer'],
      });
    });

    it('shows enhanced success toast with company info', async () => {
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: CreateSpinMutationParams,
        context: any
      ) => void;

      mockUseMutation.mockImplementation(config => {
        onSuccess = config.onSuccess as typeof onSuccess;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      onSuccess(mockSpinRecord, mockSpinData, {});

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Spin recorded!',
        description: 'Selected: Test Project by Test Company',
      });
    });

    it('shows success toast without company when not provided', async () => {
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: CreateSpinMutationParams,
        context: any
      ) => void;

      mockUseMutation.mockImplementation(config => {
        onSuccess = config.onSuccess as typeof onSuccess;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const dataWithoutCompany = { ...mockSpinData, project_company: undefined };
      onSuccess(mockSpinRecord, dataWithoutCompany, {});

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Spin recorded!',
        description: 'Selected: Test Project',
      });
    });
  });

  describe('Enhanced Error Handler', () => {
    it('classifies and handles RandomizerError types', async () => {
      let onError: (error: unknown, variables: CreateSpinMutationParams, context: any) => void;

      const randomizerError: RandomizerError = {
        name: 'RandomizerError',
        message: 'Permission denied',
        type: RandomizerErrorType.PERMISSION_DENIED,
        canRetry: false,
        suggestedAction: 'Please log in again',
        technicalDetails: { status: 403 },
      };

      mockUseMutation.mockImplementation(config => {
        onError = config.onError as typeof onError;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      onError(randomizerError, mockSpinData, {});

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Action Required',
        description: 'Please log in again',
        variant: 'destructive',
      });
    });

    it('handles network errors with retry classification', async () => {
      let onError: (error: unknown, variables: CreateSpinMutationParams, context: any) => void;

      mockUseMutation.mockImplementation(config => {
        onError = config.onError as typeof onError;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const networkError = new Error('Network connection failed');
      onError(networkError, mockSpinData, {});

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Temporary Issue',
        description: 'Check your internet connection and try again',
        variant: 'destructive',
      });
    });

    it('handles validation errors', async () => {
      let onError: (error: unknown, variables: CreateSpinMutationParams, context: any) => void;

      mockUseMutation.mockImplementation(config => {
        onError = config.onError as typeof onError;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const validationError = new Error('Invalid data provided');
      onError(validationError, mockSpinData, {});

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Action Required',
        description: 'Please check your selection and try again',
        variant: 'destructive',
      });
    });

    it('rolls back optimistic updates on error', async () => {
      let onError: (error: unknown, variables: CreateSpinMutationParams, context: any) => void;

      const mockContext = {
        previousHistory: [{ id: 'existing-spin' }],
        optimisticSpin: { id: 'optimistic-123' },
      };

      mockUseMutation.mockImplementation(config => {
        onError = config.onError as typeof onError;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const error = new Error('Database error');
      onError(error, mockSpinData, mockContext);

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['randomizer', 'history', 'user1', { limit: 8, expand: false }],
        mockContext.previousHistory
      );
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['randomizer', 'count', 'user1'],
        expect.any(Function)
      );
    });

    it('handles unknown error types with default classification', async () => {
      let onError: (error: unknown, variables: CreateSpinMutationParams, context: any) => void;

      mockUseMutation.mockImplementation(config => {
        onError = config.onError as typeof onError;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const unknownError = { someProperty: 'unknown' };
      onError(unknownError, mockSpinData, {});

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Temporary Issue',
        description: 'Please try again in a moment',
        variant: 'destructive',
      });
    });
  });

  describe('Enhanced Retry Logic', () => {
    it('retries temporary errors up to 3 times', () => {
      let retryFn: (failureCount: number, error: unknown) => boolean;

      mockUseMutation.mockImplementation(config => {
        retryFn = config.retry as typeof retryFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const networkError = new Error('Network connection failed');

      expect(retryFn(0, networkError)).toBe(true);
      expect(retryFn(1, networkError)).toBe(true);
      expect(retryFn(2, networkError)).toBe(true);
      expect(retryFn(3, networkError)).toBe(false);
    });

    it('does not retry errors requiring user action', () => {
      let retryFn: (failureCount: number, error: unknown) => boolean;

      mockUseMutation.mockImplementation(config => {
        retryFn = config.retry as typeof retryFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const permissionError = new Error('Permission denied');

      expect(retryFn(0, permissionError)).toBe(false);
      expect(retryFn(1, permissionError)).toBe(false);
    });

    it('handles RandomizerError retry logic', () => {
      let retryFn: (failureCount: number, error: unknown) => boolean;

      mockUseMutation.mockImplementation(config => {
        retryFn = config.retry as typeof retryFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const retryableError: RandomizerError = {
        name: 'RandomizerError',
        message: 'Database temporarily unavailable',
        type: RandomizerErrorType.DATABASE_UNAVAILABLE,
        canRetry: true,
        suggestedAction: 'Please try again',
        technicalDetails: {},
      };

      const nonRetryableError: RandomizerError = {
        name: 'RandomizerError',
        message: 'Invalid user ID',
        type: RandomizerErrorType.VALIDATION_ERROR,
        canRetry: false,
        suggestedAction: 'Please check your data',
        technicalDetails: {},
      };

      expect(retryFn(0, retryableError)).toBe(true);
      expect(retryFn(0, nonRetryableError)).toBe(false);
    });

    it('uses exponential backoff with jitter for retry delay', () => {
      let retryDelayFn: (attemptIndex: number) => number;

      mockUseMutation.mockImplementation(config => {
        retryDelayFn = config.retryDelay as typeof retryDelayFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const delay1 = retryDelayFn(0);
      const delay2 = retryDelayFn(1);
      const delay3 = retryDelayFn(2);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1500);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2500);
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(4500);
    });
  });

  describe('Integration Tests', () => {
    it('works with complete enhanced data flow', async () => {
      mockCreateSpinEnhanced.mockResolvedValue(mockSpinRecord);

      let mutationFn: (data: CreateSpinMutationParams) => Promise<RandomizerSpinsResponse>;
      let onMutate: (variables: CreateSpinMutationParams) => Promise<any>;
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: CreateSpinMutationParams,
        context: any
      ) => void;

      const mockContext = { previousHistory: [], optimisticSpin: { id: 'opt-123' } };

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        onMutate = config.onMutate as typeof onMutate;
        onSuccess = config.onSuccess as typeof onSuccess;
        return {
          mutateAsync: async (data: CreateSpinMutationParams) => {
            const context = await onMutate(data);
            const result = await mutationFn(data);
            onSuccess(result, data, context);
            return result;
          },
        } as MockUseMutationResult;
      });

      const { result } = renderHook(() => useCreateSpin());

      const spinResult = await result.current.mutateAsync(mockSpinData);

      expect(mockCreateSpinEnhanced).toHaveBeenCalledWith({
        ...mockSpinData,
        metadata: expect.objectContaining({
          selectionTime: 1500,
          deviceType: 'desktop',
          spinMethod: 'click',
        }),
      });
      expect(mockQueryClient.setQueryData).toHaveBeenCalled(); // Optimistic updates
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['randomizer'],
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Spin recorded!',
        description: 'Selected: Test Project by Test Company',
      });
      expect(spinResult).toEqual(mockSpinRecord);
    });

    it('handles complete error flow with rollback', async () => {
      const serviceError = new Error('Service unavailable');
      mockCreateSpinEnhanced.mockRejectedValue(serviceError);

      let mutationFn: (data: CreateSpinMutationParams) => Promise<RandomizerSpinsResponse>;
      let onMutate: (variables: CreateSpinMutationParams) => Promise<any>;
      let onError: (error: unknown, variables: CreateSpinMutationParams, context: any) => void;

      const mockContext = { previousHistory: [], optimisticSpin: { id: 'opt-123' } };

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        onMutate = config.onMutate as typeof onMutate;
        onError = config.onError as typeof onError;
        return {
          mutateAsync: async (data: CreateSpinMutationParams) => {
            const context = await onMutate(data);
            try {
              return await mutationFn(data);
            } catch (error) {
              onError(error, data, context);
              throw error;
            }
          },
        } as MockUseMutationResult;
      });

      const { result } = renderHook(() => useCreateSpin());

      await expect(result.current.mutateAsync(mockSpinData)).rejects.toThrow('Service unavailable');

      expect(mockCreateSpinEnhanced).toHaveBeenCalled();
      expect(mockQueryClient.setQueryData).toHaveBeenCalled(); // Optimistic update and rollback
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Temporary Issue',
        description: 'Please try again in a moment',
        variant: 'destructive',
      });
      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('Analytics Metadata Capture', () => {
    it('captures complete analytics metadata', async () => {
      mockCreateSpinEnhanced.mockResolvedValue(mockSpinRecord);
      let mutationFn: (data: CreateSpinMutationParams) => Promise<RandomizerSpinsResponse>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const completeSpinData: CreateSpinMutationParams = {
        user: 'test-user-123',
        project: 'test-project-456',
        project_title: 'My Awesome Project',
        project_company: 'Amazing Company',
        project_artist: 'Great Artist',
        selected_projects: ['proj1', 'proj2', 'proj3', 'proj4'],
        metadata: {
          selectionTime: 2500,
          deviceType: 'mobile',
          spinMethod: 'touch',
          userAgent: 'mobile-browser',
        },
      };

      await mutationFn(completeSpinData);

      expect(mockCreateSpinEnhanced).toHaveBeenCalledWith({
        ...completeSpinData,
        metadata: {
          selectionTime: 2500,
          deviceType: 'mobile',
          spinMethod: 'touch',
          userAgent: 'mobile-browser',
        },
      });
    });

    it('handles partial metadata with auto-detection', async () => {
      mockCreateSpinEnhanced.mockResolvedValue(mockSpinRecord);
      let mutationFn: (data: CreateSpinMutationParams) => Promise<RandomizerSpinsResponse>;

      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const partialMetadataData: CreateSpinMutationParams = {
        user: 'user1',
        project: 'proj1',
        project_title: 'Project',
        selected_projects: ['proj1', 'proj2'],
        metadata: {
          selectionTime: 1000,
          spinMethod: 'keyboard',
          // deviceType and userAgent will be auto-detected
        },
      };

      await mutationFn(partialMetadataData);

      expect(mockCreateSpinEnhanced).toHaveBeenCalledWith({
        ...partialMetadataData,
        metadata: {
          selectionTime: 1000,
          deviceType: 'desktop', // Auto-detected
          spinMethod: 'keyboard',
          userAgent: 'test-user-agent', // Auto-detected
        },
      });
    });

    it('validates device type detection', async () => {
      // Test device type detection is called when metadata is missing
      mockDetectDeviceType.mockReturnValue('tablet');
      mockCreateSpinEnhanced.mockResolvedValue(mockSpinRecord);

      let mutationFn: (data: CreateSpinMutationParams) => Promise<RandomizerSpinsResponse>;
      mockUseMutation.mockImplementation(config => {
        mutationFn = config.mutationFn as typeof mutationFn;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      const dataWithoutMetadata = {
        ...mockSpinData,
        metadata: undefined,
      };

      await mutationFn(dataWithoutMetadata);

      expect(mockDetectDeviceType).toHaveBeenCalledWith('test-user-agent');
    });
  });

  describe('Enhanced Toast Messages', () => {
    it('shows contextual success message with project details', async () => {
      let onSuccess: (
        data: RandomizerSpinsResponse,
        variables: CreateSpinMutationParams,
        context: any
      ) => void;

      mockUseMutation.mockImplementation(config => {
        onSuccess = config.onSuccess as typeof onSuccess;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      onSuccess(mockSpinRecord, mockSpinData, {});

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Spin recorded!',
        description: 'Selected: Test Project by Test Company',
      });
      expect(mockToast).toHaveBeenCalledTimes(1);
    });

    it('shows contextual error messages based on error type', async () => {
      let onError: (error: unknown, variables: CreateSpinMutationParams, context: any) => void;

      mockUseMutation.mockImplementation(config => {
        onError = config.onError as typeof onError;
        return {} as MockUseMutationResult;
      });

      renderHook(() => useCreateSpin());

      // Test different error classifications
      const networkError = new Error('Network connection failed');
      const permissionError = new Error('Permission denied');
      const validationError = new Error('Invalid data');

      onError(networkError, mockSpinData, {});
      onError(permissionError, mockSpinData, {});
      onError(validationError, mockSpinData, {});

      expect(mockToast).toHaveBeenCalledTimes(3);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Temporary Issue',
        description: 'Check your internet connection and try again',
        variant: 'destructive',
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Action Required',
        description: 'Please log in again',
        variant: 'destructive',
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Action Required',
        description: 'Please check your selection and try again',
        variant: 'destructive',
      });
    });
  });
});
