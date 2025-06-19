import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCreateProject } from '../useCreateProject';
import { ProjectFormValues } from '@/types/project';

// Mock PocketBase
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      create: vi.fn(),
    })),
    files: {
      getUrl: vi.fn(),
    },
    authStore: {
      isValid: true,
      model: {
        id: 'user123',
        email: 'test@example.com',
      },
    },
  },
}));

let mockCreate: any;
let mockFiles: any;

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock analytics
vi.mock('@/services/analytics', () => ({
  analytics: {
    project: {
      created: vi.fn(),
    },
    feature: {
      imageUploaded: vi.fn(),
    },
    error: {
      imageUploadFailed: vi.fn(),
      databaseOperation: vi.fn(),
    },
  },
}));

// Mock image compression hook
vi.mock('@/hooks/useProjectImageCompression', () => ({
  useProjectImageCompression: () => ({
    compressImage: vi.fn().mockImplementation(file => Promise.resolve(file)),
  }),
}));

describe('useCreateProject', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Set up mock references
    const { pb } = await import('@/lib/pocketbase');
    const collection = pb.collection('projects');
    mockCreate = collection.create;
    mockFiles = pb.files;

    // Reset mock implementations
    mockCreate.mockReset();
    mockFiles.getUrl.mockReset();
  });

  it('should create a project successfully', async () => {
    const mockProjectData: ProjectFormValues = {
      title: 'Test Project',
      userId: 'user123',
      status: 'wishlist',
      company: 'Test Company',
      artist: 'Test Artist',
    };

    const mockResponse = {
      id: 'project123',
      title: 'Test Project',
      userId: 'user123',
      status: 'wishlist',
      company: 'Test Company',
      artist: 'Test Artist',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    };

    // Directly set up the mock on the PocketBase collection
    const { pb } = await import('@/lib/pocketbase');
    const createMock = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(pb.collection).mockReturnValue({
      create: createMock,
    } as any);

    const { result } = renderHook(() => useCreateProject());

    const createResult = await result.current.createProject(
      mockProjectData,
      ['Test Company'],
      ['Test Artist']
    );

    expect(createResult).toEqual({
      data: mockResponse,
      error: null,
    });

    expect(createMock).toHaveBeenCalledWith(expect.any(FormData));
  });

  it('should handle creation errors', async () => {
    const mockProjectData: ProjectFormValues = {
      title: 'Test Project',
      userId: 'user123',
      status: 'wishlist',
    };

    const mockError = new Error('Creation failed');

    // Directly set up the mock on the PocketBase collection
    const { pb } = await import('@/lib/pocketbase');
    const createMock = vi.fn().mockRejectedValue(mockError);
    vi.mocked(pb.collection).mockReturnValue({
      create: createMock,
    } as any);

    const { result } = renderHook(() => useCreateProject());

    const createResult = await result.current.createProject(mockProjectData, [], []);

    expect(createResult).toEqual({
      data: null,
      error: mockError,
    });
  });

  it('should handle image upload', async () => {
    const mockProjectData: ProjectFormValues = {
      title: 'Test Project',
      userId: 'user123',
      status: 'wishlist',
      imageFile: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    };

    const mockResponse = {
      id: 'project123',
      title: 'Test Project',
      image: 'uploaded-image.jpg',
    };

    // Directly set up the mock on the PocketBase collection
    const { pb } = await import('@/lib/pocketbase');
    const createMock = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(pb.collection).mockReturnValue({
      create: createMock,
    } as any);

    const { result } = renderHook(() => useCreateProject());

    const createResult = await result.current.createProject(mockProjectData, [], []);

    expect(createResult?.data).toEqual(mockResponse);
    expect(createMock).toHaveBeenCalledWith(expect.any(FormData));
  });

  it('should track loading state', async () => {
    const mockProjectData: ProjectFormValues = {
      title: 'Test Project',
      userId: 'user123',
      status: 'wishlist',
    };

    // Simulate a delayed response
    const mockResponse = { id: 'project123', title: 'Test Project' };

    // Directly set up the mock on the PocketBase collection
    const { pb } = await import('@/lib/pocketbase');
    const createMock = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 50))
      );
    vi.mocked(pb.collection).mockReturnValue({
      create: createMock,
    } as any);

    const { result } = renderHook(() => useCreateProject());

    expect(result.current.loading).toBe(false);

    // Start the create operation
    const createPromise = result.current.createProject(mockProjectData, [], []);

    // Wait a moment for state to update
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await createPromise;

    // Should not be loading after completion
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
