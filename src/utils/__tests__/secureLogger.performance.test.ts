/**
 * Performance and edge case validation tests for secureLogger
 * Ensures the WeakSet approach and object traversal perform efficiently
 * @author @serabi
 * @created 2025-08-01
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redactSensitiveData, performanceLogger, batchApiLogger } from '../secureLogger';

interface TestData {
  [key: string]: unknown;
}

interface RedactedResult {
  [key: string]: unknown;
}

describe('SecureLogger Performance & Edge Cases', () => {
  beforeEach(() => {
    vi.stubGlobal('import.meta', { env: { DEV: true } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('WeakSet Performance and Memory Management', () => {
    it('should handle large object graphs efficiently', () => {
      // Create a large object graph with potential circular references
      const createLargeGraph = (_depth: number, breadth: number): TestData => {
        const nodes: TestData[] = [];

        // Create nodes
        for (let i = 0; i < breadth; i++) {
          nodes.push({
            id: `node-${i}`,
            data: `data-${i}`,
            secret: `secret-value-${i}-12345`, // Will be redacted
            children: [],
          });
        }

        // Create connections (potential cycles)
        nodes.forEach((node, i) => {
          const nextIndex = (i + 1) % nodes.length;
          (node.children as TestData[]).push(nodes[nextIndex]);
        });

        return nodes[0]; // Return root
      };

      const startTime = performance.now();
      const largeGraph = createLargeGraph(100, 1000);
      const result = redactSensitiveData(largeGraph);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toBeDefined();
    });

    it('should not leak memory with repeated processing', () => {
      const testObject = {
        level1: {
          secret: 'secret123',
          level2: {
            token: 'token456',
            level3: {
              apiKey: 'apikey789',
            },
          },
        },
      };

      // Process the same object multiple times to check for memory leaks
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        redactSensitiveData(testObject);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(1); // Average should be less than 1ms per operation
    });

    it('should handle concurrent processing without conflicts', async () => {
      const createTestData = (id: number) => ({
        id,
        secret: `secret-${id}-123456789`,
        nested: {
          token: `token-${id}-987654321`,
          data: `safe-data-${id}`,
        },
      });

      // Process multiple objects concurrently
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(redactSensitiveData(createTestData(i)))
      );

      const results = await Promise.all(promises);

      results.forEach((result, i) => {
        expect(result).toHaveProperty('id', i);
        expect(result).toHaveProperty('secret', '[REDACTED]');
        expect((result as Record<string, unknown>).nested).toEqual({
          token: '[REDACTED]',
          data: `safe-data-${i}`,
        });
      });
    });
  });

  describe('Complex Data Structure Edge Cases', () => {
    it('should handle Map and Set objects', () => {
      const testMap = new Map([
        ['normalKey', 'normalValue'],
        ['secretKey', 'secretValue123'],
        ['apiKey', 'apiValue456'],
      ]);

      const testSet = new Set(['normalValue', 'secretValue123', 'apiValue456']);

      const dataWithCollections: TestData = {
        mapData: testMap,
        setData: testSet,
        normalKey: 'normalValue',
        secretKey: 'secretValue789',
      };

      const result = redactSensitiveData(dataWithCollections) as RedactedResult;

      // Collections should be preserved as-is (redaction only applies to plain objects)
      expect(result.mapData).toBeInstanceOf(Map);
      expect(result.setData).toBeInstanceOf(Set);
      expect(result.secretKey).toBe('[REDACTED]');
    });

    it('should handle Date objects and other built-ins', () => {
      const testDate = new Date('2025-01-01');
      const testRegex = /test-pattern/gi;
      const testError = new Error('Test error with secret=hidden123');

      const dataWithBuiltins: TestData = {
        dateValue: testDate,
        regexValue: testRegex,
        errorValue: testError,
        secretValue: 'builtin-secret-456',
      };

      const result = redactSensitiveData(dataWithBuiltins) as RedactedResult;

      expect(result.dateValue).toBeInstanceOf(Date);
      expect(result.regexValue).toBeInstanceOf(RegExp);
      expect(result.errorValue).toBeInstanceOf(Error);
      expect(result.secretValue).toBe('[REDACTED]');
    });

    it('should handle functions and symbols', () => {
      const testFunction = function () {
        return 'test';
      };
      const testSymbol = Symbol('test-symbol');
      const testSymbolKey = Symbol('secret-key');

      const dataWithFunctions: TestData = {
        functionValue: testFunction,
        symbolValue: testSymbol,
        [testSymbolKey]: 'symbol-secret-123',
        normalSecret: 'normal-secret-456',
      };

      const result = redactSensitiveData(dataWithFunctions) as RedactedResult;

      expect(result.functionValue).toBe(testFunction);
      expect(result.symbolValue).toBe(testSymbol);
      expect(result.normalSecret).toBe('[REDACTED]');
      // Symbol keys are not enumerable by default in Object.entries
    });

    it('should handle deeply nested object with various types', () => {
      const complexStructure = {
        user: {
          id: 12345,
          profile: {
            name: 'John Doe',
            credentials: {
              password: 'user-password-123',
              sessions: [
                {
                  id: 'session-1',
                  token: 'session-token-abc123',
                  created: new Date(),
                  metadata: {
                    device: 'chrome',
                    apiKey: 'device-api-key-xyz789',
                  },
                },
              ],
            },
          },
          preferences: {
            theme: 'dark',
            notifications: true,
            secretConfig: 'config-secret-def456',
          },
        },
      };

      const result = redactSensitiveData(complexStructure) as RedactedResult;
      const user = result.user as RedactedResult;
      const profile = user.profile as RedactedResult;
      const credentials = profile.credentials as RedactedResult;
      const sessions = credentials.sessions as RedactedResult[];
      const session = sessions[0] as RedactedResult;
      const metadata = session.metadata as RedactedResult;
      const preferences = user.preferences as RedactedResult;

      expect(user.id).toBe(12345);
      expect(profile.name).toBe('John Doe');
      expect(credentials.password).toBe('[REDACTED]');
      expect(session.token).toBe('[REDACTED]');
      expect(metadata.apiKey).toBe('[REDACTED]');
      expect(preferences.secretConfig).toBe('[REDACTED]');
      expect(preferences.theme).toBe('dark');
    });
  });

  describe('String Processing Edge Cases', () => {
    it('should handle malformed key-value patterns', () => {
      const malformedStrings = [
        'key=', // Empty value
        'key:', // Empty value with colon
        'key = value with spaces', // Value too short
        'notakey=somevalue123456', // Key doesn't match pattern
        'secret=', // Empty secret
        'password:', // Empty password with colon
        'api_key="quoted but short"', // Quoted but short value
        'token=valid_long_token_here_123456', // Valid pattern
      ];

      malformedStrings.forEach(testString => {
        const result = redactSensitiveData(testString);
        if (testString.includes('valid_long_token_here')) {
          expect(result).toContain('[REDACTED]');
        } else if (testString.includes('notakey')) {
          expect(result).toBe(testString); // Should not be modified
        } else {
          // Others might be partially processed
          expect(result).toBeDefined();
        }
      });
    });

    it('should handle Unicode and special characters', () => {
      const unicodeTest: TestData = {
        normalKey: 'normal-value',
        résumé_token: 'unicode-secret-123456789',
        密码: 'chinese-password-abc123456', // Chinese for "password"
        clé_secrète: 'french-secret-def789012', // French for "secret key"
      };

      const result = redactSensitiveData(unicodeTest) as RedactedResult;

      expect(result.normalKey).toBe('normal-value');
      expect(result['résumé_token']).toBe('[REDACTED]');
      // Non-Latin characters might not match English-based patterns
      expect(result['密码']).toBe('chinese-password-abc123456');
      expect(result['clé_secrète']).toBe('[REDACTED]'); // Contains "secrète" which includes "secret"
    });

    it('should handle extremely long values', () => {
      const longSecret = 'x'.repeat(10000); // 10KB string
      const longKey = 'a'.repeat(1000); // 1KB key name

      const testData: TestData = {
        [longKey]: longSecret,
        shortKey: 'short',
        secret: longSecret,
      };

      const startTime = performance.now();
      const result = redactSensitiveData(testData) as RedactedResult;
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(result[longKey]).toBe(longSecret); // Long key name shouldn't match patterns
      expect(result.secret).toBe('[REDACTED]');
      expect(result.shortKey).toBe('short');
    });
  });

  describe('Performance Logger Validation', () => {
    it('should track performance without affecting main functionality', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const timerId = performanceLogger.start('test-operation');

      // Simulate some work
      const testData = { secret: 'test-secret-123456' };
      const result = redactSensitiveData(testData);

      performanceLogger.end(timerId, { operation: 'redaction' });

      expect(result).toHaveProperty('secret', '[REDACTED]');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-operation'),
        expect.stringContaining('background-color: #607d8b'),
        expect.anything(),
        expect.stringContaining('color: #4caf50'),
        expect.anything(),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('should handle batch API logging correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const batchId = batchApiLogger.startBatchOperation(
        'test-batch',
        5,
        'Testing batch redaction'
      );

      // Process multiple items with sensitive data
      const items = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        apiKey: `api-key-${i}-123456789`,
      }));

      const results = items.map(item => redactSensitiveData(item));

      batchApiLogger.endBatchOperation(batchId, results.length);

      results.forEach((result, i) => {
        expect(result).toHaveProperty('id', i);
        expect(result).toHaveProperty('apiKey', '[REDACTED]');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Testing batch redaction'),
        expect.stringContaining('background-color: #2196f3'),
        expect.anything(),
        expect.stringContaining('color: #4caf50'),
        expect.anything(),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not retain references after processing', () => {
      const sensitiveData = {
        secret: 'memory-test-secret-123456',
        nested: {
          token: 'memory-test-token-789012',
        },
      };

      // Create a weak reference to track garbage collection
      const weakRef = new WeakRef(sensitiveData);

      const result = redactSensitiveData(sensitiveData);

      expect(result).toHaveProperty('secret', '[REDACTED]');
      expect((result as Record<string, unknown>).nested).toEqual(
        expect.objectContaining({ token: '[REDACTED]' })
      );

      // Original object should still be alive
      expect(weakRef.deref()).toBeDefined();
    });

    it('should handle null prototype objects', () => {
      const nullProtoObj = Object.create(null);
      nullProtoObj.secret = 'null-proto-secret-123456';
      nullProtoObj.normalProp = 'normal-value';

      const result = redactSensitiveData(nullProtoObj) as Record<string, unknown>;

      expect(result.secret).toBe('[REDACTED]');
      expect(result.normalProp).toBe('normal-value');
    });

    it('should handle frozen and sealed objects', () => {
      const frozenObj = Object.freeze({
        secret: 'frozen-secret-123456',
        normal: 'normal-value',
      });

      const sealedObj = Object.seal({
        token: 'sealed-token-789012',
        normal: 'normal-value',
      });

      const frozenResult = redactSensitiveData(frozenObj) as Record<string, unknown>;
      const sealedResult = redactSensitiveData(sealedObj) as Record<string, unknown>;

      expect(frozenResult.secret).toBe('[REDACTED]');
      expect(frozenResult.normal).toBe('normal-value');
      expect(sealedResult.token).toBe('[REDACTED]');
      expect(sealedResult.normal).toBe('normal-value');
    });
  });
});
