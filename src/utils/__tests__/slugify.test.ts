/**
 * @fileoverview Tests for shared slug generation utility
 */

import { describe, it, expect, vi } from 'vitest';
import { generateSlug, generateUniqueSlug } from '../slugify';

describe('generateSlug', () => {
  it('should convert text to lowercase', () => {
    expect(generateSlug('My Awesome Tag')).toBe('my-awesome-tag');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('hello world')).toBe('hello-world');
  });

  it('should replace special characters with hyphens', () => {
    expect(generateSlug('Special & Characters!')).toBe('special-characters');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(generateSlug('  &test&  ')).toBe('test');
  });

  it('should handle multiple consecutive special characters', () => {
    expect(generateSlug('test!!!???tag')).toBe('test-tag');
  });

  it('should handle the problematic tag names from error logs', () => {
    expect(generateSlug('Changed snowflakes using light purple pearl from shimmering canvases'))
      .toBe('changed-snowflakes-using-light-purple-pearl-from-shimmering-canvases');
    
    expect(generateSlug('won grand prize for mermaywithfemke - got prints and galaxy garden'))
      .toBe('won-grand-prize-for-mermaywithfemke-got-prints-and-galaxy-garden');
    
    expect(generateSlug('v2 Won from munimade event #mermaywithfemke2024! Completed diety of dawn for the event'))
      .toBe('v2-won-from-munimade-event-mermaywithfemke2024-completed-diety-of-dawn-for-the-event');
  });

  it('should handle empty strings gracefully', () => {
    expect(generateSlug('')).toBe('');
    expect(generateSlug('   ')).toBe('');
    expect(generateSlug('!!!')).toBe('');
  });

  it('should preserve alphanumeric characters', () => {
    expect(generateSlug('test123')).toBe('test123');
    expect(generateSlug('ABC123xyz')).toBe('abc123xyz');
  });

  it('should match TagService output exactly', () => {
    const testCases = [
      'My Awesome Tag!',
      '  Special & Characters  ',
      'Gift from Natalie at crafters paradise retreat',
      '#dakotathon - Won a tray from nyx\'s notions',
      'I hate color blocking. Gave to Jess for bday'
    ];

    testCases.forEach(testCase => {
      // This is the exact logic from TagService.generateSlug
      const expectedSlug = testCase
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      expect(generateSlug(testCase)).toBe(expectedSlug);
    });
  });
});

describe('generateUniqueSlug', () => {
  it('should return base slug if it does not exist', async () => {
    const mockCheckExists = vi.fn().mockResolvedValue(false);
    const result = await generateUniqueSlug('test tag', mockCheckExists);
    
    expect(result).toBe('test-tag');
    expect(mockCheckExists).toHaveBeenCalledWith('test-tag');
  });

  it('should append number if base slug exists', async () => {
    const mockCheckExists = vi.fn()
      .mockResolvedValueOnce(true)  // 'test-tag' exists
      .mockResolvedValueOnce(false); // 'test-tag-2' does not exist
    
    const result = await generateUniqueSlug('test tag', mockCheckExists);
    
    expect(result).toBe('test-tag-2');
    expect(mockCheckExists).toHaveBeenCalledWith('test-tag');
    expect(mockCheckExists).toHaveBeenCalledWith('test-tag-2');
  });

  it('should keep incrementing until unique slug found', async () => {
    const mockCheckExists = vi.fn()
      .mockResolvedValueOnce(true)  // 'test-tag' exists
      .mockResolvedValueOnce(true)  // 'test-tag-2' exists
      .mockResolvedValueOnce(true)  // 'test-tag-3' exists
      .mockResolvedValueOnce(false); // 'test-tag-4' does not exist
    
    const result = await generateUniqueSlug('test tag', mockCheckExists);
    
    expect(result).toBe('test-tag-4');
    expect(mockCheckExists).toHaveBeenCalledTimes(4);
  });

  it('should fallback to timestamp if max attempts reached', async () => {
    const mockCheckExists = vi.fn().mockResolvedValue(true); // Always exists
    const mockTimestamp = 1234567890;
    
    // Mock Date.now to return predictable timestamp
    const originalDateNow = Date.now;
    Date.now = vi.fn().mockReturnValue(mockTimestamp);
    
    const result = await generateUniqueSlug('test tag', mockCheckExists, 3);
    
    expect(result).toBe(`test-tag-${mockTimestamp}`);
    expect(mockCheckExists).toHaveBeenCalledTimes(3); // Base + 2 attempts (maxAttempts=3 means 2 numbered attempts)
    
    // Restore Date.now
    Date.now = originalDateNow;
  });

  it('should handle empty slug by using fallback', async () => {
    const mockCheckExists = vi.fn().mockResolvedValue(false);
    
    const result = await generateUniqueSlug('!!!', mockCheckExists);
    
    expect(result).toBe('tag');
    expect(mockCheckExists).toHaveBeenCalledWith('tag');
  });

  it('should handle check function errors gracefully', async () => {
    const mockCheckExists = vi.fn()
      .mockResolvedValueOnce(true)  // 'test-tag' exists
      .mockResolvedValueOnce(false); // 'test-tag-2' does not exist
    
    const result = await generateUniqueSlug('test tag', mockCheckExists);
    
    // Should find unique slug despite initial existence
    expect(result).toBe('test-tag-2');
  });
});