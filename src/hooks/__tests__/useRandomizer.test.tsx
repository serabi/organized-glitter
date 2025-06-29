import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRandomizer } from '../useRandomizer';
import { useProjects } from '@/hooks/queries/useProjects';
import { useCreateSpin } from '@/hooks/mutations/useCreateSpin';
import { useSpinHistoryCount } from '@/hooks/queries/useSpinHistoryCount';
import { useAuth } from '@/hooks/useAuth';
import { Project } from '@/types/project';

// Mock dependencies
vi.mock('@/hooks/queries/useProjects');
vi.mock('@/hooks/mutations/useCreateSpin');
vi.mock('@/hooks/queries/useSpinHistoryCount');
vi.mock('@/hooks/useAuth');
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockUseProjects = vi.mocked(useProjects);
const mockUseCreateSpin = vi.mocked(useCreateSpin);
const mockUseSpinHistoryCount = vi.mocked(useSpinHistoryCount);
const mockUseAuth = vi.mocked(useAuth);

const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Project 1',
    user: 'user1',
    status: 'progress',
    kit_category: 'full',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Project 2',
    user: 'user1',
    status: 'progress',
    kit_category: 'mini',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    title: 'Project 3',
    user: 'user1',
    status: 'progress',
    kit_category: 'full',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
  },
];

describe('useRandomizer', () => {
  const mockMutateAsync = vi.fn();
  const mockUser = { id: 'user1', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    } as any);

    mockUseProjects.mockReturnValue({
      data: {
        projects: mockProjects,
        totalCount: mockProjects.length,
        hasNextPage: false,
      },
      isLoading: false,
      error: null,
    } as any);

    mockUseSpinHistoryCount.mockReturnValue({
      data: 0, // Default to zero spin count
      isLoading: false,
      error: null,
    } as any);

    mockUseCreateSpin.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    } as any);
  });

  describe('Initial State', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useRandomizer());

      expect(result.current.availableProjects).toEqual(mockProjects);
      expect(result.current.selectedProjects).toEqual([]);
      expect(result.current.selectedProjectIds).toEqual(new Set());
      expect(result.current.lastSpinResult).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoadingProjects).toBe(false);
      expect(result.current.isCreatingSpin).toBe(false);
    });

    it('calculates stats correctly for initial state', () => {
      const { result } = renderHook(() => useRandomizer());

      expect(result.current.stats).toEqual({
        totalProjects: 3,
        selectedCount: 0,
        canSpin: false,
        recentSpins: 0,
        hasProjects: true,
        hasSelection: false,
      });
    });
  });

  describe('Project Selection', () => {
    it('toggles project selection', () => {
      const { result } = renderHook(() => useRandomizer());

      act(() => {
        result.current.toggleProject('1');
      });

      expect(result.current.selectedProjectIds).toEqual(new Set(['1']));
      expect(result.current.selectedProjects).toEqual([mockProjects[0]]);
      expect(result.current.stats.selectedCount).toBe(1);
      expect(result.current.stats.hasSelection).toBe(true);
      expect(result.current.stats.canSpin).toBe(false); // Need at least 2
    });

    it('toggles project off when already selected', () => {
      const { result } = renderHook(() => useRandomizer());

      act(() => {
        result.current.toggleProject('1');
      });

      expect(result.current.selectedProjectIds).toEqual(new Set(['1']));

      act(() => {
        result.current.toggleProject('1');
      });

      expect(result.current.selectedProjectIds).toEqual(new Set());
      expect(result.current.selectedProjects).toEqual([]);
    });

    it('allows spinning when 2 or more projects selected', () => {
      const { result } = renderHook(() => useRandomizer());

      act(() => {
        result.current.toggleProject('1');
        result.current.toggleProject('2');
      });

      expect(result.current.stats.canSpin).toBe(true);
      expect(result.current.stats.selectedCount).toBe(2);
    });

    it('selects all projects', () => {
      const { result } = renderHook(() => useRandomizer());

      act(() => {
        result.current.selectAllProjects();
      });

      expect(result.current.selectedProjectIds).toEqual(new Set(['1', '2', '3']));
      expect(result.current.selectedProjects).toEqual(mockProjects);
      expect(result.current.stats.selectedCount).toBe(3);
      expect(result.current.stats.canSpin).toBe(true);
    });

    it('deselects all projects', () => {
      const { result } = renderHook(() => useRandomizer());

      // First select some projects
      act(() => {
        result.current.selectAllProjects();
      });

      expect(result.current.selectedProjectIds.size).toBe(3);

      // Then deselect all
      act(() => {
        result.current.selectNoProjects();
      });

      expect(result.current.selectedProjectIds).toEqual(new Set());
      expect(result.current.selectedProjects).toEqual([]);
      expect(result.current.stats.selectedCount).toBe(0);
      expect(result.current.stats.canSpin).toBe(false);
    });
  });

  describe('Spin Handling', () => {
    it('handles spin completion successfully', async () => {
      mockMutateAsync.mockResolvedValue({});

      const { result } = renderHook(() => useRandomizer());

      // Select some projects first
      act(() => {
        result.current.toggleProject('1');
        result.current.toggleProject('2');
      });

      const selectedProject = mockProjects[0];

      await act(async () => {
        await result.current.handleSpinComplete(selectedProject);
      });

      expect(result.current.lastSpinResult).toEqual(selectedProject);
      expect(mockMutateAsync).toHaveBeenCalledWith({
        user: 'user1',
        project: '1',
        project_title: 'Project 1',
        selected_projects: ['1', '2'],
      });
    });

    it('handles spin completion when user is not available', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      } as any);

      const { result } = renderHook(() => useRandomizer());

      const selectedProject = mockProjects[0];

      await act(async () => {
        await result.current.handleSpinComplete(selectedProject);
      });

      expect(result.current.lastSpinResult).toEqual(selectedProject);
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('handles spin creation error gracefully', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRandomizer());

      act(() => {
        result.current.toggleProject('1');
        result.current.toggleProject('2');
      });

      const selectedProject = mockProjects[0];

      await act(async () => {
        await result.current.handleSpinComplete(selectedProject);
      });

      expect(result.current.lastSpinResult).toEqual(selectedProject);
      expect(mockMutateAsync).toHaveBeenCalled();
      // Should not throw error, should handle gracefully
    });

    it('clears last spin result', () => {
      const { result } = renderHook(() => useRandomizer());

      // Set a result first
      act(() => {
        result.current.handleSpinComplete(mockProjects[0]);
      });

      expect(result.current.lastSpinResult).toEqual(mockProjects[0]);

      // Clear it
      act(() => {
        result.current.clearLastResult();
      });

      expect(result.current.lastSpinResult).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('reflects projects loading state', () => {
      mockUseProjects.mockReturnValue({
        data: { projects: [], totalCount: 0, hasNextPage: false },
        isLoading: true,
        error: null,
      } as any);

      const { result } = renderHook(() => useRandomizer());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isLoadingProjects).toBe(true);
    });

    it('reflects spin creation loading state', () => {
      mockUseCreateSpin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        error: null,
      } as any);

      const { result } = renderHook(() => useRandomizer());

      expect(result.current.isCreatingSpin).toBe(true);
    });
  });

  describe('Error States', () => {
    it('returns projects error', () => {
      const projectsError = new Error('Failed to load projects');
      mockUseProjects.mockReturnValue({
        data: { projects: [], totalCount: 0, hasNextPage: false },
        isLoading: false,
        error: projectsError,
      } as any);

      const { result } = renderHook(() => useRandomizer());

      expect(result.current.error).toBe(projectsError);
    });

    it('returns spin creation error', () => {
      const spinError = new Error('Failed to create spin');
      mockUseCreateSpin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: spinError,
      } as any);

      const { result } = renderHook(() => useRandomizer());

      expect(result.current.spinError).toBe(spinError);
    });
  });

  describe('Stats Calculation', () => {
    it('calculates stats correctly with no projects', () => {
      mockUseProjects.mockReturnValue({
        data: { projects: [], totalCount: 0, hasNextPage: false },
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useRandomizer());

      expect(result.current.stats).toEqual({
        totalProjects: 0,
        selectedCount: 0,
        canSpin: false,
        recentSpins: 0,
        hasProjects: false,
        hasSelection: false,
      });
    });

    it('calculates stats correctly with partial selection', () => {
      const { result } = renderHook(() => useRandomizer());

      act(() => {
        result.current.toggleProject('1');
      });

      expect(result.current.stats).toEqual({
        totalProjects: 3,
        selectedCount: 1,
        canSpin: false, // Need at least 2
        recentSpins: 0,
        hasProjects: true,
        hasSelection: true,
      });
    });

    it('calculates stats correctly with minimum for spinning', () => {
      const { result } = renderHook(() => useRandomizer());

      act(() => {
        result.current.toggleProject('1');
        result.current.toggleProject('2');
      });

      expect(result.current.stats).toEqual({
        totalProjects: 3,
        selectedCount: 2,
        canSpin: true,
        recentSpins: 0,
        hasProjects: true,
        hasSelection: true,
      });
    });
  });

  describe('Project Filtering', () => {
    it('filters projects to only in-progress status', () => {
      const projectsWithMixedStatus = [
        ...mockProjects,
        {
          id: '4',
          title: 'Completed Project',
          user: 'user1',
          status: 'completed' as const,
          kit_category: 'full' as const,
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
        },
      ];

      mockUseProjects.mockReturnValue({
        data: {
          projects: projectsWithMixedStatus,
          totalCount: projectsWithMixedStatus.length,
          hasNextPage: false,
        },
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useRandomizer());

      // Should only include the first 3 projects (in-progress)
      expect(result.current.availableProjects).toEqual(mockProjects);
    });

    it('uses correct query parameters for projects', () => {
      renderHook(() => useRandomizer());

      expect(mockUseProjects).toHaveBeenCalledWith({
        userId: 'user1',
        filters: { status: 'progress' },
        sortField: 'last_updated',
        sortDirection: 'desc',
        currentPage: 1,
        pageSize: 100,
      });
    });
  });

  describe('Utility Functions', () => {
    it('formatProjectsForWheel returns selected projects', () => {
      const { result } = renderHook(() => useRandomizer());

      act(() => {
        result.current.toggleProject('1');
        result.current.toggleProject('3');
      });

      const formattedProjects = result.current.formatProjectsForWheel();
      expect(formattedProjects).toEqual([mockProjects[0], mockProjects[2]]);
    });
  });

  describe('Memoization', () => {
    it('memoizes available projects correctly', () => {
      const { result, rerender } = renderHook(() => useRandomizer());

      const firstAvailableProjects = result.current.availableProjects;

      // Rerender without changing projects data
      rerender();

      const secondAvailableProjects = result.current.availableProjects;
      expect(firstAvailableProjects).toBe(secondAvailableProjects);
    });

    it('memoizes selected projects correctly', () => {
      const { result } = renderHook(() => useRandomizer());

      act(() => {
        result.current.toggleProject('1');
      });

      const firstSelectedProjects = result.current.selectedProjects;

      // Same selection should return same reference
      const secondSelectedProjects = result.current.selectedProjects;
      expect(firstSelectedProjects).toBe(secondSelectedProjects);
    });

    it('memoizes stats correctly', () => {
      const { result } = renderHook(() => useRandomizer());

      const firstStats = result.current.stats;
      const secondStats = result.current.stats;

      expect(firstStats).toBe(secondStats);
    });
  });
});
