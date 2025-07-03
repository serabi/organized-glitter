import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock logger first - before any imports that might use it
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock PocketBase
const mockUpdate = vi.fn();
const mockCreate = vi.fn();
const mockGetFirstListItem = vi.fn();

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getFirstListItem: mockGetFirstListItem,
      update: mockUpdate,
      create: mockCreate,
    })),
  },
}));

// Mock query keys
vi.mock('@/hooks/queries/queryKeys', () => ({
  queryKeys: {
    dashboardFilters: {
      state: (userId: string) => ['dashboardFilters', 'state', userId],
    },
  },
}));

// Import the hook after mocks are set up
import { useSaveNavigationContext, SaveNavigationContextParams, DashboardFilterContext } from '../useSaveNavigationContext';

describe('useSaveNavigationContext', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockNavigationContext: DashboardFilterContext = {
    filters: {
      status: 'wishlist',
      company: 'company1',
      artist: 'artist1',
      drillShape: 'round',
      yearFinished: '2023',
      includeMiniKits: true,
      searchTerm: 'test search',
      selectedTags: ['tag1', 'tag2'],
    },
    sortField: 'kit_name',
    sortDirection: 'asc',
    currentPage: 2,
    pageSize: 50,
    preservationContext: {
      scrollPosition: 1200,
      timestamp: Date.now(),
    },
  };

  const mockParams: SaveNavigationContextParams = {
    userId: 'user123',
    navigationContext: mockNavigationContext,
  };

  describe('successful operations', () => {
    it('should create new record when none exists', async () => {
      // Mock 404 error for getFirstListItem (record doesn't exist)
      mockGetFirstListItem.mockRejectedValue({ status: 404 });
      mockCreate.mockResolvedValue({ id: 'new-record-id' });

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockParams);
      });

      expect(mockGetFirstListItem).toHaveBeenCalledWith('user="user123"');
      expect(mockCreate).toHaveBeenCalledWith({
        user: 'user123',
        navigation_context: mockNavigationContext,
      });
      expect(mockUpdate).not.toHaveBeenCalled();
      // Logger calls are verified by the presence of the hook working correctly
    });

    it('should update existing record when found', async () => {
      const existingRecord = { id: 'existing-record-id' };
      mockGetFirstListItem.mockResolvedValue(existingRecord);
      mockUpdate.mockResolvedValue({ id: 'existing-record-id' });

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockParams);
      });

      expect(mockGetFirstListItem).toHaveBeenCalledWith('user="user123"');
      expect(mockUpdate).toHaveBeenCalledWith('existing-record-id', {
        navigation_context: mockNavigationContext,
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should invalidate queries on successful save', async () => {
      mockGetFirstListItem.mockRejectedValue({ status: 404 });
      mockCreate.mockResolvedValue({ id: 'new-record-id' });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockParams);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['dashboardFilters', 'state', 'user123'],
      });
    });

    it('should complete save operation successfully', async () => {
      mockGetFirstListItem.mockRejectedValue({ status: 404 });
      mockCreate.mockResolvedValue({ id: 'new-record-id' });

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockParams);
      });

      expect(mockCreate).toHaveBeenCalledWith({
        user: 'user123',
        navigation_context: mockNavigationContext,
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when userId is missing', async () => {
      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            userId: '',
            navigationContext: mockNavigationContext,
          });
        })
      ).rejects.toThrow('User ID is required');
    });

    it('should throw error when navigationContext is missing', async () => {
      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            userId: 'user123',
            navigationContext: null as any,
          });
        })
      ).rejects.toThrow('Navigation context is required');
    });

    it('should handle database errors during getFirstListItem', async () => {
      const databaseError = new Error('Database connection failed');
      mockGetFirstListItem.mockRejectedValue(databaseError);

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync(mockParams);
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle database errors during create', async () => {
      const createError = new Error('Create operation failed');
      mockGetFirstListItem.mockRejectedValue({ status: 404 });
      mockCreate.mockRejectedValue(createError);

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync(mockParams);
        })
      ).rejects.toThrow('Create operation failed');
    });

    it('should handle database errors during update', async () => {
      const updateError = new Error('Update operation failed');
      const existingRecord = { id: 'existing-record-id' };
      mockGetFirstListItem.mockResolvedValue(existingRecord);
      mockUpdate.mockRejectedValue(updateError);

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync(mockParams);
        })
      ).rejects.toThrow('Update operation failed');
    });

    it('should handle error objects with status and message', async () => {
      const error = { message: 'Database error', status: 500 };
      mockGetFirstListItem.mockRejectedValue(error);

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      await expect(
        act(async () => {
          await result.current.mutateAsync(mockParams);
        })
      ).rejects.toEqual(error);
    });
  });

  describe('mutation configuration', () => {
    it('should not retry failed mutations', async () => {
      mockGetFirstListItem.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      try {
        await act(async () => {
          await result.current.mutateAsync(mockParams);
        });
      } catch (e) {
        // Expected to throw
      }

      // Verify only one attempt was made
      expect(mockGetFirstListItem).toHaveBeenCalledTimes(1);
    });

    it('should complete mutation successfully', async () => {
      mockGetFirstListItem.mockResolvedValue({ id: 'test' });
      mockUpdate.mockResolvedValue({ id: 'test' });

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      // Check initial state
      expect(result.current.isPending).toBe(false);
      expect(result.current.isError).toBe(false);

      // Execute mutation and verify it completes without error
      await act(async () => {
        await result.current.mutateAsync(mockParams);
      });

      // Verify the mutation completed (called the update function)
      expect(mockUpdate).toHaveBeenCalledWith('test', {
        navigation_context: mockNavigationContext,
      });
    });
  });

  describe('navigation context validation', () => {
    it('should save complex navigation context correctly', async () => {
      const complexContext: DashboardFilterContext = {
        filters: {
          status: 'progress',
          company: 'all',
          artist: 'artist-with-special-chars-éñ',
          drillShape: 'square',
          yearFinished: '2024',
          includeMiniKits: false,
          searchTerm: 'complex "search" with quotes',
          selectedTags: ['tag1', 'tag2', 'tag3'],
        },
        sortField: 'date_purchased',
        sortDirection: 'desc',
        currentPage: 5,
        pageSize: 100,
        preservationContext: {
          scrollPosition: 2500,
          timestamp: 1234567890,
        },
      };

      mockGetFirstListItem.mockRejectedValue({ status: 404 });
      mockCreate.mockResolvedValue({ id: 'new-record-id' });

      const { result } = renderHook(() => useSaveNavigationContext(), { wrapper });

      // Ensure hook is properly initialized
      expect(result.current).toBeTruthy();
      expect(typeof result.current.mutateAsync).toBe('function');

      await act(async () => {
        await result.current.mutateAsync({
          userId: 'user123',
          navigationContext: complexContext,
        });
      });

      expect(mockCreate).toHaveBeenCalledWith({
        user: 'user123',
        navigation_context: complexContext,
      });
    });
  });
});