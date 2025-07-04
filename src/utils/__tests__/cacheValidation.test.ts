import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  isValidPocketBaseId,
  validateQueryKey,
  cleanInvalidCacheEntries,
} from '../cacheValidation';

describe('cacheValidation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe('isValidPocketBaseId', () => {
    it('should validate correct PocketBase IDs', () => {
      expect(isValidPocketBaseId('abc123def456ghij')).toBe(true);
      expect(isValidPocketBaseId('1234567890123456')).toBe(true);
      expect(isValidPocketBaseId('abcdefghijklmnop')).toBe(true);
    });

    it('should reject invalid PocketBase IDs', () => {
      expect(isValidPocketBaseId('')).toBe(false);
      expect(isValidPocketBaseId('too-short')).toBe(false);
      expect(isValidPocketBaseId('way-too-long-for-pocketbase-id')).toBe(false);
      expect(isValidPocketBaseId('has-special-char!')).toBe(false);
      expect(isValidPocketBaseId('has spaces in it')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidPocketBaseId(null as unknown as string)).toBe(false);
      expect(isValidPocketBaseId(undefined as unknown as string)).toBe(false);
      expect(isValidPocketBaseId(123 as unknown as string)).toBe(false);
    });
  });

  describe('validateQueryKey', () => {
    it('should validate query keys with valid IDs', () => {
      expect(validateQueryKey(['projects', 'list'])).toBe(true);
      expect(validateQueryKey(['projects', 'detail', 'abc123def456ghij'])).toBe(true);
      expect(validateQueryKey(['user', 'profile', '1234567890123456'])).toBe(true);
    });

    it('should reject query keys with invalid 16-char IDs', () => {
      expect(validateQueryKey(['projects', 'detail', 'invalid-with-dash'])).toBe(false);
      expect(validateQueryKey(['projects', 'detail', 'has spaces here'])).toBe(false);
    });

    it('should handle mixed valid/invalid keys', () => {
      expect(validateQueryKey(['projects', 'abc123def456ghij', 'invalid-with-dash'])).toBe(false);
    });
  });

  describe('cleanInvalidCacheEntries', () => {
    it('should remove queries with 404 errors', () => {
      // Add a query with 404 error
      queryClient.setQueryData(['test', 'error'], 'some data');
      const query = queryClient.getQueryCache().find({ queryKey: ['test', 'error'] });

      if (query) {
        // Simulate 404 error
        query.state = {
          ...query.state,
          error: { status: 404, message: 'Not found' },
          fetchStatus: 'idle' as const,
        };
      }

      const removedCount = cleanInvalidCacheEntries(queryClient);
      expect(removedCount).toBe(1);
      expect(queryClient.getQueryData(['test', 'error'])).toBeUndefined();
    });

    it('should not remove queries that are currently fetching', () => {
      queryClient.setQueryData(['test', 'fetching'], 'some data');
      const query = queryClient.getQueryCache().find({ queryKey: ['test', 'fetching'] });

      if (query) {
        query.state = {
          ...query.state,
          error: { status: 404, message: 'Not found' },
          fetchStatus: 'fetching' as const,
        };
      }

      const removedCount = cleanInvalidCacheEntries(queryClient);
      expect(removedCount).toBe(0);
      expect(queryClient.getQueryData(['test', 'fetching'])).toBe('some data');
    });

    it('should not remove queries with non-404 errors', () => {
      queryClient.setQueryData(['test', 'servererror'], 'some data');
      const query = queryClient.getQueryCache().find({ queryKey: ['test', 'servererror'] });

      if (query) {
        query.state = {
          ...query.state,
          error: { status: 500, message: 'Server error' },
          fetchStatus: 'idle' as const,
        };
      }

      const removedCount = cleanInvalidCacheEntries(queryClient);
      expect(removedCount).toBe(0);
      expect(queryClient.getQueryData(['test', 'servererror'])).toBe('some data');
    });
  });
});
