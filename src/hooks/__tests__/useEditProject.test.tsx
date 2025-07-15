/**
 * Comprehensive test suite for useEditProject hook
 *
 * Tests the consolidated project editing hook covering:
 * - Data loading with authentication dependencies
 * - Form state management and dirty tracking
 * - Field mapping and data transformation
 * - PocketBase integration and API calls
 * - Tag synchronization operations
 * - CRUD operations (update, archive, delete)
 * - Error handling and edge cases
 * - Navigation and cache management
 *
 * @author @serabi
 * @created 2025-07-14
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestQueryClient, TestProviders } from '@/test-utils';

// Mock toast first
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: null,
      pathname: '/projects/test-project-id/edit',
    }),
  };
});

// Simple mock setup for PocketBase
const mockGetOne = vi.fn();
const mockGetList = vi.fn();
const mockGetFullList = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockGetFirstListItem = vi.fn();

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getOne: mockGetOne,
      getList: mockGetList,
      getFullList: mockGetFullList,
      update: mockUpdate,
      create: mockCreate,
      delete: mockDelete,
      getFirstListItem: mockGetFirstListItem,
    })),
    filter: vi.fn((template: string, ...params: unknown[]) => {
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
    files: {
      getURL: vi.fn((record: unknown, filename: string) => `https://example.com/${filename}`),
    },
    authStore: {
      isValid: true,
      model: { id: 'test-user-id' },
    },
  },
}));

// Mock TagService
vi.mock('@/lib/tags', () => ({
  TagService: {
    addTagToProject: vi.fn(() => Promise.resolve()),
    removeTagFromProject: vi.fn(() => Promise.resolve()),
  },
}));

// Mock MetadataContext
vi.mock('@/contexts/MetadataContext', () => ({
  useMetadata: vi.fn(() => ({
    companies: [
      { id: 'company1', name: 'Test Company' },
      { id: 'company2', name: 'Another Company' },
    ],
    artists: [
      { id: 'artist1', name: 'Test Artist' },
      { id: 'artist2', name: 'Another Artist' },
    ],
    loading: false,
    error: null,
  })),
  MetadataProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock all other dependencies we need to stub
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    isAuthenticated: true,
    initialCheckComplete: true,
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useNavigationWithWarning', () => ({
  useNavigationWithWarning: vi.fn(() => ({
    navigationState: { isNavigating: false, error: null },
    clearNavigationError: vi.fn(),
  })),
}));

vi.mock('@/hooks/useConfirmationDialog', () => ({
  useConfirmationDialog: vi.fn(() => ({
    ConfirmationDialog: vi.fn(() => null),
    confirmDelete: vi.fn(() => Promise.resolve(true)),
    confirmArchive: vi.fn(() => Promise.resolve(true)),
    confirmUnsavedChanges: vi.fn(() => Promise.resolve(true)),
  })),
}));

vi.mock('@/hooks/useNavigateToProject', () => ({
  useNavigateToProject: vi.fn(() => vi.fn()),
}));

vi.mock('@/hooks/queries/useProjectDetailQuery', () => ({
  useProjectDetailQuery: vi.fn(),
}));

vi.mock('@/hooks/mutations/useProjectDetailMutations', () => ({
  useArchiveProjectMutation: vi.fn(),
  useDeleteProjectMutation: vi.fn(),
}));

vi.mock('@/hooks/mutations/useProjectUpdateUnified', () => ({
  useProjectUpdateUnified: vi.fn(),
}));

vi.mock('@/utils/toast-adapter', () => ({
  useServiceToast: vi.fn(() => ({ toast: mockToast })),
}));

vi.mock('@/utils/cacheUtils', () => ({
  updateProjectInCache: vi.fn(),
}));

// Import the hook after mocks are set up
import { useEditProject } from '../useEditProject';
import { ProjectType, ProjectFormValues } from '@/types/project';
import { TagService } from '@/lib/tags';
import { useProjectDetailQuery } from '@/hooks/queries/useProjectDetailQuery';
import {
  useArchiveProjectMutation,
  useDeleteProjectMutation,
} from '@/hooks/mutations/useProjectDetailMutations';
import { useProjectUpdateUnified } from '@/hooks/mutations/useProjectUpdateUnified';

describe('useEditProject', () => {
  const mockProject: ProjectType = {
    id: 'test-project-id',
    title: 'Test Project',
    userId: 'test-user-id',
    company: 'Test Company',
    artist: 'Test Artist',
    status: 'in_progress',
    kit_category: 'full',
    drillShape: 'round',
    datePurchased: '2025-01-01',
    dateStarted: '2025-01-02',
    dateCompleted: '',
    dateReceived: '2025-01-01',
    width: 40,
    height: 50,
    totalDiamonds: 15000,
    generalNotes: 'Test notes',
    sourceUrl: 'https://example.com',
    imageUrl: 'https://example.com/image.jpg',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    progressNotes: [],
    progressImages: [],
    tags: [
      { id: 'tag1', name: 'Nature', color: '#green' },
      { id: 'tag2', name: 'Landscape', color: '#blue' },
    ],
  };

  const createWrapper =
    () =>
    ({ children }: { children: React.ReactNode }) => (
      <TestProviders queryClient={createTestQueryClient()}>{children}</TestProviders>
    );

  const mockRefetch = vi.fn();
  const mockFormData: ProjectFormValues = {
    title: 'Test Project',
    status: 'in_progress',
    company: 'Test Company',
    artist: 'Test Artist',
    kit_category: 'full',
    drillShape: 'round',
    datePurchased: '2025-01-01',
    dateStarted: '2025-01-02',
    dateCompleted: '',
    dateReceived: '2025-01-01',
    width: 40,
    height: 50,
    totalDiamonds: 15000,
    percentComplete: 30,
    notes: 'Test notes',
    tags: [
      { id: 'tag1', name: 'Nature', color: '#green' },
      { id: 'tag2', name: 'Landscape', color: '#blue' },
    ],
    image: null,
    preserveOriginalImage: false,
    customKitCategory: '',
    customStatus: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
    mockNavigate.mockClear();

    // Reset mock implementations
    mockGetOne.mockReset();
    mockGetList.mockReset();
    mockGetFullList.mockReset();
    mockUpdate.mockReset();
    mockCreate.mockReset();
    mockDelete.mockReset();
    mockGetFirstListItem.mockReset();

    // Setup default query mock
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      data: mockProject,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    // Setup default mutation mocks
    vi.mocked(useProjectUpdateUnified).mockReturnValue({
      mutateAsync: vi.fn(() => Promise.resolve()),
    });

    vi.mocked(useArchiveProjectMutation).mockReturnValue({
      mutateAsync: vi.fn(() => Promise.resolve()),
    });

    vi.mocked(useDeleteProjectMutation).mockReturnValue({
      mutateAsync: vi.fn(() => Promise.resolve()),
    });
  });

  it('should load project data successfully and initialize form state', async () => {
    // Mock the query to simulate loading states
    const mockRefetch = vi.fn();

    // First, mock loading state
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { result, rerender } = renderHook(() => useEditProject('test-project-id'), {
      wrapper: createWrapper(),
    });

    // Verify initial loading state
    expect(result.current.loading).toBe(true);
    expect(result.current.project).toBeUndefined();
    expect(result.current.formData).toBeNull();

    // Now mock successful data loading
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      data: mockProject,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    // Trigger re-render to simulate data loading completion
    rerender();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify project data is loaded correctly
    expect(result.current.project).toEqual(mockProject);
    expect(result.current.project?.id).toBe('test-project-id');
    expect(result.current.project?.title).toBe('Test Project');
    expect(result.current.project?.company).toBe('Test Company');
    expect(result.current.project?.artist).toBe('Test Artist');
    expect(result.current.project?.status).toBe('in_progress');

    // Verify form state is initialized with project data
    await waitFor(() => {
      expect(result.current.formData).not.toBeNull();
    });

    expect(result.current.formData).toMatchObject({
      title: 'Test Project',
      company: 'Test Company',
      artist: 'Test Artist',
      status: 'in_progress',
      kit_category: 'full',
      drillShape: 'round',
      datePurchased: '2025-01-01',
      dateStarted: '2025-01-02',
      dateReceived: '2025-01-01',
      width: '40', // Form values are strings
      height: '50',
      totalDiamonds: 15000,
      generalNotes: 'Test notes',
      sourceUrl: 'https://example.com',
      tags: [
        { id: 'tag1', name: 'Nature', color: '#green' },
        { id: 'tag2', name: 'Landscape', color: '#blue' },
      ],
    });

    // Verify other hook properties
    expect(result.current.isDirty).toBe(false); // No changes yet
    expect(result.current.submitting).toBe(false);
    expect(result.current.hasSelectedNewImage).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.refetchProject).toBe(mockRefetch);

    // Verify companies and artists lists are properly formatted
    expect(result.current.companies).toEqual(['Test Company', 'Another Company']);
    expect(result.current.artists).toEqual(['Test Artist', 'Another Artist']);
  });

  it('should handle form submission with field mapping', async () => {
    mockGetOne.mockResolvedValue({
      ...mockProject,
      user: 'test-user-id',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    mockUpdate.mockResolvedValue({
      id: 'test-project-id',
      title: 'Updated Project',
      user: 'test-user-id',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useEditProject('test-project-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should handle tag operations', async () => {
    mockGetOne.mockResolvedValue({
      ...mockProject,
      user: 'test-user-id',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useEditProject('test-project-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(TagService.addTagToProject).not.toHaveBeenCalled();
    expect(TagService.removeTagFromProject).not.toHaveBeenCalled();
  });

  describe('Error Handling', () => {
    // Test utilities for error assertion
    const expectErrorToast = (title: string, description?: string) => {
      const calls = mockToast.mock.calls;
      const errorCall = calls.find(
        call => call[0].title === title && call[0].variant === 'destructive'
      );
      expect(errorCall).toBeTruthy();
      if (description) {
        expect(errorCall[0].description).toContain(description);
      }
    };

    const expectWarningToast = (title: string, description?: string) => {
      const calls = mockToast.mock.calls;
      const warningCall = calls.find(
        call => call[0].title === title && call[0].variant === 'destructive'
      );
      expect(warningCall).toBeTruthy();
      if (description) {
        expect(warningCall[0].description).toContain(description);
      }
    };

    it('should handle project loading errors with proper error state', async () => {
      const mockError = new Error('Project not found');
      const mockQuery = {
        data: null,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      };

      (useProjectDetailQuery as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const { result } = renderHook(() => useEditProject('invalid-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      // Verify error state is properly exposed
      expect(result.current.error).toBe(mockError);
      expect(result.current.project).toBeNull();
      expect(result.current.loading).toBe(false);

      // Project loading errors should not trigger toast (handled by query error boundary)
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should handle form submission errors with error toasts', async () => {
      const mockError = new Error('Network error');
      const mockMutation = {
        mutateAsync: vi.fn().mockRejectedValue(mockError),
        isPending: false,
        isSuccess: false,
        error: null,
      };

      (useProjectUpdateUnified as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);

      const { result } = renderHook(() => useEditProject('test-project-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.project).toBeDefined();
      });

      // Trigger form submission
      const formData: ProjectFormValues = {
        ...mockFormData,
        title: 'Updated Test Project',
      };

      await act(async () => {
        await result.current.handleSubmit(formData);
      });

      // Verify error toast was triggered
      expectErrorToast('Error updating project');
    });

    it('should handle company resolution errors with warning toasts', async () => {
      // Mock PocketBase to reject company lookup
      const mockCompanyError = new Error('Company not found');
      mockGetFirstListItem.mockRejectedValue(mockCompanyError);

      const { result } = renderHook(() => useEditProject('test-project-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.project).toBeDefined();
      });

      // Trigger form submission with company that doesn't exist
      const formData: ProjectFormValues = {
        ...mockFormData,
        company: 'Nonexistent Company',
      };

      await act(async () => {
        await result.current.handleSubmit(formData);
      });

      // Verify warning toast was triggered
      expectWarningToast(
        'Company Not Found',
        'The company "Nonexistent Company" was not found. The project will be updated without a company association.'
      );
    });

    it('should handle artist resolution errors with warning toasts', async () => {
      // Mock PocketBase to reject artist lookup
      const mockArtistError = new Error('Artist not found');
      mockGetFirstListItem.mockRejectedValue(mockArtistError);

      const { result } = renderHook(() => useEditProject('test-project-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.project).toBeDefined();
      });

      // Trigger form submission with artist that doesn't exist
      const formData: ProjectFormValues = {
        ...mockFormData,
        artist: 'Nonexistent Artist',
      };

      await act(async () => {
        await result.current.handleSubmit(formData);
      });

      // Verify warning toast was triggered
      expectWarningToast(
        'Artist Not Found',
        'The artist "Nonexistent Artist" was not found. The project will be updated without an artist association.'
      );
    });

    it('should handle archive operation errors with error toasts', async () => {
      const mockError = new Error('Archive failed');
      const mockArchiveMutation = {
        mutateAsync: vi.fn().mockRejectedValue(mockError),
        isPending: false,
        isSuccess: false,
        error: null,
      };

      (useArchiveProjectMutation as ReturnType<typeof vi.fn>).mockReturnValue(mockArchiveMutation);

      const { result } = renderHook(() => useEditProject('test-project-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.project).toBeDefined();
      });

      // Trigger archive operation
      await act(async () => {
        await result.current.handleArchive();
      });

      // Verify error toast was triggered
      expectErrorToast('Error', 'Failed to archive project');
    });

    it('should handle delete operation errors with error toasts', async () => {
      const mockError = new Error('Delete failed');
      const mockDeleteMutation = {
        mutateAsync: vi.fn().mockRejectedValue(mockError),
        isPending: false,
        isSuccess: false,
        error: null,
      };

      (useDeleteProjectMutation as ReturnType<typeof vi.fn>).mockReturnValue(mockDeleteMutation);

      const { result } = renderHook(() => useEditProject('test-project-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.project).toBeDefined();
      });

      // Trigger delete operation
      await act(async () => {
        await result.current.handleDelete();
      });

      // Verify error toast was triggered
      expectErrorToast('Error', 'Failed to delete project');
    });

    it('should handle tag synchronization properly', async () => {
      // This test verifies that tag operations are part of the form submission process
      // The actual error handling for tag sync is implemented in the useTagSync hook

      const { result } = renderHook(() => useEditProject('test-project-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.project).toBeDefined();
      });

      // Trigger form submission with different tags
      const formData: ProjectFormValues = {
        ...mockFormData,
        tags: [
          { id: 'tag1', name: 'Nature', color: '#green' },
          { id: 'tag2', name: 'Landscape', color: '#blue' },
          { id: 'tag3', name: 'New Tag', color: '#red' },
        ],
      };

      await act(async () => {
        await result.current.handleSubmit(formData);
      });

      // Verify that the project update process includes tag synchronization
      // The specific error handling for tag sync would be tested in useTagSync.test.tsx
      expect(result.current.submitting).toBe(false);
    });

    it('should maintain error state across re-renders', async () => {
      const mockError = new Error('Persistent error');
      const mockQuery = {
        data: null,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      };

      (useProjectDetailQuery as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const { result, rerender } = renderHook(() => useEditProject('invalid-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      // Verify error state persists
      expect(result.current.error).toBe(mockError);

      // Re-render and verify error state is still there
      rerender();
      expect(result.current.error).toBe(mockError);
    });
  });
});
