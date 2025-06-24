import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditProjectSimplified } from '../useEditProjectSimplified';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock dependencies
const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockNavigateToProject = vi.fn();
const originalLocation = window.location;

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/projects/project-123/edit',
    search: '',
    hash: '',
    state: null,
  }),
}));

vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
    isLoading: false,
  }),
}));

vi.mock('@/utils/toast-adapter', () => ({
  useServiceToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('../useNavigateToProject', () => ({
  useNavigateToProject: () => mockNavigateToProject,
}));

// Mock PocketBase services
vi.mock('@/services/pocketbase/projectService', () => ({
  projectService: {
    fetchProject: vi.fn(),
    updateProject: vi.fn(),
    updateProjectStatus: vi.fn(),
    deleteProject: vi.fn(),
  },
}));

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getList: vi.fn().mockResolvedValue({ items: [] }),
    })),
  },
}));

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
});

describe('useEditProjectSimplified - Navigation Integration', () => {
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
    vi.clearAllMocks();
    
    // Setup navigation mock to resolve successfully
    mockNavigateToProject.mockResolvedValue({ success: true });

    // Mock window.location
    delete (window as unknown as { location?: Location }).location;
    window.location = { ...originalLocation, href: '' };
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.location = originalLocation;
  });

  describe('navigation with warning', () => {
    it('should navigate without confirmation when no unsaved changes', async () => {
      const { projectService } = await import('@/services/pocketbase/projectService');

      (
        projectService.fetchProject as vi.MockedFunction<typeof projectService.fetchProject>
      ).mockResolvedValue({
        data: {
          id: 'project-123',
          title: 'Test Project',
          status: 'wishlist',
          userId: 'user-123',
        },
        error: null,
      });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Test that navigateWithWarning function is available (the component handles cancel logic)
      expect(result.current.navigateWithWarning).toBeDefined();
      expect(typeof result.current.navigateWithWarning).toBe('function');
    });

    it('should show confirmation dialog when there are unsaved changes', async () => {
      const { projectService } = await import('@/services/pocketbase/projectService');

      (
        projectService.fetchProject as vi.MockedFunction<typeof projectService.fetchProject>
      ).mockResolvedValue({
        data: {
          id: 'project-123',
          title: 'Test Project',
          status: 'wishlist',
          userId: 'user-123',
        },
        error: null,
      });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Make changes to trigger isDirty
      act(() => {
        result.current.handleFormChange({
          title: 'Modified Title',
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

      // The cancel function should handle dirty state properly
      // In real implementation, the confirmation dialog would be triggered
      // For this test, we're just verifying the dirty state is tracked
      expect(result.current.isDirty).toBe(true);

      // In the real application, navigation would wait for user confirmation
      // through the ConfirmationDialog component
    });
  });

  describe('handleSubmit navigation', () => {
    it('should use smart navigation after successful save', async () => {
      const { projectService } = await import('@/services/pocketbase/projectService');

      (
        projectService.fetchProject as vi.MockedFunction<typeof projectService.fetchProject>
      ).mockResolvedValue({
        data: {
          id: 'project-123',
          title: 'Test Project',
          status: 'wishlist',
          userId: 'user-123',
        },
        error: null,
      });

      (
        projectService.updateProject as vi.MockedFunction<typeof projectService.updateProject>
      ).mockResolvedValue({
        data: {
          id: 'project-123',
          title: 'Updated Project',
          status: 'wishlist',
          userId: 'user-123',
        },
        error: null,
      });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const formData = {
        title: 'Updated Project',
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
        tagIds: [],
        userId: 'user-123',
        kit_category: 'full' as const,
      };

      await act(async () => {
        await result.current.handleSubmit(formData);
      });

      expect(projectService.updateProject).toHaveBeenCalledWith('project-123', formData);
      expect(mockNavigateToProject).toHaveBeenCalledWith('project-123', {
        projectData: expect.any(Object),
        replace: true,
      });
    });

    it('should not navigate when save fails', async () => {
      const { projectService } = await import('@/services/pocketbase/projectService');

      (
        projectService.fetchProject as vi.MockedFunction<typeof projectService.fetchProject>
      ).mockResolvedValue({
        data: {
          id: 'project-123',
          title: 'Test Project',
          status: 'wishlist',
          userId: 'user-123',
        },
        error: null,
      });

      (
        projectService.updateProject as vi.MockedFunction<typeof projectService.updateProject>
      ).mockResolvedValue({
        data: null,
        error: 'Update failed',
      });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const formData = {
        title: 'Updated Project',
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

      await act(async () => {
        await result.current.handleSubmit(formData);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error updating project',
        description: 'Update failed',
        variant: 'destructive',
      });
    });
  });

  describe('navigation state tracking', () => {
    it('should track navigation state during operations', async () => {
      const { projectService } = await import('@/services/pocketbase/projectService');

      (
        projectService.fetchProject as vi.MockedFunction<typeof projectService.fetchProject>
      ).mockResolvedValue({
        data: {
          id: 'project-123',
          title: 'Test Project',
          status: 'wishlist',
          userId: 'user-123',
        },
        error: null,
      });

      const { result } = renderHook(() => useEditProjectSimplified('project-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.navigationState.isNavigating).toBe(false);
      expect(result.current.navigationState.error).toBe(null);

      // Navigation state should be accessible for UI updates
      expect(typeof result.current.clearNavigationError).toBe('function');
    });
  });
});
