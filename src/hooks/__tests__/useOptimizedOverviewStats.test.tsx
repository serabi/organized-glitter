import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOptimizedOverviewStats } from '../useOptimizedOverviewStats';
import type { ExpandedProjectsResponse } from '@/types/overview-stats';
import type { ArtistsResponse, CompaniesResponse } from '@/types/pocketbase.types';
import {
  Collections,
  ProjectsStatusOptions,
  ProjectsDrillShapeOptions,
} from '@/types/pocketbase.types';

// Mock the PocketBase module
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getFullList: vi.fn(),
    })),
    baseUrl: 'http://localhost:8090',
  },
}));

describe('useOptimizedOverviewStats', () => {
  const mockUserId = 'test-user-123';
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let mockPb: {
    collection: ReturnType<typeof vi.fn>;
    baseUrl: string;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked pb
    const pbModule = await import('@/lib/pocketbase');
    mockPb = pbModule.pb as unknown as {
      collection: ReturnType<typeof vi.fn>;
      baseUrl: string;
    };

    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const createMockProject = (
    overrides: Partial<ExpandedProjectsResponse> = {}
  ): ExpandedProjectsResponse => {
    const currentYear = new Date().getFullYear();
    return {
      id: 'project-1',
      user: mockUserId,
      title: 'Test Project',
      status: 'wishlist',
      date_completed: null,
      date_started: null,
      total_diamonds: null,
      image: null,
      updated: `${currentYear}-01-01 10:00:00`,
      company: null,
      artist: null,
      drill_shape: null,
      width: null,
      height: null,
      date_purchased: null,
      date_received: null,
      general_notes: null,
      source_url: null,
      kit_category: null,
      created: `${currentYear}-01-01 10:00:00`,
      collectionId: 'projects',
      collectionName: 'projects',
      expand: undefined,
      ...overrides,
    } as ExpandedProjectsResponse;
  };

  it('should return initial loading state', () => {
    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.stats).toEqual({
      completedCount: 0,
      estimatedDrills: 0,
      startedCount: 0,
      inProgressCount: 0,
      totalDiamonds: 0,
    });
    expect(result.current.inProgressProjects).toEqual([]);
  });

  it('should not fetch when userId is undefined', () => {
    renderHook(() => useOptimizedOverviewStats(undefined));

    expect(mockPb.collection).not.toHaveBeenCalled();
  });

  it('should fetch and calculate stats correctly', async () => {
    const currentYear = new Date().getFullYear();
    const mockProjects: ExpandedProjectsResponse[] = [
      createMockProject({
        id: 'completed-1',
        status: ProjectsStatusOptions.completed,
        date_completed: `${currentYear}-06-15 10:00:00`,
        date_started: `${currentYear}-01-15 10:00:00`,
        total_diamonds: 1000,
      }),
      createMockProject({
        id: 'completed-2',
        status: ProjectsStatusOptions.completed,
        date_completed: `${currentYear}-07-15 10:00:00`,
        date_started: `${currentYear}-02-15 10:00:00`,
        total_diamonds: 2500,
      }),
      createMockProject({
        id: 'started-1',
        date_started: `${currentYear}-03-01 10:00:00`,
      }),
      createMockProject({
        id: 'progress-1',
        status: ProjectsStatusOptions.progress,
        title: 'In Progress Project 1',
      }),
      createMockProject({
        id: 'progress-2',
        status: ProjectsStatusOptions.progress,
        title: 'In Progress Project 2',
      }),
    ];

    mockPb.collection.mockReturnValue({
      getFullList: vi.fn().mockResolvedValue(mockProjects),
    });

    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      completedCount: 2,
      estimatedDrills: 3500,
      startedCount: 3, // 2 completed + 1 started this year
      inProgressCount: 2,
      totalDiamonds: 3500,
    });

    expect(result.current.inProgressProjects).toHaveLength(2);
    expect(result.current.inProgressProjects[0].title).toBe('In Progress Project 1');
    expect(result.current.error).toBe(null);
  });

  it('should limit in-progress projects to 6 items', async () => {
    const mockProjects: ExpandedProjectsResponse[] = Array.from({ length: 10 }, (_, i) =>
      createMockProject({
        id: `progress-${i}`,
        status: ProjectsStatusOptions.progress,
        title: `Progress Project ${i}`,
      })
    );

    mockPb.collection.mockReturnValue({
      getFullList: vi.fn().mockResolvedValue(mockProjects),
    });

    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats.inProgressCount).toBe(10);
    expect(result.current.inProgressProjects).toHaveLength(6);
  });

  it('should handle projects from previous years correctly', async () => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const mockProjects: ExpandedProjectsResponse[] = [
      createMockProject({
        id: 'completed-this-year',
        status: ProjectsStatusOptions.completed,
        date_completed: `${currentYear}-06-15 10:00:00`,
        date_started: `${currentYear}-01-15 10:00:00`,
        total_diamonds: 1000,
      }),
      createMockProject({
        id: 'completed-last-year',
        status: ProjectsStatusOptions.completed,
        date_completed: `${lastYear}-06-15 10:00:00`,
        total_diamonds: 2000, // Should not be counted
      }),
      createMockProject({
        id: 'started-last-year',
        date_started: `${lastYear}-03-01 10:00:00`,
      }),
    ];

    mockPb.collection.mockReturnValue({
      getFullList: vi.fn().mockResolvedValue(mockProjects),
    });

    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      completedCount: 1, // Only this year
      estimatedDrills: 1000, // Only from this year
      startedCount: 1, // Only this year
      inProgressCount: 0,
      totalDiamonds: 1000,
    });
  });

  it('should handle missing or null diamond counts', async () => {
    const currentYear = new Date().getFullYear();
    const mockProjects: ExpandedProjectsResponse[] = [
      createMockProject({
        id: 'completed-no-diamonds',
        status: ProjectsStatusOptions.completed,
        date_completed: `${currentYear}-06-15 10:00:00`,
        date_started: `${currentYear}-01-15 10:00:00`,
        total_diamonds: undefined,
      }),
      createMockProject({
        id: 'completed-with-diamonds',
        status: ProjectsStatusOptions.completed,
        date_completed: `${currentYear}-07-15 10:00:00`,
        date_started: `${currentYear}-02-15 10:00:00`,
        total_diamonds: 1500,
      }),
    ];

    mockPb.collection.mockReturnValue({
      getFullList: vi.fn().mockResolvedValue(mockProjects),
    });

    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      completedCount: 2,
      estimatedDrills: 1500,
      startedCount: 2,
      inProgressCount: 0,
      totalDiamonds: 1500,
    });
  });

  it('should convert PocketBase projects to ProjectType correctly', async () => {
    const mockProjects: ExpandedProjectsResponse[] = [
      createMockProject({
        id: 'progress-with-expand',
        status: ProjectsStatusOptions.progress,
        title: 'Test Project with Company',
        drill_shape: ProjectsDrillShapeOptions.round,
        width: 40,
        height: 50,
        image: 'test-image.jpg',
        expand: {
          company: {
            id: 'company-1',
            name: 'Test Company',
            created: '2024-01-01 10:00:00',
            updated: '2024-01-01 10:00:00',
            user: mockUserId,
            collectionId: 'companies',
            collectionName: 'companies',
          } as CompaniesResponse,
          artist: {
            id: 'artist-1',
            name: 'Test Artist',
            created: '2024-01-01 10:00:00',
            updated: '2024-01-01 10:00:00',
            user: mockUserId,
            collectionId: 'artists',
            collectionName: 'artists',
          } as ArtistsResponse,
        },
      }),
    ];

    // Mock the pb.baseUrl for image URL construction
    mockPb.baseUrl = 'http://localhost:8090';

    mockPb.collection.mockReturnValue({
      getFullList: vi.fn().mockResolvedValue(mockProjects),
    });

    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const project = result.current.inProgressProjects[0];
    expect(project).toEqual(
      expect.objectContaining({
        id: 'progress-with-expand',
        userId: mockUserId,
        title: 'Test Project with Company',
        company: 'Test Company',
        artist: 'Test Artist',
        drillShape: 'round',
        width: 40,
        height: 50,
        status: ProjectsStatusOptions.progress,
        imageUrl: `http://localhost:8090/api/files/${Collections.Projects}/progress-with-expand/test-image.jpg`,
        progressNotes: [],
        tags: [],
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    const apiError = new Error('API request failed');
    mockPb.collection.mockReturnValue({
      getFullList: vi.fn().mockRejectedValue(apiError),
    });

    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(apiError);
    expect(result.current.stats).toEqual({
      completedCount: 0,
      estimatedDrills: 0,
      startedCount: 0,
      inProgressCount: 0,
      totalDiamonds: 0,
    });
    expect(result.current.inProgressProjects).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching overview stats:', apiError);
  });

  it('should handle non-Error exceptions', async () => {
    const stringError = 'String error message';
    mockPb.collection.mockReturnValue({
      getFullList: vi.fn().mockRejectedValue(stringError),
    });

    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(new Error('Failed to fetch stats'));
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching overview stats:', stringError);
  });

  it('should provide refetch functionality', async () => {
    const mockCollection = {
      getFullList: vi.fn().mockResolvedValue([]),
    };
    mockPb.collection.mockReturnValue(mockCollection);

    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear previous calls
    mockCollection.getFullList.mockClear();

    // Call refetch
    await result.current.refetch();

    expect(mockCollection.getFullList).toHaveBeenCalledTimes(1);
  });

  it('should prevent concurrent fetches', async () => {
    const mockCollection = {
      getFullList: vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
    };
    mockPb.collection.mockReturnValue(mockCollection);

    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    // Trigger multiple refetches rapidly
    const refetch1 = result.current.refetch();
    const refetch2 = result.current.refetch();
    const refetch3 = result.current.refetch();

    await Promise.all([refetch1, refetch2, refetch3]);

    // Should only make one actual API call due to the fetchingRef guard
    expect(mockCollection.getFullList).toHaveBeenCalledTimes(1);
  });

  it('should use correct query parameters for optimization', async () => {
    const currentYear = new Date().getFullYear();
    const mockCollection = {
      getFullList: vi.fn().mockResolvedValue([]),
    };
    mockPb.collection.mockReturnValue(mockCollection);

    renderHook(() => useOptimizedOverviewStats(mockUserId));

    await waitFor(() => {
      expect(mockCollection.getFullList).toHaveBeenCalled();
    });

    expect(mockCollection.getFullList).toHaveBeenCalledWith({
      filter: `user = "${mockUserId}"`,
      fields:
        'id,status,date_completed,date_started,total_diamonds,title,image,updated,user,company,artist,drill_shape,width,height,date_purchased,date_received,general_notes,source_url,kit_category,created',
      sort: '-updated',
      expand: 'company,artist',
      batch: 200,
      requestKey: `overview-optimized-${mockUserId}-${currentYear}`,
    });
  });

  it('should handle empty response correctly', async () => {
    mockPb.collection.mockReturnValue({
      getFullList: vi.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() => useOptimizedOverviewStats(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      completedCount: 0,
      estimatedDrills: 0,
      startedCount: 0,
      inProgressCount: 0,
      totalDiamonds: 0,
    });
    expect(result.current.inProgressProjects).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should update when userId changes', async () => {
    const mockCollection = {
      getFullList: vi.fn().mockResolvedValue([]),
    };
    mockPb.collection.mockReturnValue(mockCollection);

    const { result, rerender } = renderHook(({ userId }) => useOptimizedOverviewStats(userId), {
      initialProps: { userId: 'user-1' },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockCollection.getFullList).toHaveBeenCalledTimes(1);

    // Change the userId
    rerender({ userId: 'user-2' });

    await waitFor(() => {
      expect(mockCollection.getFullList).toHaveBeenCalledTimes(2);
    });

    // Verify the new call uses the new userId
    expect(mockCollection.getFullList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: 'user = "user-2"',
      })
    );
  });
});
