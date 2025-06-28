import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditProjectSimplified } from '../useEditProjectSimplified';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock dependencies following the established pattern
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/utils/toast-adapter', () => ({
  useServiceToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('../useNavigationWithWarning', () => ({
  useNavigationWithWarning: () => ({
    navigateWithWarning: vi.fn(),
    unsafeNavigate: vi.fn(),
    navigationState: { isNavigating: false, error: null },
    removeBeforeUnloadListener: vi.fn(),
    clearNavigationError: vi.fn(),
  }),
}));

vi.mock('../useConfirmationDialog', () => ({
  useConfirmationDialog: () => ({
    ConfirmationDialog: () => null,
    confirmDelete: vi.fn(),
    confirmArchive: vi.fn(),
    confirmUnsavedChanges: vi.fn(),
  }),
}));

// Mock PocketBase operations directly

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(),
    filter: vi.fn((filter, params) => filter),
    files: {
      getURL: vi.fn((record, filename) => `https://example.com/${filename}`),
    },
  },
}));

// Mock TagService
vi.mock('@/lib/tags', () => ({
  TagService: {
    addTagToProject: vi.fn().mockResolvedValue({ data: undefined, error: null }),
    removeTagFromProject: vi.fn().mockResolvedValue({ data: undefined, error: null }),
  },
}));

// Import the mocked modules
import { useAuth } from '../useAuth';
import { pb } from '@/lib/pocketbase';
import { TagService } from '@/lib/tags';

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
    tags: [] as any[],
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
      vi.mocked(useAuth).mockReturnValue({ user: null as any, isLoading: false });
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
      // Function properties
      expect(typeof result.current.handleFormChange).toBe('function');
      expect(typeof result.current.handleSubmit).toBe('function');
      expect(typeof result.current.handleCancel).toBe('function');
      expect(typeof result.current.handleArchive).toBe('function');
      expect(typeof result.current.handleDelete).toBe('function');
      expect(typeof result.current.refreshLists).toBe('function');
      // Navigation properties
      expect(typeof result.current.navigateWithWarning).toBe('function');
      expect(result.current).toHaveProperty('navigationState');
      expect(typeof result.current.clearNavigationError).toBe('function');
      // Component
      expect(result.current).toHaveProperty('ConfirmationDialog');
    });
  });

  describe('data loading success cases', () => {
    it('should successfully load project data and initialize form', async () => {

      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: mockProject, error: null });
      const mockCompanies = [{ name: 'Company 1' }, { name: 'Company 2' }];
      const mockArtists = [{ name: 'Artist 1' }, { name: 'Artist 2' }];

      pb.collection.mockImplementation((collection: string) => ({
        getList: vi.fn().mockResolvedValue({
          items: collection === 'companies' ? mockCompanies : mockArtists,
        }),
      }));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.project).toEqual(mockProject);
      expect(result.current.companies).toEqual(['Company 1', 'Company 2']);
      expect(result.current.artists).toEqual(['Artist 1', 'Artist 2']);
      expect(result.current.formData).toEqual({
        title: mockProject.title,
        status: mockProject.status,
        company: mockProject.company,
        artist: mockProject.artist,
        drillShape: mockProject.drillShape,
        totalDiamonds: mockProject.totalDiamonds,
        generalNotes: mockProject.generalNotes,
        sourceUrl: mockProject.sourceUrl,
        imageUrl: mockProject.imageUrl,
        imageFile: null,
        width: mockProject.width.toString(),
        height: mockProject.height.toString(),
        datePurchased: mockProject.datePurchased,
        dateReceived: mockProject.dateReceived,
        dateStarted: mockProject.dateStarted,
        dateCompleted: mockProject.dateCompleted,
        tags: mockProject.tags,
        userId: mockProject.userId,
        kit_category: mockProject.kit_category,
      });
    });

    it('should handle project with minimal data', async () => {
      const minimalProject = {
        id: 'project-123',
        title: 'Minimal Project',
        status: 'wishlist' as const,
        userId: 'user-123',
        kit_category: 'full' as const,
      };
      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: minimalProject, error: null });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.project).toEqual(minimalProject);
      expect(result.current.formData?.title).toBe('Minimal Project');
      expect(result.current.formData?.company).toBe('');
      expect(result.current.formData?.totalDiamonds).toBe(0);
    });

    it('should handle empty metadata lists', async () => {

      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: mockProject, error: null });
      vi.mocked(pb.collection).mockImplementation(() => ({
        getList: vi.fn().mockResolvedValue({ items: [] }),
      }));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.companies).toEqual([]);
      expect(result.current.artists).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle project fetch error', async () => {
      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: null, error: 'Project not found' });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error loading project',
        description: 'Project not found',
        variant: 'destructive',
      });
      expect(result.current.project).toBeNull();
    });

    it('should handle project fetch exception', async () => {
      vi.mocked(projectService.fetchProject).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to load project details',
        variant: 'destructive',
      });
    });

    it('should handle metadata fetch errors gracefully', async () => {

      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: mockProject, error: null });
      vi.mocked(pb.collection).mockImplementation(() => ({
        getList: vi.fn().mockRejectedValue(new Error('Metadata fetch failed')),
      }));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.project).toEqual(mockProject);
      expect(result.current.companies).toEqual([]);
      expect(result.current.artists).toEqual([]);
    });

    it('should handle Error instance vs string error messages', async () => {
      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: null, error: new Error('Custom error message') });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to load project details',
        variant: 'destructive',
      });
    });
  });

  describe('form state management', () => {
    beforeEach(async () => {
      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: mockProject, error: null });
    });

    it('should track dirty state when form changes', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.handleFormChange({
          title: 'Updated Title',
          status: 'wishlist',
          company: '',
          artist: '',
          drillShape: '',
          totalDiamonds: 0,
          generalNotes: '',
          sourceUrl: '',
          imageUrl: '',
          imageFile: null,
          width: '',
          height: '',
          datePurchased: '',
          dateReceived: '',
          dateStarted: '',
          dateCompleted: '',
          tags: [],
          userId: 'user-123',
          kit_category: 'full',
        });
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should track image selection state', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasSelectedNewImage).toBe(false);

      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      act(() => {
        result.current.handleFormChange({
          title: 'Test',
          status: 'wishlist',
          company: '',
          artist: '',
          drillShape: '',
          totalDiamonds: 0,
          generalNotes: '',
          sourceUrl: '',
          imageUrl: '',
          imageFile: mockFile,
          width: '',
          height: '',
          datePurchased: '',
          dateReceived: '',
          dateStarted: '',
          dateCompleted: '',
          tags: [],
          userId: 'user-123',
          kit_category: 'full',
        });
      });
      expect(result.current.hasSelectedNewImage).toBe(true);
    });

    it('should handle partial form updates', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      const initial = result.current.formData;
      act(() => result.current.handleFormChange({ title: 'Partial Update' }));
      expect(result.current.formData?.title).toBe('Partial Update');
      expect(result.current.formData?.company).toBe(initial?.company);
      expect(result.current.isDirty).toBe(true);
    });

    it('should not mark as dirty for image-only changes without file', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.handleFormChange({ imageUrl: 'https://example.com/new-image.jpg' }));
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('project operations', () => {
    beforeEach(async () => {
      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: mockProject, error: null });
    });

    describe('handleSubmit', () => {
      it('should successfully update project', async () => {
          const updatedProject = { ...mockProject, title: 'Updated Title' };
        vi.mocked(projectService.updateProject).mockResolvedValue({ data: updatedProject, error: null });

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        const formData = {
          title: 'Updated Title',
          status: 'wishlist' as const,
          company: '',
          artist: '',
          drillShape: '',
          totalDiamonds: 0,
          generalNotes: '',
          sourceUrl: '',
          imageUrl: '',
          imageFile: null,
          width: '',
          height: '',
          datePurchased: '',
          dateReceived: '',
          dateStarted: '',
          dateCompleted: '',
          tags: [],
          tagIds: [] as string[],
          userId: 'user-123',
          kit_category: 'full' as const,
        };

        await act(async () => { await result.current.handleSubmit(formData); });

        expect(projectService.updateProject).toHaveBeenCalledWith('project-123', formData);
        expect(result.current.isDirty).toBe(false);
        expect(result.current.hasSelectedNewImage).toBe(false);
      });

      it('should handle update failure', async () => {
          vi.mocked(projectService.updateProject).mockResolvedValue({ data: null, error: 'Update failed' });

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        const formData = {
          title: 'Updated Title',
          status: 'wishlist' as const,
          company: '',
          artist: '',
          drillShape: '',
          totalDiamonds: 0,
          generalNotes: '',
          sourceUrl: '',
          imageUrl: '',
          imageFile: null,
          width: '',
          height: '',
          datePurchased: '',
          dateReceived: '',
          dateStarted: '',
          dateCompleted: '',
          tags: [],
          userId: 'user-123',
          kit_category: 'full' as const,
        };

        await act(async () => { await result.current.handleSubmit(formData); });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error updating project',
          description: 'Update failed',
          variant: 'destructive',
        });
      });

      it('should handle network errors during update', async () => {
          vi.mocked(projectService.updateProject).mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        const formData = {
          title: 'Updated Title',
          status: 'wishlist' as const,
          company: '',
          artist: '',
          drillShape: '',
          totalDiamonds: 0,
          generalNotes: '',
          sourceUrl: '',
          imageUrl: '',
          imageFile: null,
          width: '',
          height: '',
          datePurchased: '',
          dateReceived: '',
          dateStarted: '',
          dateCompleted: '',
          tags: [],
          userId: 'user-123',
          kit_category: 'full' as const,
        };

        await act(async () => { await result.current.handleSubmit(formData); });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error updating project',
          description: 'Network error',
          variant: 'destructive',
        });
      });

      it('should handle missing projectId', async () => {
        const { result } = renderHook(() => useEditProjectSimplified(undefined), { wrapper });
        const formData = {
          title: 'Updated Title',
          status: 'wishlist' as const,
          company: '',
          artist: '',
          drillShape: '',
          totalDiamonds: 0,
          generalNotes: '',
          sourceUrl: '',
          imageUrl: '',
          imageFile: null,
          width: '',
          height: '',
          datePurchased: '',
          dateReceived: '',
          dateStarted: '',
          dateCompleted: '',
          tags: [],
          userId: 'user-123',
          kit_category: 'full' as const,
        };
        await act(async () => { await result.current.handleSubmit(formData); });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'No project ID provided',
          variant: 'destructive',
        });
      });

      it('should convert string totalDiamonds to number', async () => {
          vi.mocked(projectService.updateProject).mockResolvedValue({ data: mockProject, error: null });

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        const formData = {
          title: 'Test',
          status: 'wishlist' as const,
          company: '',
          artist: '',
          drillShape: '',
          totalDiamonds: '1500',
          generalNotes: '',
          sourceUrl: '',
          imageUrl: '',
          imageFile: null,
          width: '',
          height: '',
          datePurchased: '',
          dateReceived: '',
          dateStarted: '',
          dateCompleted: '',
          tags: [],
          userId: 'user-123',
          kit_category: 'full' as const,
        } as any;

        await act(async () => { await result.current.handleSubmit(formData); });

        expect(projectService.updateProject).toHaveBeenCalledWith('project-123', {
          ...formData,
          totalDiamonds: 1500,
          tagIds: [] as string[],
        });
      });
    });

    describe('handleArchive', () => {
      it('should archive project successfully', async () => {
          vi.mocked(projectService.updateProjectStatus).mockResolvedValue({
          data: { ...mockProject, status: 'archived' },
          error: null,
        });
        mockConfirmArchive.mockResolvedValue(true);

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.handleArchive(); });

        expect(mockConfirmArchive).toHaveBeenCalledWith(mockProject.title);
        expect(projectService.updateProjectStatus).toHaveBeenCalledWith('project-123', 'archived');
      });

      it('should cancel archive when not confirmed', async () => {
          mockConfirmArchive.mockResolvedValue(false);

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.handleArchive(); });

        expect(projectService.updateProjectStatus).not.toHaveBeenCalled();
      });

      it('should confirm unsaved changes before archive', async () => {
        mockConfirmUnsavedChanges.mockResolvedValue(false);

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => result.current.handleFormChange({ title: 'Changed' }));

        await act(async () => { await result.current.handleArchive(); });

        expect(mockConfirmUnsavedChanges).toHaveBeenCalledWith('archive this project');
        expect(mockConfirmArchive).not.toHaveBeenCalled();
      });

      it('should handle archive error', async () => {
          vi.mocked(projectService.updateProjectStatus).mockResolvedValue({ data: null, error: 'Archive failed' });
        mockConfirmArchive.mockResolvedValue(true);

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        await waitFor(() => expect(result.current.project).toEqual(mockProject));

        await act(async () => { await result.current.handleArchive(); });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error archiving project',
          description: 'Archive failed',
          variant: 'destructive',
        });
      });
    });

    describe('handleDelete', () => {
      it('should delete project successfully', async () => {
          vi.mocked(projectService.deleteProject).mockResolvedValue({ data: true, error: null });
        mockConfirmDelete.mockResolvedValue(true);

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.handleDelete(); });

        expect(mockConfirmDelete).toHaveBeenCalled();
        expect(projectService.deleteProject).toHaveBeenCalledWith('project-123');
      });

      it('should cancel delete when not confirmed', async () => {
          mockConfirmDelete.mockResolvedValue(false);

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.handleDelete(); });

        expect(projectService.deleteProject).not.toHaveBeenCalled();
      });

      it('should handle delete error', async () => {
          vi.mocked(projectService.deleteProject).mockResolvedValue({ data: null, error: new Error('Delete failed') });
        mockConfirmDelete.mockResolvedValue(true);

        const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        await waitFor(() => expect(result.current.project).toEqual(mockProject));

        await act(async () => { await result.current.handleDelete(); });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error deleting project',
          description: 'Delete failed',
          variant: 'destructive',
        });
      });
    });
  });

  describe('refreshLists', () => {
    it('should refresh companies and artists lists', async () => {

      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: mockProject, error: null });

      const newCompanies = [{ name: 'New Company 1' }, { name: 'New Company 2' }];
      const newArtists = [{ name: 'New Artist 1' }];

      const mockCollection = vi.fn().mockImplementation((collection) => ({
        getList: vi.fn().mockResolvedValue({
          items: collection === 'companies' ? newCompanies : newArtists,
        }),
      }));

      vi.mocked(pb.collection).mockImplementation(mockCollection);

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { await result.current.refreshLists(); });

      expect(result.current.companies).toEqual(['New Company 1', 'New Company 2']);
      expect(result.current.artists).toEqual(['New Artist 1']);
    });

    it('should handle refresh error gracefully', async () => {
      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: mockProject, error: null });
      vi.mocked(pb.collection).mockImplementation(() => ({
        getList: vi.fn().mockRejectedValue(new Error('Refresh failed')),
      }));

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { await result.current.refreshLists(); });

      expect(result.current.companies).toEqual([]);
      expect(result.current.artists).toEqual([]);
    });

    it('should not refresh when user is not available', async () => {
      const mockUseAuth = vi.mocked(await import('../useAuth')).useAuth;
      vi.mocked(useAuth).mockReturnValue({ user: null as any, isLoading: false });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await act(async () => { await result.current.refreshLists(); });

      expect(pb.collection).not.toHaveBeenCalled();
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle component unmount during loading', async () => {
      let resolveProject: (value: unknown) => void;
      const projectPromise = new Promise(resolve => { resolveProject = resolve; });

      vi.mocked(projectService.fetchProject).mockReturnValue(projectPromise as any);

      const { result, unmount } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      expect(result.current.loading).toBe(true);

      unmount();
      act(() => { resolveProject!({ data: mockProject, error: null }); });
    });

    it('should handle multiple rapid handleFormChange calls', async () => {
      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: mockProject, error: null });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.handleFormChange({ title: 'Update 1' });
        result.current.handleFormChange({ title: 'Update 2' });
        result.current.handleFormChange({ title: 'Update 3' });
      });

      expect(result.current.formData?.title).toBe('Update 3');
      expect(result.current.isDirty).toBe(true);
    });

    it('should handle operations with missing project data', async () => {
      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await act(async () => {
        await result.current.handleArchive();
        await result.current.handleDelete();
      });
      expect(mockConfirmArchive).not.toHaveBeenCalled();
      expect(mockConfirmDelete).not.toHaveBeenCalled();
    });

    it('should handle concurrent operations', async () => {
      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: mockProject, error: null });
      vi.mocked(projectService.updateProject).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: mockProject, error: null }), 100))
      );

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      const formData = {
        title: 'Concurrent Update',
        status: 'wishlist' as const,
        company: '',
        artist: '',
        drillShape: '',
        totalDiamonds: 0,
        generalNotes: '',
        sourceUrl: '',
        imageUrl: '',
        imageFile: null,
        width: '',
        height: '',
        datePurchased: '',
        dateReceived: '',
        dateStarted: '',
        dateCompleted: '',
        tags: [],
        userId: 'user-123',
        kit_category: 'full' as const,
      };

      const operations = [result.current.handleSubmit(formData), result.current.handleSubmit(formData)];
      await act(async () => { await Promise.all(operations); });

      expect(projectService.updateProject).toHaveBeenCalledTimes(2);
    });

    it('should handle malformed tag data', async () => {
      const projectWithMalformedTags = { ...mockProject, tags: null };
      vi.mocked(projectService.fetchProject).mockResolvedValue({ data: projectWithMalformedTags as any, error: null });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.formData?.tags || []).toEqual([]);
    });
  });
});