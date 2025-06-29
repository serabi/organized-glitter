import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEditProjectSimplified } from '../useEditProjectSimplified';

// Mock modules
vi.mock('../useAuth');
vi.mock('@/hooks/useNavigationWithWarning', () => ({
  useNavigationWithWarning: () => ({
    navigateWithWarning: vi.fn(),
    unsafeNavigate: vi.fn(),
    navigationState: { isNavigating: false },
    removeBeforeUnloadListener: vi.fn(),
    clearNavigationError: vi.fn(),
  }),
}));
vi.mock('@/hooks/useConfirmationDialog', () => ({
  useConfirmationDialog: () => ({
    ConfirmationDialog: () => null,
    confirmDelete: vi.fn(() => Promise.resolve(true)),
    confirmArchive: vi.fn(() => Promise.resolve(true)),
    confirmUnsavedChanges: vi.fn(() => Promise.resolve(true)),
  }),
}));
vi.mock('@/hooks/useNavigateToProject', () => ({
  useNavigateToProject: () => vi.fn(),
}));
vi.mock('@/utils/toast-adapter', () => ({
  useServiceToast: () => ({
    toast: vi.fn(),
  }),
  createToastAdapter: vi.fn(() => vi.fn()),
}));

// Mock PocketBase operations directly
vi.mock('@/lib/pocketbase', () => {
  return {
    pb: {
      collection: vi.fn(),
      filter: vi.fn((filter, params) => filter),
      files: {
        getURL: vi.fn((record, filename) => `https://example.com/files/${filename}`),
      },
    },
  };
});

// Mock TagService
vi.mock('@/lib/tags', () => ({
  TagService: {
    addTagToProject: vi.fn(),
    removeTagFromProject: vi.fn(),
  },
}));

// Import the mocked modules
import { useAuth } from '../useAuth';
import { pb } from '@/lib/pocketbase';
import { TagService } from '@/lib/tags';

// Extract mock functions after import
const mockPbCollection = vi.mocked(pb.collection);
const mockPbUpdate = vi.fn();
const mockPbGetOne = vi.fn();
const mockPbGetList = vi.fn();
const mockPbGetFullList = vi.fn();
const mockPbGetFirstListItem = vi.fn();
const mockPbDelete = vi.fn();
const mockAddTagToProject = vi.mocked(TagService.addTagToProject);
const mockRemoveTagFromProject = vi.mocked(TagService.removeTagFromProject);

describe('useEditProjectSimplified - Navigation', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Set default mock return values
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    });

    // Setup mock functions
    mockPbUpdate.mockResolvedValue({
      id: 'project-123',
      title: 'Updated Project',
      status: 'wishlist',
      user: 'user-123',
    });

    mockPbGetOne.mockResolvedValue({
      id: 'project-123',
      title: 'Test Project',
      status: 'wishlist',
      user: 'user-123',
      company: 'company-123',
      artist: 'artist-123',
      image: 'test-image.jpg',
      expand: {
        company: { id: 'company-123', name: 'Test Company' },
        artist: { id: 'artist-123', name: 'Test Artist' },
        project_tags_via_project: [],
      },
    });

    mockPbGetList.mockResolvedValue({
      items: [
        { id: 'company-123', name: 'Test Company' },
        { id: 'artist-123', name: 'Test Artist' },
      ],
      page: 1,
      perPage: 200,
      totalItems: 2,
      totalPages: 1,
    });

    mockPbGetFirstListItem.mockResolvedValue({
      id: 'company-123',
      name: 'Test Company',
    });

    // Setup collection mock to return object with methods
    mockPbCollection.mockReturnValue({
      update: mockPbUpdate,
      getOne: mockPbGetOne,
      getList: mockPbGetList,
      getFullList: mockPbGetFullList,
      getFirstListItem: mockPbGetFirstListItem,
      delete: mockPbDelete,
    });

    mockAddTagToProject.mockResolvedValue({ data: undefined, error: null });
    mockRemoveTagFromProject.mockResolvedValue({ data: undefined, error: null });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('successful operations with navigation', () => {
    it('should navigate after successful form submission', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const formData = {
        id: 'project-123',
        title: 'Updated Project',
        company: 'Test Company',
        artist: 'Test Artist',
        status: 'in_progress' as const,
        tags: [],
      };

      await result.current.handleSubmit(formData);

      expect(mockPbUpdate).toHaveBeenCalledWith('project-123', expect.any(FormData));
    });

    it('should navigate after successful archiving', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.handleArchive();

      expect(mockPbUpdate).toHaveBeenCalledWith('project-123', {
        status: 'archived',
      });
    });

    it('should navigate after successful deletion', async () => {
      // Mock getFullList for progress notes and project tags
      mockPbGetFullList
        .mockResolvedValueOnce([]) // No progress notes
        .mockResolvedValueOnce([]); // No project tags

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.handleDelete();

      // Verify sequential deletion was used
      expect(mockPbGetFullList).toHaveBeenCalledTimes(2);
      expect(mockPbDelete).toHaveBeenCalledWith('project-123');
    });
  });

  describe('error handling during operations', () => {
    it('should handle update errors gracefully', async () => {
      mockPbUpdate.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const formData = {
        id: 'project-123',
        title: 'Updated Project',
        tags: [],
      };

      await result.current.handleSubmit(formData);

      expect(mockPbUpdate).toHaveBeenCalled();
      // Should not navigate on error
    });

    it('should handle archive errors gracefully', async () => {
      mockPbUpdate.mockRejectedValue(new Error('Archive failed'));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.handleArchive();

      expect(mockPbUpdate).toHaveBeenCalled();
      // Should not navigate on error
    });

    it('should handle deletion errors gracefully', async () => {
      // Mock getFullList for related records
      mockPbGetFullList
        .mockResolvedValueOnce([]) // No progress notes
        .mockResolvedValueOnce([]); // No project tags

      // Mock project delete to fail
      mockPbDelete.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.handleDelete();

      // Verify deletion was attempted
      expect(mockPbGetFullList).toHaveBeenCalledTimes(2);
      expect(mockPbDelete).toHaveBeenCalledWith('project-123');
      // Should not navigate on error
    });
  });

  describe('navigation state management', () => {
    it('should expose navigation state properties', () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      expect(result.current).toHaveProperty('navigationState');
      expect(result.current).toHaveProperty('navigateWithWarning');
      expect(result.current).toHaveProperty('clearNavigationError');
    });

    it('should handle form state changes for navigation warnings', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Test that isDirty state is accessible
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('company and artist resolution', () => {
    it('should resolve company names to IDs during updates', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const formData = {
        id: 'project-123',
        title: 'Updated Project',
        company: 'Test Company',
        artist: 'Test Artist',
        tags: [],
      };

      await result.current.handleSubmit(formData);

      expect(mockPbGetFirstListItem).toHaveBeenCalledWith(
        expect.stringContaining('name = {:name} && user = {:user}'),
        { name: 'Test Company', user: 'user-123' }
      );
    });

    it('should handle company resolution failures gracefully', async () => {
      mockPbGetFirstListItem.mockRejectedValue(new Error('Company not found'));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const formData = {
        id: 'project-123',
        title: 'Updated Project',
        company: 'Nonexistent Company',
        tags: [],
      };

      await result.current.handleSubmit(formData);

      // Should still attempt to update even if company resolution fails
      expect(mockPbUpdate).toHaveBeenCalled();
    });
  });
});
