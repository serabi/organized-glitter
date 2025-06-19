import { describe, it, expect } from 'vitest';
import { validateProgressNote, validateImageFile } from '../validation';
import { PROGRESS_NOTE_CONSTANTS } from '../constants';

describe('validateProgressNote', () => {
  it('should return isValid true for valid data', () => {
    const result = validateProgressNote({
      date: '2025-05-26',
      content: 'Test content',
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return isValid false and errors for missing date', () => {
    const result = validateProgressNote({
      date: '',
      content: 'Test content',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.date).toBe('Date is required.');
  });

  it('should return isValid false and errors for missing content', () => {
    const result = validateProgressNote({
      date: '2025-05-26',
      content: '  ', // Test with whitespace
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.content).toBe('Content is required.');
  });

  it('should return isValid false and errors for both missing date and content', () => {
    const result = validateProgressNote({
      date: '',
      content: '',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.date).toBe('Date is required.');
    expect(result.errors.content).toBe('Content is required.');
  });
});

describe('validateImageFile', () => {
  const { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } = PROGRESS_NOTE_CONSTANTS;

  it('should return isValid true for a valid image file', () => {
    const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const result = validateImageFile(mockFile);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return isValid false and error for invalid file type', () => {
    const mockFile = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    const result = validateImageFile(mockFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      `Invalid file type. Accepted types are: ${ACCEPTED_FILE_TYPES.join(', ')}.`
    );
  });

  it('should return isValid false and error for file size exceeding limit', () => {
    // Create a mock file with proper size property
    const mockFile = new File(['dummy content'], 'large_image.jpg', {
      type: 'image/jpeg',
    });

    // Override the size property to be larger than MAX_FILE_SIZE
    Object.defineProperty(mockFile, 'size', {
      value: MAX_FILE_SIZE + 1,
      writable: false,
    });

    const result = validateImageFile(mockFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(`File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  });

  it('should return isValid true for a file at the exact max size limit', () => {
    const mockFile = new File(['dummy content'], 'exact_size_image.jpg', {
      type: 'image/jpeg',
    });

    // Override the size property to be exactly MAX_FILE_SIZE
    Object.defineProperty(mockFile, 'size', {
      value: MAX_FILE_SIZE,
      writable: false,
    });

    const result = validateImageFile(mockFile);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return isValid true for all accepted file types', () => {
    ACCEPTED_FILE_TYPES.forEach(fileType => {
      const mockFile = new File(['dummy content'], `test.${fileType.split('/')[1]}`, {
        type: fileType,
      });
      const result = validateImageFile(mockFile);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
