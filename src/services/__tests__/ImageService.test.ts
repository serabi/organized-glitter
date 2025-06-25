import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageService, IMAGE_SIZES } from '../ImageService';

// Mock PocketBase
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    files: {
      getURL: vi.fn((record, filename, options) => {
        const baseUrl = `https://data.organizedglitter.app/api/files/projects/${record.id}/${filename}`;
        if (options?.thumb) {
          return `${baseUrl}?thumb=${options.thumb}`;
        }
        return baseUrl;
      }),
    },
  },
}));

// Mock logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe('ImageService', () => {
  const mockRecord = { id: 'test-record-id', collectionName: 'projects' };
  const mockFilename = 'test-image.jpg';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOptimizedUrl', () => {
    it('should generate URL with thumbnail parameter for predefined sizes', () => {
      const url = ImageService.getOptimizedUrl(mockRecord, mockFilename, 'card');

      expect(url).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.card}`
      );
    });

    it('should generate URL with custom thumbnail parameter', () => {
      const customThumb = '400x300f';
      const url = ImageService.getOptimizedUrl(mockRecord, mockFilename, customThumb);

      expect(url).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${customThumb}`
      );
    });

    it('should return empty string for missing record', () => {
      const url = ImageService.getOptimizedUrl(null as unknown as Record<string, unknown> & { id: string }, mockFilename, 'card');
      expect(url).toBe('');
    });

    it('should return empty string for missing filename', () => {
      const url = ImageService.getOptimizedUrl(mockRecord, '', 'card');
      expect(url).toBe('');
    });

    it('should use default card size when no size specified', () => {
      const url = ImageService.getOptimizedUrl(mockRecord, mockFilename);

      expect(url).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.card}`
      );
    });
  });

  describe('getFullResolutionUrl', () => {
    it('should generate URL without thumbnail parameter', () => {
      const url = ImageService.getFullResolutionUrl(mockRecord, mockFilename);

      expect(url).toBe(
        'https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg'
      );
    });

    it('should return empty string for missing record', () => {
      const url = ImageService.getFullResolutionUrl(null as unknown as Record<string, unknown> & { id: string }, mockFilename);
      expect(url).toBe('');
    });
  });

  describe('getContextualUrl', () => {
    it('should return thumbnail size for gallery context', () => {
      const url = ImageService.getContextualUrl(mockRecord, mockFilename, 'gallery');

      expect(url).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.thumbnail}`
      );
    });

    it('should return card size for card context', () => {
      const url = ImageService.getContextualUrl(mockRecord, mockFilename, 'card');

      expect(url).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.card}`
      );
    });

    it('should return preview size for modal context', () => {
      const url = ImageService.getContextualUrl(mockRecord, mockFilename, 'modal');

      expect(url).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.preview}`
      );
    });

    it('should return large size for detail context', () => {
      const url = ImageService.getContextualUrl(mockRecord, mockFilename, 'detail');

      expect(url).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.large}`
      );
    });

    it('should default to card size for unknown context', () => {
      const url = ImageService.getContextualUrl(mockRecord, mockFilename, 'unknown' as 'gallery' | 'card' | 'modal' | 'detail' | 'avatar');

      expect(url).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.card}`
      );
    });
  });

  describe('getResponsiveUrls', () => {
    it('should generate multiple URLs for different sizes', () => {
      const urls = ImageService.getResponsiveUrls(mockRecord, mockFilename, ['thumbnail', 'card']);

      expect(urls).toHaveLength(2);
      expect(urls[0]).toEqual({
        url: `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.thumbnail}`,
        size: IMAGE_SIZES.thumbnail,
        isOptimized: true,
      });
      expect(urls[1]).toEqual({
        url: `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.card}`,
        size: IMAGE_SIZES.card,
        isOptimized: true,
      });
    });

    it('should return empty array for missing record', () => {
      const urls = ImageService.getResponsiveUrls(null as unknown as Record<string, unknown> & { id: string }, mockFilename);
      expect(urls).toEqual([]);
    });
  });

  describe('getProgressiveUrls', () => {
    it('should generate placeholder, full quality, and original URLs', () => {
      const urls = ImageService.getProgressiveUrls(mockRecord, mockFilename);

      expect(urls.placeholder).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.thumbnail}`
      );
      expect(urls.fullQuality).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.large}`
      );
      expect(urls.original).toBe(
        'https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg'
      );
    });
  });

  describe('hasValidImage', () => {
    it('should return true for record with valid image field', () => {
      const recordWithImage = { id: 'test', image: 'test.jpg' };
      expect(ImageService.hasValidImage(recordWithImage)).toBe(true);
    });

    it('should return false for record without image field', () => {
      const recordWithoutImage = { id: 'test' };
      expect(ImageService.hasValidImage(recordWithoutImage)).toBe(false);
    });

    it('should return false for record with empty image field', () => {
      const recordWithEmptyImage = { id: 'test', image: '' };
      expect(ImageService.hasValidImage(recordWithEmptyImage)).toBe(false);
    });

    it('should return false for record with non-string image field', () => {
      const recordWithNonStringImage = { id: 'test', image: null };
      expect(ImageService.hasValidImage(recordWithNonStringImage)).toBe(false);
    });

    it('should check custom field name', () => {
      const recordWithCustomField = { id: 'test', avatar: 'avatar.jpg' };
      expect(ImageService.hasValidImage(recordWithCustomField, 'avatar')).toBe(true);
    });
  });

  describe('getUrl - backward compatibility', () => {
    it('should use provided thumb parameter', () => {
      const url = ImageService.getUrl(mockRecord, mockFilename, '200x200');

      expect(url).toBe(
        'https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=200x200'
      );
    });

    it('should default to card size when no thumb provided', () => {
      const url = ImageService.getUrl(mockRecord, mockFilename);

      expect(url).toBe(
        `https://data.organizedglitter.app/api/files/projects/test-record-id/test-image.jpg?thumb=${IMAGE_SIZES.card}`
      );
    });
  });

  describe('IMAGE_SIZES constants', () => {
    it('should have correct predefined sizes', () => {
      expect(IMAGE_SIZES.thumbnail).toBe('150x150');
      expect(IMAGE_SIZES.card).toBe('300x200f');
      expect(IMAGE_SIZES.preview).toBe('600x400f');
      expect(IMAGE_SIZES.large).toBe('800x600f');
    });
  });
});
