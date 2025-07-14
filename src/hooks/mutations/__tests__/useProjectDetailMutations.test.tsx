import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useDeleteProjectMutation } from '../useProjectDetailMutations';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user123' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock PocketBase with getList method
const mockDelete = vi.fn();
const mockGetList = vi.fn();
const mockCollectionDelete = vi.fn();

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn((collectionName: string) => {
      // Return different methods based on collection
      if (collectionName === 'projects') {
        return {
          delete: mockCollectionDelete,
          getList: mockGetList,
        };
      }
      return {
        delete: mockDelete,
        getList: mockGetList,
        getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')), // Cache miss
        create: vi.fn().mockResolvedValue({ id: 'cache123' }),
        update: vi.fn().mockResolvedValue({ id: 'cache123' }),
        getFullList: vi.fn().mockResolvedValue([]),
      };
    }),
    filter: vi.fn((template: string, ...params: unknown[]) => {
      // Mock filter method for DashboardStatsService
      let result = template;
      let paramIndex = 0;
      result = result.replace(/\{\s*:\s*\w+\s*\}/g, () => {
        const param = params[paramIndex++];
        if (typeof param === 'string') {
          return `"${param}"`;
        }
        return String(param);
      });
      return result;
    }),
    authStore: {
      isValid: true,
      model: { id: 'user123' },
    },
  },
}));

// Mock logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useProjectDetailMutations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Set up default return values for DashboardStatsService calls
    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 200,
      totalPages: 1,
      totalItems: 0,
      items: [],
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('deleteProjectRelatedRecords', () => {
    it('should handle batch deletion with pagination', async () => {
      // Mock paginated responses
      mockGetList
        .mockResolvedValueOnce({
          items: Array(50)
            .fill(null)
            .map((_, i) => ({ id: `note${i}` })),
          totalItems: 120,
        })
        .mockResolvedValueOnce({
          items: Array(50)
            .fill(null)
            .map((_, i) => ({ id: `note${i + 50}` })),
          totalItems: 120,
        })
        .mockResolvedValueOnce({
          items: Array(20)
            .fill(null)
            .map((_, i) => ({ id: `note${i + 100}` })),
          totalItems: 120,
        })
        .mockResolvedValueOnce({
          items: Array(30)
            .fill(null)
            .map((_, i) => ({ id: `tag${i}` })),
          totalItems: 30,
        });

      mockDelete.mockResolvedValue({});
      mockCollectionDelete.mockResolvedValue({});

      const { result } = renderHook(() => useDeleteProjectMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ projectId: 'project123', title: 'Test Project' });
      });

      // Verify getList was called with correct pagination parameters
      expect(mockGetList).toHaveBeenCalledWith(1, 50, {
        filter: 'project = "project123"',
        fields: 'id',
      });
      expect(mockGetList).toHaveBeenCalledWith(2, 50, {
        filter: 'project = "project123"',
        fields: 'id',
      });
      expect(mockGetList).toHaveBeenCalledWith(3, 50, {
        filter: 'project = "project123"',
        fields: 'id',
      });

      // Verify all items were deleted
      expect(mockDelete).toHaveBeenCalledTimes(150); // 120 notes + 30 tags
    });

    it('should handle empty collections gracefully', async () => {
      // Mock empty responses
      mockGetList.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      mockDelete.mockResolvedValue({});
      mockCollectionDelete.mockResolvedValue({});

      const { result } = renderHook(() => useDeleteProjectMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ projectId: 'project123', title: 'Test Project' });
      });

      // Verify getList was called but no deletions occurred
      expect(mockGetList).toHaveBeenCalledTimes(2); // Once for notes, once for tags
      expect(mockDelete).toHaveBeenCalledTimes(0); // No related records to delete
      expect(mockCollectionDelete).toHaveBeenCalledTimes(1); // Only the project itself
    });

    it('should propagate errors without catching them', async () => {
      // Mock an error during deletion
      mockGetList.mockResolvedValueOnce({
        items: [{ id: 'note1' }],
        totalItems: 1,
      });

      mockDelete.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDeleteProjectMutation(), { wrapper });

      // The mutation should fail with the error
      await expect(
        act(async () => {
          await result.current.mutateAsync({ projectId: 'project123', title: 'Test Project' });
        })
      ).rejects.toThrow('Network error');
    });

    it('should delete records in parallel batches', async () => {
      // Mock a response with more than PARALLEL_LIMIT (5) items
      mockGetList
        .mockResolvedValueOnce({
          items: Array(12)
            .fill(null)
            .map((_, i) => ({ id: `note${i}` })),
          totalItems: 12,
        })
        .mockResolvedValueOnce({
          items: [],
          totalItems: 0,
        });

      const deleteCallOrder: string[] = [];
      mockDelete.mockImplementation(id => {
        deleteCallOrder.push(id);
        return Promise.resolve({});
      });

      const { result } = renderHook(() => useDeleteProjectMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ projectId: 'project123', title: 'Test Project' });
      });

      // Verify parallel execution pattern
      // First 5 should be deleted in parallel, then next 5, then last 2
      expect(deleteCallOrder.slice(0, 5)).toEqual(['note0', 'note1', 'note2', 'note3', 'note4']);
      expect(deleteCallOrder.slice(5, 10)).toEqual(['note5', 'note6', 'note7', 'note8', 'note9']);
      expect(deleteCallOrder.slice(10, 12)).toEqual(['note10', 'note11']);
    });
  });
});
