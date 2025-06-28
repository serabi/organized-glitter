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
  const mockPbUpdate = vi.fn();
  const mockPbGetOne = vi.fn();
  const mockPbGetList = vi.fn();
  const mockPbGetFullList = vi.fn();
  const mockPbGetFirstListItem = vi.fn();
  const mockPbDelete = vi.fn();
  const mockPbFilter = vi.fn((filter, params) => filter);

  return {
    pb: {
      collection: vi.fn((collectionName: string) => ({
        update: mockPbUpdate,
        getOne: mockPbGetOne,
        getList: mockPbGetList,
        getFullList: mockPbGetFullList,
        getFirstListItem: mockPbGetFirstListItem,
        delete: mockPbDelete,
      })),
      filter: mockPbFilter,
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

describe('useEditProjectSimplified', () => {
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
    
    // Setup mock functions for collection operations
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

  const mockProject = {
    id: 'project-123',
    title: 'Test Project',
    status: 'wishlist' as const,
    company: 'Test Company',
    artist: 'Test Artist',
    drillShape: 'square',
    totalDiamonds: 1000,
    generalNotes: 'Test notes',
    sourceUrl: 'https://example.com',
    imageUrl: 'https://example.com/image.jpg',
    width: 100,
    height: 100,
    datePurchased: '2023-01-01',
    dateReceived: '2023-01-02',
    dateStarted: '2023-01-03',
    dateCompleted: '',
    tags: [],
    userId: 'user-123',
    kit_category: 'full' as const,
  };

  describe('initialization and loading', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      expect(result.current.loading).toBe(true);
      expect(result.current.project).toBeNull();
      expect(result.current.formData).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.submitting).toBe(false);
      expect(result.current.companies).toEqual([]);
      expect(result.current.artists).toEqual([]);
    });

    it('should not load when projectId is undefined', () => {
      const { result } = renderHook(() => useEditProjectSimplified(undefined), { wrapper });
      expect(result.current.loading).toBe(false);
      expect(result.current.project).toBeNull();
    });

    it('should not load when user is not available', async () => {
      vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false });
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      expect(result.current.loading).toBe(false);
    });

    it('should expose all expected hook interface properties', () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      // State properties
      expect(result.current).toHaveProperty('project');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('submitting');
      expect(result.current).toHaveProperty('companies');
      expect(result.current).toHaveProperty('artists');
      expect(result.current).toHaveProperty('formData');
      expect(result.current).toHaveProperty('isDirty');
      expect(result.current).toHaveProperty('hasSelectedNewImage');

      // Navigation state
      expect(result.current).toHaveProperty('navigationState');

      // Handler functions
      expect(result.current).toHaveProperty('handleSubmit');
      expect(result.current).toHaveProperty('handleArchive');
      expect(result.current).toHaveProperty('handleDelete');
      expect(result.current).toHaveProperty('handleFormChange');
      expect(result.current).toHaveProperty('refreshLists');

      // Navigation functions
      expect(result.current).toHaveProperty('navigateWithWarning');
      expect(result.current).toHaveProperty('clearNavigationError');

      // Confirmation component
      expect(result.current).toHaveProperty('ConfirmationDialog');
    });

    it('should load project data successfully', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockPbGetOne).toHaveBeenCalledWith('project-123', expect.objectContaining({
        expand: 'company,artist,user,project_tags_via_project.tag',
      }));
      
      expect(mockPbGetList).toHaveBeenCalledWith(1, 200, expect.objectContaining({
        filter: 'user = "user-123"',
        fields: 'name',
      }));

      expect(result.current.project).toBeTruthy();
      expect(result.current.companies).toEqual(['Test Company']);
      expect(result.current.artists).toEqual(['Test Artist']);
    });

    it('should handle project loading error', async () => {
      mockPbGetOne.mockRejectedValue(new Error('Project not found'));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.project).toBeNull();
    });

    it('should handle network error during project loading', async () => {
      mockPbGetOne.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.project).toBeNull();
    });
  });

  describe('project updating', () => {
    it('should update project successfully', async () => {
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

      expect(mockPbUpdate).toHaveBeenCalledWith(
        'project-123',
        expect.any(FormData)
      );
    });

    it('should handle update error', async () => {
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
    });
  });

  describe('project archiving', () => {
    it('should archive project successfully', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.handleArchive();

      expect(mockPbUpdate).toHaveBeenCalledWith('project-123', {
        status: 'archived',
      });
    });
  });

  describe('project deletion', () => {
    it('should delete project successfully with sequential operations', async () => {
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

    it('should handle deletion with related records sequentially', async () => {
      // Mock getFullList with related records
      mockPbGetFullList
        .mockResolvedValueOnce([{ id: 'note-1' }, { id: 'note-2' }]) // Progress notes
        .mockResolvedValueOnce([{ id: 'tag-1' }]); // Project tags

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.handleDelete();

      // Verify sequential operations were called for all records
      expect(mockPbDelete).toHaveBeenCalledWith('note-1');
      expect(mockPbDelete).toHaveBeenCalledWith('note-2');
      expect(mockPbDelete).toHaveBeenCalledWith('tag-1');
      expect(mockPbDelete).toHaveBeenCalledWith('project-123');
      expect(mockPbDelete).toHaveBeenCalledTimes(4); // 2 notes + 1 tag + 1 project
    });

    it('should handle sequential deletion errors gracefully', async () => {
      // Mock getFullList for related records
      mockPbGetFullList
        .mockResolvedValueOnce([{ id: 'note-1' }]) // One progress note
        .mockResolvedValueOnce([]); // No project tags

      // Mock the first delete to fail
      mockPbDelete.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.handleDelete();

      // Verify deletion was attempted but failed gracefully
      expect(mockPbDelete).toHaveBeenCalledWith('note-1');
      expect(mockPbDelete).toHaveBeenCalledTimes(1); // Should stop after first failure
    });
  });

  describe('tag synchronization', () => {
    it('should handle tag addition and removal during update', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const formData = {
        id: 'project-123',
        title: 'Updated Project',
        tags: [{ id: 'tag-123', name: 'Test Tag' }],
      };

      await result.current.handleSubmit(formData);

      expect(mockAddTagToProject).toHaveBeenCalledWith('project-123', 'tag-123');
    });
  });
});