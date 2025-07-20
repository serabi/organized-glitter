/**
 * Comprehensive unit tests for ErrorHandler network error detection
 * @author @serabi
 * @created 2025-07-20
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler } from '../ErrorHandler';
import { ClientResponseError } from 'pocketbase';

// Mock secure logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    criticalError: vi.fn(),
  }),
}));

describe('ErrorHandler', () => {
  describe('isNetworkError()', () => {
    let originalNavigator: Navigator;
    let mockNavigator: Partial<Navigator>;

    beforeEach(() => {
      // Store original navigator
      originalNavigator = global.navigator;

      // Create mock navigator with writable onLine property
      mockNavigator = {};
      Object.defineProperty(mockNavigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      // Replace global navigator
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      // Restore original navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    describe('TypeError scenarios (most critical)', () => {
      it('should detect TypeError with "Failed to fetch" message', () => {
        const error = new TypeError('Failed to fetch');
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should detect TypeError with "NetworkError when attempting to fetch resource" message', () => {
        const error = new TypeError('NetworkError when attempting to fetch resource');
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should detect TypeError with "Network request failed" message', () => {
        const error = new TypeError('Network request failed');
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should detect TypeError with "cancelled" message', () => {
        const error = new TypeError('cancelled');
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should detect TypeError with generic network-related messages', () => {
        const networkMessages = [
          'fetch failed',
          'network error',
          'connection refused',
          'timeout',
          'unreachable',
          'connection lost',
        ];

        networkMessages.forEach(message => {
          const error = new TypeError(message);
          expect(ErrorHandler.isNetworkError(error)).toBe(true);
        });
      });

      it('should not detect TypeError with non-network messages', () => {
        const nonNetworkMessages = [
          'Invalid argument',
          'Cannot read property of undefined',
          'Type mismatch',
          'Syntax error',
          'Reference error',
        ];

        nonNetworkMessages.forEach(message => {
          const error = new TypeError(message);
          expect(ErrorHandler.isNetworkError(error)).toBe(false);
        });
      });
    });

    describe('Navigator.onLine scenarios', () => {
      it('should detect network error when navigator.onLine is false', () => {
        Object.defineProperty(mockNavigator, 'onLine', {
          value: false,
          writable: true,
          configurable: true,
        });
        const error = new Error('Any error when offline');
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should handle undefined navigator (server-side rendering)', () => {
        Object.defineProperty(global, 'navigator', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        const error = new TypeError('Failed to fetch');
        // Should still detect network error based on error type/message
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should not detect network error when navigator.onLine is true with non-network error', () => {
        Object.defineProperty(mockNavigator, 'onLine', {
          value: true,
          writable: true,
          configurable: true,
        });
        const error = new Error('Regular application error');
        expect(ErrorHandler.isNetworkError(error)).toBe(false);
      });

      it('should handle navigator without onLine property', () => {
        Object.defineProperty(global, 'navigator', {
          value: {},
          writable: true,
          configurable: true,
        });

        const error = new TypeError('Failed to fetch');
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });
    });

    describe('Named error types', () => {
      it('should detect NetworkError (existing functionality)', () => {
        const error = new Error('Network connection failed');
        error.name = 'NetworkError';
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should detect AbortError (timeout scenarios)', () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should detect TimeoutError', () => {
        const error = new Error('Request timed out');
        error.name = 'TimeoutError';
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should not detect non-network named errors', () => {
        const nonNetworkErrors = [
          { name: 'ValidationError', message: 'Invalid input' },
          { name: 'AuthenticationError', message: 'Unauthorized' },
          { name: 'PermissionError', message: 'Forbidden' },
          { name: 'ReferenceError', message: 'Variable not defined' },
          { name: 'SyntaxError', message: 'Invalid syntax' },
        ];

        nonNetworkErrors.forEach(({ name, message }) => {
          const error = new Error(message);
          error.name = name;
          expect(ErrorHandler.isNetworkError(error)).toBe(false);
        });
      });
    });

    describe('ClientResponseError scenarios (PocketBase specific)', () => {
      it('should detect ClientResponseError with status 0 (network unreachable)', () => {
        const error = new ClientResponseError({
          url: 'https://api.example.com/test',
          status: 0,
          data: {},
        });
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should detect ClientResponseError with undefined response', () => {
        const error = new ClientResponseError({
          url: 'https://api.example.com/test',
          status: 200,
          data: {},
        });

        // Simulate undefined response property (network issue)
        Object.defineProperty(error, 'response', {
          value: undefined,
          writable: true,
        });

        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should detect ClientResponseError with null response', () => {
        const error = new ClientResponseError({
          url: 'https://api.example.com/test',
          status: 200,
          data: {},
        });

        // Simulate null response property (network issue)
        Object.defineProperty(error, 'response', {
          value: null,
          writable: true,
        });

        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should not detect ClientResponseError with valid status and response', () => {
        const validStatuses = [200, 201, 400, 401, 403, 404, 422, 500, 502, 503];

        validStatuses.forEach(status => {
          const error = new ClientResponseError({
            url: 'https://api.example.com/test',
            status,
            data: { message: 'Some error' },
          });

          // Ensure response property exists (valid HTTP response)
          Object.defineProperty(error, 'response', {
            value: { status, ok: status < 400 },
            writable: true,
          });

          expect(ErrorHandler.isNetworkError(error)).toBe(false);
        });
      });

      it('should handle ClientResponseError without url or data properties', () => {
        const error = new ClientResponseError({
          status: 0,
        });
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });
    });

    describe('Non-network errors (should return false)', () => {
      it('should not detect regular Error instances', () => {
        const errors = [
          new Error('Regular application error'),
          new Error('Database connection failed'), // Might sound like network but isn't fetch/HTTP
          new Error('User input validation failed'),
        ];

        errors.forEach(error => {
          expect(ErrorHandler.isNetworkError(error)).toBe(false);
        });
      });

      it('should not detect other error types', () => {
        const errors = [
          new RangeError('Index out of bounds'),
          new ReferenceError('Variable not defined'),
          new SyntaxError('Invalid syntax'),
          new URIError('Invalid URI'),
          new EvalError('Eval error'),
        ];

        errors.forEach(error => {
          expect(ErrorHandler.isNetworkError(error)).toBe(false);
        });
      });

      it('should not detect null or undefined', () => {
        expect(ErrorHandler.isNetworkError(null)).toBe(false);
        expect(ErrorHandler.isNetworkError(undefined)).toBe(false);
      });

      it('should not detect string error messages', () => {
        const errorMessages = [
          'Failed to fetch',
          'Network error',
          'Connection refused',
          'Any error message',
        ];

        errorMessages.forEach(message => {
          expect(ErrorHandler.isNetworkError(message)).toBe(false);
        });
      });

      it('should not detect plain objects', () => {
        const errorObjects = [
          { message: 'Failed to fetch' },
          { error: 'Network error' },
          { status: 0 },
          {},
        ];

        errorObjects.forEach(obj => {
          expect(ErrorHandler.isNetworkError(obj)).toBe(false);
        });
      });
    });

    describe('Edge cases and combinations', () => {
      it('should detect network error when offline with TypeError', () => {
        Object.defineProperty(mockNavigator, 'onLine', {
          value: false,
          writable: true,
          configurable: true,
        });
        const error = new TypeError('Failed to fetch');
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should detect network error when offline with regular Error', () => {
        Object.defineProperty(mockNavigator, 'onLine', {
          value: false,
          writable: true,
          configurable: true,
        });
        const error = new Error('Any error while offline');
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should handle Error with network-related name and message', () => {
        const error = new Error('Connection failed');
        error.name = 'NetworkError';
        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should handle TypeError with empty message', () => {
        const error = new TypeError('');
        expect(ErrorHandler.isNetworkError(error)).toBe(false);
      });

      it('should handle Error objects with custom properties', () => {
        const error = new TypeError('Failed to fetch') as TypeError & {
          code?: string;
          customProp?: string;
        };
        error.code = 'NETWORK_ERROR';
        error.customProp = 'custom value';

        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });

      it('should handle ClientResponseError with both status 0 and offline navigator', () => {
        Object.defineProperty(mockNavigator, 'onLine', {
          value: false,
          writable: true,
          configurable: true,
        });
        const error = new ClientResponseError({
          url: 'https://api.example.com/test',
          status: 0,
          data: {},
        });

        expect(ErrorHandler.isNetworkError(error)).toBe(true);
      });
    });

    describe('Case sensitivity and partial matches', () => {
      it('should detect network errors with case-insensitive message matching', () => {
        const messages = [
          'FAILED TO FETCH',
          'Failed To Fetch',
          'network ERROR',
          'Network Error',
          'CONNECTION REFUSED',
          'Connection Refused',
        ];

        messages.forEach(message => {
          const error = new TypeError(message);
          expect(ErrorHandler.isNetworkError(error)).toBe(true);
        });
      });

      it('should detect partial message matches for network errors', () => {
        const messages = [
          'Request failed to fetch data',
          'The network request failed unexpectedly',
          'Timeout occurred during fetch',
          'Connection was cancelled by user',
        ];

        messages.forEach(message => {
          const error = new TypeError(message);
          expect(ErrorHandler.isNetworkError(error)).toBe(true);
        });
      });
    });
  });
});
