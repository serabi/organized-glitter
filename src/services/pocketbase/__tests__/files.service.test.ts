/**
 * Tests for FilesService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilesService } from '../files.service';

// Mock the compression utilities
vi.mock('@/utils/projectImageCompression', () => ({
  compressProjectImage: vi.fn().mockResolvedValue(new File(['compressed'], 'test.jpg', { type: 'image/jpeg' })),
  validateProjectImageFile: vi.fn().mockReturnValue({ isValid: true }),
}));

vi.mock('@/utils/progressImageCompression', () => ({
  compressProgressImage: vi.fn().mockResolvedValue(new File(['compressed'], 'test.jpg', { type: 'image/jpeg' })),
  validateProgressImageFile: vi.fn().mockReturnValue({ isValid: true }),
}));

// Mock PocketBase
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn().mockReturnValue({
      update: vi.fn().mockResolvedValue({
        id: 'test-id',
        image: 'test-image.jpg',
      }),
    }),
    files: {
      getURL: vi.fn().mockReturnValue('https://example.com/test-image.jpg'),
    },
  },
}));

// Mock logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('FilesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should validate a valid image file', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = FilesService.validateFile(file, 'project-image');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject files that are too large', () => {
      // Create a file that's larger than the limit
      const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const result = FilesService.validateFile(largeFile, 'project-image');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds the 50MB limit');
    });

    it('should reject invalid file types', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = FilesService.validateFile(file, 'project-image');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should have different size limits for different contexts', () => {
      const file = new File(['x'.repeat(10 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
      
      // Should be valid for project-image (50MB limit)
      const projectResult = FilesService.validateFile(file, 'project-image');
      expect(projectResult.isValid).toBe(true);
      
      // Should be invalid for avatar (5MB limit)
      const avatarResult = FilesService.validateFile(file, 'avatar');
      expect(avatarResult.isValid).toBe(false);
    });
  });

  describe('shouldCompressFile', () => {
    it('should recommend compression for large files', () => {
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const shouldCompress = FilesService.shouldCompressFile(largeFile, 'project-image');
      
      expect(shouldCompress).toBe(true);
    });

    it('should not recommend compression for small files', () => {
      const smallFile = new File(['small'], 'small.jpg', { type: 'image/jpeg' });
      const shouldCompress = FilesService.shouldCompressFile(smallFile, 'project-image');
      
      expect(shouldCompress).toBe(false);
    });
  });

  describe('getFileUrl', () => {
    it('should generate file URL for valid record', () => {
      const record = { id: 'test-id', image: 'test.jpg' };
      const url = FilesService.getFileUrl(record, 'image');
      
      expect(url).toBe('https://example.com/test-image.jpg');
    });

    it('should return empty string for record without file', () => {
      const record = { id: 'test-id' };
      const url = FilesService.getFileUrl(record, 'image');
      
      expect(url).toBe('');
    });
  });
});