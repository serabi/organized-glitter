import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  };
});

// Simple mock setup
const mockGetOne = vi.fn();
const mockGetList = vi.fn();
const mockGetFullList = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getOne: mockGetOne,
      getList: mockGetList,
      getFullList: mockGetFullList,
      update: mockUpdate,
      create: mockCreate,
      delete: mockDelete,
    })),
    files: {
      getURL: vi.fn((record: unknown, filename: string) => `https://example.com/${filename}`),
    },
    authStore: {
      isValid: true,
      model: { id: 'user123' },
    },
  },
}));

// Import the hook after mocks are set up
import { useProjectDetail } from '../useProjectDetail';
import { ProjectType } from '@/types/project';

describe('useProjectDetail', () => {
  const mockProject: ProjectType = {
    id: 'project123',
    title: 'Test Project',
    userId: 'user123',
    status: 'progress',
    company: 'Test Company',
    artist: 'Test Artist',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const createWrapper =
    () =>
    ({ children }: { children: React.ReactNode }) => (
      <TestProviders queryClient={createTestQueryClient()}>{children}</TestProviders>
    );

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
  });

  it('should fetch project successfully', async () => {
    // Mock project data
    mockGetOne.mockResolvedValue({
      ...mockProject,
      user: 'user123',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    // Mock progress notes data
    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 100,
      totalItems: 0,
      totalPages: 1,
      items: [],
    });

    const { result } = renderHook(() => useProjectDetail('project123'), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 }
    );

    expect(result.current.project).toEqual(
      expect.objectContaining({
        id: 'project123',
        title: 'Test Project',
      })
    );

    expect(mockGetOne).toHaveBeenCalledWith('project123', {
      expand: 'company,artist,project_tags_via_project.tag',
      requestKey: 'project-detail-project123',
    });
  });

  it('should handle missing project ID', async () => {
    const { result } = renderHook(() => useProjectDetail(undefined), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.project).toBe(null);
    expect(mockGetOne).not.toHaveBeenCalled();
  });

  it('should handle project fetch error', async () => {
    const mockError = new Error('Project not found');
    mockGetOne.mockRejectedValue(mockError);

    const { result } = renderHook(() => useProjectDetail('invalid-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.project).toBe(null);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to load project details',
      variant: 'destructive',
    });
  });

  it('should update project status successfully', async () => {
    const updatedProject = { ...mockProject, status: 'completed' as const };

    mockGetOne.mockResolvedValue({
      ...mockProject,
      user: 'user123',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 100,
      totalItems: 0,
      totalPages: 1,
      items: [],
    });

    mockUpdate.mockResolvedValue({
      ...updatedProject,
      user: 'user123',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useProjectDetail('project123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: boolean;
    await act(async () => {
      success = await result.current.handleUpdateStatus('completed');
    });

    expect(success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith('project123', {
      status: 'completed',
    });
  });

  it('should update project notes successfully', async () => {
    mockGetOne.mockResolvedValue({
      ...mockProject,
      user: 'user123',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 100,
      totalItems: 0,
      totalPages: 1,
      items: [],
    });

    mockUpdate.mockResolvedValue({
      ...mockProject,
      general_notes: 'Updated notes',
      user: 'user123',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useProjectDetail('project123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleUpdateNotes('Updated notes');
    });

    expect(mockUpdate).toHaveBeenCalledWith('project123', {
      general_notes: 'Updated notes',
    });
  });

  it('should add progress note successfully', async () => {
    mockGetOne.mockResolvedValue({
      ...mockProject,
      user: 'user123',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 100,
      totalItems: 0,
      totalPages: 1,
      items: [],
    });

    const mockProgressNote = {
      id: 'note123',
      project: 'project123',
      content: 'New progress note',
      date: '2025-01-02',
      created: '2025-01-02T00:00:00Z',
      updated: '2025-01-02T00:00:00Z',
    };

    mockCreate.mockResolvedValue(mockProgressNote);

    const { result } = renderHook(() => useProjectDetail('project123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleAddProgressNote({
        date: '2025-01-02',
        content: 'New progress note',
      });
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.any(FormData));
  });

  it('should delete project successfully', async () => {
    mockGetOne.mockResolvedValue({
      ...mockProject,
      user: 'user123',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 100,
      totalItems: 0,
      totalPages: 1,
      items: [],
    });

    mockGetFullList.mockResolvedValue([]);
    mockDelete.mockResolvedValue(true);

    const { result } = renderHook(() => useProjectDetail('project123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockDelete).toHaveBeenCalledWith('project123');

    // Wait for the setTimeout navigation call (500ms delay)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should provide status utilities', async () => {
    mockGetOne.mockResolvedValue({
      ...mockProject,
      user: 'user123',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 100,
      totalItems: 0,
      totalPages: 1,
      items: [],
    });

    const { result } = renderHook(() => useProjectDetail('project123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getStatusLabel('progress')).toBe('In Progress');
    expect(result.current.getStatusColor('completed')).toContain('indigo');
  });

  it('should handle archive functionality', async () => {
    mockGetOne.mockResolvedValue({
      ...mockProject,
      user: 'user123',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    mockGetList.mockResolvedValue({
      page: 1,
      perPage: 100,
      totalItems: 0,
      totalPages: 1,
      items: [],
    });

    mockUpdate.mockResolvedValue({
      ...mockProject,
      status: 'archived',
      user: 'user123',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useProjectDetail('project123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleArchive();
    });

    expect(mockUpdate).toHaveBeenCalledWith('project123', {
      status: 'archived',
    });
  });
});
