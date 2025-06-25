import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOptimizedImage, useImagePrefetcher } from '../useOptimizedImage';
import { ImageService } from '@/services/ImageService';

// Mock ImageService
vi.mock('@/services/ImageService', () => ({
  ImageService: {
    getOptimizedUrl: vi.fn(),
    getContextualUrl: vi.fn(),
    getProgressiveUrls: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useOptimizedImage', () => {
  const mockRecord = { id: 'test-record', collectionName: 'projects' };
  const mockFilename = 'test-image.jpg';
  const mockImageUrl = 'https://example.com/optimized-image.jpg';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ImageService.getOptimizedUrl).mockReturnValue(mockImageUrl);
    vi.mocked(ImageService.getContextualUrl).mockReturnValue(mockImageUrl);
  });

  it('should generate optimized image URL with specified size', async () => {
    const { result } = renderHook(
      () =>
        useOptimizedImage({
          record: mockRecord,
          filename: mockFilename,
          size: 'card',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.imageUrl).toBe(mockImageUrl);
    });

    expect(ImageService.getOptimizedUrl).toHaveBeenCalledWith(mockRecord, mockFilename, 'card');
  });

  it('should use contextual URL when no size specified', async () => {
    const { result } = renderHook(
      () =>
        useOptimizedImage({
          record: mockRecord,
          filename: mockFilename,
          context: 'gallery',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.imageUrl).toBe(mockImageUrl);
    });

    expect(ImageService.getContextualUrl).toHaveBeenCalledWith(mockRecord, mockFilename, 'gallery');
  });

  it('should not fetch when disabled', () => {
    renderHook(
      () =>
        useOptimizedImage({
          record: mockRecord,
          filename: mockFilename,
          enabled: false,
        }),
      { wrapper: createWrapper() }
    );

    expect(ImageService.getOptimizedUrl).not.toHaveBeenCalled();
    expect(ImageService.getContextualUrl).not.toHaveBeenCalled();
  });

  it('should not fetch when record is missing', () => {
    renderHook(
      () =>
        useOptimizedImage({
          record: null as unknown as Record<string, unknown> & { id: string },
          filename: mockFilename,
        }),
      { wrapper: createWrapper() }
    );

    expect(ImageService.getOptimizedUrl).not.toHaveBeenCalled();
    expect(ImageService.getContextualUrl).not.toHaveBeenCalled();
  });

  it('should not fetch when filename is missing', () => {
    renderHook(
      () =>
        useOptimizedImage({
          record: mockRecord,
          filename: '',
        }),
      { wrapper: createWrapper() }
    );

    expect(ImageService.getOptimizedUrl).not.toHaveBeenCalled();
    expect(ImageService.getContextualUrl).not.toHaveBeenCalled();
  });

  it('should handle loading states correctly', async () => {
    const { result } = renderHook(
      () =>
        useOptimizedImage({
          record: mockRecord,
          filename: mockFilename,
        }),
      { wrapper: createWrapper() }
    );

    // Initially loading should be true
    expect(result.current.isLoading).toBe(true);
    expect(result.current.imageUrl).toBeUndefined();

    // Wait for query to resolve
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.imageUrl).toBe(mockImageUrl);
    });
  });

  // Note: Error handling is tested through integration tests and manual testing
  // since mocking React Query error states in unit tests is complex
});

describe('useImagePrefetcher', () => {
  const mockImages = [
    { record: { id: 'record1' }, filename: 'image1.jpg' },
    { record: { id: 'record2' }, filename: 'image2.jpg' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ImageService.getContextualUrl).mockReturnValue('https://example.com/image.jpg');
  });

  it('should prefetch images with correct context', () => {
    const { result } = renderHook(() => useImagePrefetcher(), {
      wrapper: createWrapper(),
    });

    result.current.prefetchImages(mockImages, 'high');

    expect(ImageService.getContextualUrl).toHaveBeenCalledTimes(2);
    expect(ImageService.getContextualUrl).toHaveBeenCalledWith(
      mockImages[0].record,
      mockImages[0].filename,
      'gallery'
    );
    expect(ImageService.getContextualUrl).toHaveBeenCalledWith(
      mockImages[1].record,
      mockImages[1].filename,
      'gallery'
    );
  });

  it('should handle custom context for prefetching', () => {
    const { result } = renderHook(() => useImagePrefetcher(), {
      wrapper: createWrapper(),
    });

    const imagesWithContext = mockImages.map(img => ({ ...img, context: 'modal' as const }));
    result.current.prefetchImages(imagesWithContext, 'low');

    expect(ImageService.getContextualUrl).toHaveBeenCalledWith(
      mockImages[0].record,
      mockImages[0].filename,
      'modal'
    );
  });

  it('should skip invalid images during prefetching', () => {
    const { result } = renderHook(() => useImagePrefetcher(), {
      wrapper: createWrapper(),
    });

    const invalidImages = [
      { record: null, filename: 'image1.jpg' },
      { record: { id: 'record2' }, filename: '' },
    ];

    result.current.prefetchImages(invalidImages as Array<{
      record: Record<string, unknown> & { id: string };
      filename: string;
      context?: 'gallery' | 'card' | 'modal';
    }>, 'high');

    expect(ImageService.getContextualUrl).not.toHaveBeenCalled();
  });
});
