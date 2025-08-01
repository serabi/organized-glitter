/**
 * Comprehensive security validation tests for secureLogger redaction patterns
 * These tests must pass in the new LogTape-based system to ensure no sensitive data leaks
 * @author @serabi
 * @created 2025-08-01
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redactSensitiveData, createLogger } from '../secureLogger';

interface TestEnv {
  DEV: boolean;
  [key: string]: unknown;
}

interface RedactedResult {
  [key: string]: unknown;
}

interface TestData {
  [key: string]: unknown;
}

describe('SecureLogger Security Validation', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let mockEnv: TestEnv;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockEnv = { DEV: true };
    // Mock development environment
    vi.stubGlobal('import.meta', { env: { ...mockEnv, DEV: true } });
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  describe('Sensitive Key Pattern Redaction - All 13 Patterns', () => {
    const sensitiveKeys = [
      'key',
      'token', 
      'secret',
      'password',
      'auth',
      'authorization',  
      'vite_supabase_anon_key',
      'supabase_anon_key',
      'api_key',
      'apikey'
    ];

    it.each(sensitiveKeys)('should redact object property: %s', (keyName) => {
      const testData: TestData = {
        [keyName]: 'super-secret-value-123',
        safeProperty: 'safe-value'
      };

      const result = redactSensitiveData(testData) as RedactedResult;
      
      expect(result[keyName]).toBe('[REDACTED]');
      expect(result.safeProperty).toBe('safe-value');
    });

    it.each(sensitiveKeys)('should redact nested object property: %s', (keyName) => {
      const testData = {
        user: {
          profile: {
            [keyName]: 'nested-secret-value',
            name: 'John Doe'
          }
        }
      };

      const result = redactSensitiveData(testData) as RedactedResult;
      const user = result.user as RedactedResult;
      const profile = user.profile as RedactedResult;
      
      expect(profile[keyName]).toBe('[REDACTED]');
      expect(profile.name).toBe('John Doe');
    });

    it.each(sensitiveKeys)('should be case-insensitive for key: %s', (keyName) => {
      const variations = [
        keyName.toUpperCase(),
        keyName.toLowerCase(),
        keyName.charAt(0).toUpperCase() + keyName.slice(1)
      ];

      variations.forEach(variation => {
        const testData: TestData = { [variation]: 'secret-value' };
        const result = redactSensitiveData(testData) as RedactedResult;
        expect(result[variation]).toBe('[REDACTED]');
      });
    });

    it('should handle compound sensitive keys', () => {
      const testData: TestData = {
        user_api_key: 'secret123',
        auth_token_value: 'token456',
        database_password_hash: 'hash789',
        vite_secret_config: 'config000'
      };

      const result = redactSensitiveData(testData) as RedactedResult;
      
      expect(result).toEqual({
        user_api_key: '[REDACTED]',
        auth_token_value: '[REDACTED]',
        database_password_hash: '[REDACTED]',
        vite_secret_config: '[REDACTED]'
      });
    });
  });

  describe('String Pattern Redaction - Regex Pattern Validation', () => {
    it('should redact string patterns with equals assignment', () => {
      const testString = 'API_KEY=abc123defg456hijklmnop';
      const result = redactSensitiveData(testString);
      expect(result).toBe('API_KEY=[REDACTED]');
    });

    it('should redact string patterns with colon assignment', () => {
      const testString = 'auth_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"';
      const result = redactSensitiveData(testString);
      expect(result).toBe('auth_token: "[REDACTED]"');
    });

    it('should handle multiple patterns in same string', () => {
      const testString = 'secret=mysecret123 and password:mypass456';
      const result = redactSensitiveData(testString);
      expect(result).toBe('secret=[REDACTED] and password:[REDACTED]');
    });

    it('should not redact short values (less than 10 characters)', () => {
      const testString = 'key=short';
      const result = redactSensitiveData(testString);
      expect(result).toBe('key=short'); // Not redacted because "short" is < 10 chars
    });

    it('should handle quoted values', () => {
      const testCases = [
        'token="long_secret_value_here"',
        'password=\'another_secret_12345\'',
        'key=unquoted_secret_value'
      ];

      testCases.forEach(testCase => {
        const result = redactSensitiveData(testCase) as string;
        expect(result).toContain('[REDACTED]');
        expect(result).not.toContain('secret');
      });
    });
  });

  describe('Circular Reference Protection', () => {
    it('should handle direct circular references', () => {
      const objA: TestData = { name: 'A' };
      objA.self = objA;

      const result = redactSensitiveData(objA) as RedactedResult;
      
      expect(result.name).toBe('A');
      expect(result.self).toBe('[Circular Reference]');
    });

    it('should handle indirect circular references', () => {
      const objA: TestData = { name: 'A', token: 'secret123' };
      const objB: TestData = { name: 'B', parent: objA };
      objA.child = objB;

      const result = redactSensitiveData(objA) as RedactedResult;
      const child = result.child as RedactedResult;
      
      expect(result.name).toBe('A');
      expect(result.token).toBe('[REDACTED]');
      expect(child.name).toBe('B');
      expect(child.parent).toBe('[Circular Reference]');
    });

    it('should handle complex nested circular references', () => {
      const objA: TestData = { id: 'A', secret: 'secretA' };
      const objB: TestData = { id: 'B', secret: 'secretB' };
      const objC: TestData = { id: 'C', secret: 'secretC' };
      
      objA.next = objB;
      objB.next = objC;
      objC.next = objA; // Circular

      const result = redactSensitiveData(objA) as RedactedResult;
      const next1 = result.next as RedactedResult;
      const next2 = next1.next as RedactedResult;
      
      expect(result.secret).toBe('[REDACTED]');
      expect(next1.secret).toBe('[REDACTED]');
      expect(next2.secret).toBe('[REDACTED]');
      expect(next2.next).toBe('[Circular Reference]');
    });

    it('should properly clean up WeakSet after processing', () => {
      const obj: TestData = { token: 'secret123' };
      
      // Process the same object multiple times
      const result1 = redactSensitiveData(obj) as RedactedResult;
      const result2 = redactSensitiveData(obj) as RedactedResult;
      
      expect(result1).toEqual(result2);
      expect(result1.token).toBe('[REDACTED]');
    });
  });

  describe('Array and Complex Object Traversal', () => {
    it('should redact sensitive data in arrays', () => {
      const testData = [
        { id: 1, apikey: 'secret123' },
        { id: 2, token: 'token456' },
        'password=embedded789'
      ];

      const result = redactSensitiveData(testData) as RedactedResult[];
      
      expect((result[0] as RedactedResult).apikey).toBe('[REDACTED]');
      expect((result[1] as RedactedResult).token).toBe('[REDACTED]');
      expect(result[2]).toBe('password=[REDACTED]');
    });

    it('should handle nested arrays with sensitive data', () => {
      const testData = {
        users: [
          { name: 'John', credentials: [{ key: 'userkey123' }] },
          { name: 'Jane', credentials: [{ token: 'usertoken456' }] }
        ]
      };

      const result = redactSensitiveData(testData) as RedactedResult;
      const users = result.users as RedactedResult[];
      const johnCreds = (users[0] as RedactedResult).credentials as RedactedResult[];
      const janeCreds = (users[1] as RedactedResult).credentials as RedactedResult[];
      
      expect(johnCreds[0].key).toBe('[REDACTED]');
      expect(janeCreds[0].token).toBe('[REDACTED]');
      expect((users[0] as RedactedResult).name).toBe('John');
      expect((users[1] as RedactedResult).name).toBe('Jane');
    });

    it('should handle mixed data types correctly', () => {
      const testData: TestData = {
        stringData: 'auth_token=mixedtype123',
        numberData: 42,
        booleanData: true,
        nullData: null,
        undefinedData: undefined,
        objectData: { secret: 'objsecret456' },
        arrayData: ['safe', { password: 'arraysecret789' }]
      };

      const result = redactSensitiveData(testData) as RedactedResult;
      const objectData = result.objectData as RedactedResult;
      const arrayData = result.arrayData as unknown[];
      
      expect(result.stringData).toBe('auth_token=[REDACTED]');
      expect(result.numberData).toBe(42);
      expect(result.booleanData).toBe(true);
      expect(result.nullData).toBe(null);
      expect(result.undefinedData).toBe(undefined);
      expect(objectData.secret).toBe('[REDACTED]');
      expect(arrayData[0]).toBe('safe');
      expect((arrayData[1] as RedactedResult).password).toBe('[REDACTED]');
    });
  });

  describe('Edge Cases and Security Boundary Conditions', () => {
    it('should handle empty and falsy sensitive values', () => {
      const testData: TestData = {
        emptyKey: '',
        nullKey: null,
        undefinedKey: undefined,
        zeroKey: 0,
        falseKey: false,
        validKey: 'realvalue123'
      };

      const result = redactSensitiveData(testData) as RedactedResult;
      
      // Empty string should not be redacted (length check)
      expect(result.emptyKey).toBe('');
      // Null should be redacted (truthy check fails)
      expect(result.nullKey).toBe('[REDACTED]');
      // Undefined should be redacted
      expect(result.undefinedKey).toBe('[REDACTED]');
      // Zero should be redacted (truthy value)
      expect(result.zeroKey).toBe('[REDACTED]');
      // False should be redacted (truthy value)
      expect(result.falseKey).toBe('[REDACTED]');
      // Valid string should be redacted
      expect(result.validKey).toBe('[REDACTED]');
    });

    it('should handle extremely large objects without stack overflow', () => {
      // Create a deeply nested object
      const deepObj: TestData = { level: 0 };
      let current = deepObj;
      
      for (let i = 1; i < 1000; i++) {
        current.next = { level: i };
        current = current.next as TestData;
      }
      current.secret = 'deepsecret123';

      expect(() => {
        const result = redactSensitiveData(deepObj);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle prototype pollution attempts', () => {
      const maliciousData: TestData = {
        '__proto__': { polluted: true },
        'constructor': { secret: 'constructorSecret' },
        normalKey: 'normalSecret123'
      };

      const result = redactSensitiveData(maliciousData) as RedactedResult;
      const constructor = result.constructor as RedactedResult;
      
      // Should redact the key containing 'secret'
      expect(result.normalKey).toBe('[REDACTED]');
      // Should handle prototype properties safely
      expect(result.__proto__).toBeDefined();
      expect(constructor.secret).toBe('[REDACTED]');
    });
  });

  describe('Environment Variable Pattern Security', () => {
    it('should redact environment-style assignments', () => {
      const envString = `
        VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
        API_TOKEN="very-secret-token-12345"
        DATABASE_PASSWORD=mydbpass2023
        NORMAL_CONFIG=safeconfigvalue
      `;

      const result = redactSensitiveData(envString) as string;
      
      expect(result).toContain('VITE_SUPABASE_ANON_KEY=[REDACTED]');
      expect(result).toContain('API_TOKEN="[REDACTED]"');
      expect(result).toContain('DATABASE_PASSWORD=[REDACTED]');
      expect(result).toContain('NORMAL_CONFIG=safeconfigvalue');
    });

    it('should handle JSON-style configuration with sensitive keys', () => {
      const jsonConfig: TestData = {
        database: {
          host: 'localhost',
          password: 'dbpassword123',
          apiKey: 'dbapikey456'
        },
        authentication: {
          jwtSecret: 'jwtsecret789',
          sessionTimeout: 3600
        }
      };

      const result = redactSensitiveData(jsonConfig) as RedactedResult;
      const database = result.database as RedactedResult;
      const authentication = result.authentication as RedactedResult;
      
      expect(database.host).toBe('localhost');
      expect(database.password).toBe('[REDACTED]');
      expect(database.apiKey).toBe('[REDACTED]');
      expect(authentication.jwtSecret).toBe('[REDACTED]');
      expect(authentication.sessionTimeout).toBe(3600);
    });
  });

  describe('Logger Integration Security', () => {
    it('should redact sensitive data in logger calls', () => {
      const logger = createLogger('TestModule');
      const sensitiveData: TestData = {
        userId: '12345',
        userToken: 'sensitive-token-value',
        preferences: { theme: 'dark' }
      };

      logger.info('User data:', sensitiveData);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[TestModule] ',
        'User data:',
        expect.objectContaining({
          userId: '12345',
          userToken: '[REDACTED]',
          preferences: { theme: 'dark' }
        })
      );
    });

    it('should handle multiple arguments with mixed sensitive data', () => {
      const logger = createLogger('SecurityTest');
      
      logger.warn(
        'Processing request',
        { requestId: 'req-123' },
        'with auth token: secret-auth-token-12345',
        { debugInfo: { apiKey: 'debug-key-67890' } }
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SecurityTest] ',
        'Processing request',
        { requestId: 'req-123' },
        'with auth token: [REDACTED]',
        { debugInfo: { apiKey: '[REDACTED]' } }
      );
    });
  });

  describe('Critical Error Production Logging', () => {
    it('should still redact sensitive data in production critical errors', () => {
      // Mock production environment
      vi.stubGlobal('import.meta', { env: { ...mockEnv, DEV: false } });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const logger = createLogger('CriticalTest');
      const errorData: TestData = {
        message: 'Database connection failed',
        connectionString: 'postgres://user:password123@localhost:5432/db',
        apiKey: 'error-api-key-789'
      };

      logger.criticalError('Critical system error:', errorData);

      expect(errorSpy).toHaveBeenCalledWith(
        '[CriticalTest] ',
        'Critical system error:',
        expect.objectContaining({
          message: 'Database connection failed',
          connectionString: 'postgres://user:[REDACTED]@localhost:5432/db',
          apiKey: '[REDACTED]'
        })
      );

      errorSpy.mockRestore();
    });
  });
});