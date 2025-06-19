import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateImageFile, createFilePreviewUrl, compressAvatarImage } from '../imageUtils';

// Mock canvas and its context
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(),
  toBlob: vi.fn(),
};

const mockContext = {
  drawImage: vi.fn(),
  clearRect: vi.fn(),
};

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    if (tagName === 'img') {
      return {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        src: '',
        width: 0,
        height: 0,
        onload: null,
        onerror: null,
      };
    }
    return {};
  }),
});

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn().mockReturnValue('blob:mock-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

describe('imageUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas.getContext.mockReturnValue(mockContext);
  });

  describe('validateImageFile', () => {
    it('should validate correct image file', () => {
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Mock the size property
      Object.defineProperty(validFile, 'size', {
        value: 1024 * 1024, // 1MB
        writable: false,
      });

      const result = validateImageFile(validFile);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid file type', () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      const result = validateImageFile(invalidFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Please upload a JPEG, PNG, WebP, or HEIC image file');
    });

    it('should reject file that is too large', () => {
      const largeFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' });

      // Mock a large file size (60MB - larger than 50MB limit)
      Object.defineProperty(largeFile, 'size', {
        value: 60 * 1024 * 1024,
        writable: false,
      });

      const result = validateImageFile(largeFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Image file must be smaller than 50MB');
    });

    it('should accept file at maximum size limit', () => {
      const maxSizeFile = new File(['test'], 'max.jpg', { type: 'image/jpeg' });

      // Mock file at exactly 5MB
      Object.defineProperty(maxSizeFile, 'size', {
        value: 5 * 1024 * 1024,
        writable: false,
      });

      const result = validateImageFile(maxSizeFile);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept all supported image types', () => {
      const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      supportedTypes.forEach(type => {
        const file = new File(['test'], `test.${type.split('/')[1]}`, { type });
        Object.defineProperty(file, 'size', { value: 1024, writable: false });

        const result = validateImageFile(file);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('createFilePreviewUrl', () => {
    it('should generate preview URL for valid image', () => {
      // Create a file with content larger than 100 bytes
      const largeContent = 'x'.repeat(200);
      const imageFile = new File([largeContent], 'test.jpg', { type: 'image/jpeg' });

      const previewUrl = createFilePreviewUrl(imageFile);

      expect(previewUrl).toBe('blob:mock-url');
      expect(URL.createObjectURL).toHaveBeenCalledWith(imageFile);
    });
  });

  describe('compressAvatarImage', () => {
    // Mock imageCompression library
    vi.mock('browser-image-compression', () => ({
      default: vi.fn(),
    }));

    it('should compress image for avatar upload', async () => {
      const { default: imageCompression } = await import('browser-image-compression');
      // Create files with content larger than 100 bytes
      const largeContent = 'x'.repeat(200);
      const originalFile = new File([largeContent], 'avatar.jpg', { type: 'image/jpeg' });
      const compressedFile = new File([largeContent], 'avatar.jpg', { type: 'image/jpeg' });

      vi.mocked(imageCompression).mockResolvedValue(compressedFile);

      const result = await compressAvatarImage(originalFile);

      expect(result).toStrictEqual(compressedFile);
      expect(imageCompression).toHaveBeenCalledWith(originalFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.8,
      });
    });

    it('should handle compression errors', async () => {
      const { default: imageCompression } = await import('browser-image-compression');
      // Create file with content larger than 100 bytes
      const largeContent = 'x'.repeat(200);
      const originalFile = new File([largeContent], 'avatar.jpg', { type: 'image/jpeg' });

      vi.mocked(imageCompression).mockRejectedValue(new Error('Compression failed'));

      await expect(compressAvatarImage(originalFile)).rejects.toThrow('Failed to compress image');
    });
  });
});
