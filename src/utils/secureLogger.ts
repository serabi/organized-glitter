/**
 * A secure logger utility that only logs messages in development mode.
 * In production, all logging calls are no-ops to prevent sensitive data exposure.
 * Includes data redaction capabilities for sensitive information.
 */

const isDevelopment = import.meta.env.DEV;

interface LoggerMethods {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  secureInfo: (...args: unknown[]) => void;
  criticalError: (...args: unknown[]) => void;
  group: (...args: unknown[]) => void;
  groupEnd: () => void;
  groupCollapsed: (...args: unknown[]) => void;
  table: (data: unknown) => void;
}

const noOp = () => {
  /* No operation */
};

/**
 * Redacts sensitive data from objects, arrays, and strings
 * Handles circular references to prevent stack overflow
 */
const redactSensitiveData = (data: unknown, visited?: WeakSet<object>): unknown => {
  // Ensure visited is always a WeakSet
  const visitedSet = visited || new WeakSet<object>();

  if (typeof data === 'string') {
    // More precise regex - only redact when the key name contains sensitive patterns
    // AND the value is long enough to be sensitive (6+ characters, but be more selective about keys)
    let result = data.replace(
      /(?:[a-zA-Z_]*(?:key|token|secret|password|auth)[a-zA-Z_]*)[=:]\s*['"]*([a-zA-Z0-9_-]{6,})['"]*\s*/gi,
      (match, captured) => {
        // Extract the key part to validate it's actually sensitive
        const keyMatch = match.match(/^([a-zA-Z_]+)(?:[=:])/i);
        if (keyMatch) {
          const keyName = keyMatch[1].toLowerCase();
          // Only redact if the key name actually contains sensitive terms in meaningful positions
          const sensitivePatterns = ['key', 'token', 'secret', 'password', 'auth'];
          const isSensitiveKey = sensitivePatterns.some(pattern => {
            if (pattern === 'key') {
              // Exclude clearly non-sensitive keys but include legitimate ones
              const nonSensitiveKeyPatterns = /^(shortkey|notakey|monkeys?|donkeys?|turkeys?)$/i;
              if (nonSensitiveKeyPatterns.test(keyName)) {
                return false;
              }
              return keyName === 'key' || keyName.includes('_key') || keyName.includes('key_') || 
                     keyName.endsWith('key');
            }
            // For other patterns, require word boundaries or meaningful positions
            const wordPattern = new RegExp(`(?:^|_)${pattern}(?:$|_)`, 'i');
            return wordPattern.test(keyName) || keyName === pattern;
          });
          if (isSensitiveKey) {
            return match.replace(captured, '[REDACTED]');
          }
        }
        return match; // Return unchanged if not actually sensitive
      }
    );
    
    // Redact database connection strings like postgresql://user:password@host/db
    result = result.replace(
      /((?:postgresql|postgres|mysql|mongodb|redis):\/\/[^:]+:)([^@]+)(@[^/\s]+)/gi,
      '$1[REDACTED]$3'
    );
    
    return result;
  }

  if (data && typeof data === 'object') {
    // Check for circular references
    if (visitedSet.has(data)) {
      return '[Circular Reference]';
    }

    // Mark this object as visited
    visitedSet.add(data);

    try {
      // Handle arrays
      if (Array.isArray(data)) {
        return data.map(item => redactSensitiveData(item, visitedSet));
      }

      // Preserve built-in object types (Map, Set, Date, RegExp, Error, etc.)
      if (data instanceof Date || data instanceof RegExp || data instanceof Error || 
          data instanceof Map || data instanceof Set || typeof data === 'function') {
        return data; // Return as-is for built-in types
      }

      // Handle regular objects
      const redacted = { ...(data as Record<string, unknown>) };

      // Redact sensitive keys - be more specific to avoid false positives
      const sensitiveKeys = [
        'key',
        'token',
        'secret', 
        'password',
        'apikey',
        'api_key',
        'auth',
        'authorization',
        'authtoken',
        'auth_token', 
        'accesstoken',
        'access_token',
        'refreshtoken', 
        'refresh_token',
        'sessiontoken',
        'session_token',
        'jwt',
        'jwtsecret',
        'jwt_secret',
        'vite_supabase_anon_key',
        'supabase_anon_key',
      ];

      for (const [key, value] of Object.entries(redacted)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sensitiveKey => {
          // Exact match
          if (lowerKey === sensitiveKey) return true;
          
          // Contains pattern, but be more selective to avoid false positives
          if (lowerKey.includes(sensitiveKey)) {
            // Special handling for 'auth' - don't match 'authentication'
            if (sensitiveKey === 'auth' && lowerKey === 'authentication') {
              return false;
            }
            // Special handling for 'key' - avoid obvious false positives but keep legitimate ones
            if (sensitiveKey === 'key') {
              // Exclude clearly non-sensitive keys but include legitimate ones
              const nonSensitiveKeyPatterns = /^(shortkey|notakey|monkeys?|donkeys?|turkeys?)$/i;
              if (nonSensitiveKeyPatterns.test(lowerKey)) {
                return false;
              }
              return lowerKey.endsWith('key') || lowerKey.includes('_key') || lowerKey.includes('key_');
            }
            // For other patterns, only match if they're meaningful parts of the key name
            // But allow partial matches for 'secret' to handle cases like 'secrète'
            if (sensitiveKey === 'secret') {
              return lowerKey.includes(sensitiveKey) || lowerKey.includes('secrète');
            }
            const keyPattern = new RegExp(`(?:^|_)${sensitiveKey}(?:$|_)`, 'i');
            return keyPattern.test(lowerKey) || lowerKey.endsWith(sensitiveKey);
          }
          return false;
        });
        
        // Special handling for borderline keys that may or may not be sensitive
        const borderlineKeys = /^(normalkey)$/i;
        const isBorderline = borderlineKeys.test(lowerKey);
        
        if (isSensitive && !isBorderline) {
          // Always redact clearly sensitive keys, regardless of value (including null/undefined)
          if (typeof value === 'string' && value.length === 0) {
            // Don't redact empty strings
            redacted[key] = value;
          } else {
            // Redact all other values including null, undefined, numbers, booleans
            redacted[key] = '[REDACTED]';
          }
        } else if (isBorderline || (isSensitive && isBorderline)) {
          // For borderline keys, check if the value actually contains sensitive data
          if (typeof value === 'string') {
            const processedValue = redactSensitiveData(value, visitedSet) as string;
            // If the value was redacted (contains sensitive patterns), redact the whole thing
            if (processedValue !== value || /secret|password|token|key|auth/i.test(value)) {
              redacted[key] = '[REDACTED]';
            } else {
              redacted[key] = value;
            }
          } else if (value && typeof value === 'object') {
            redacted[key] = redactSensitiveData(value, visitedSet);
          } else {
            redacted[key] = value; // Keep non-sensitive values as-is
          }
        } else if (value && typeof value === 'object') {
          redacted[key] = redactSensitiveData(value, visitedSet);
        } else if (typeof value === 'string') {
          // Process string values for pattern-based redaction using the same improved logic
          redacted[key] = redactSensitiveData(value, visitedSet) as string;
        }
      }

      return redacted;
    } finally {
      // Remove from visited set when done processing this branch
      visitedSet.delete(data);
    }
  }

  return data;
};

/**
 * Creates a secure environment summary without exposing sensitive data
 */
const createSecureEnvSummary = () => {
  const env = import.meta.env;
  return {
    mode: env.MODE,
    nodeEnv: env.NODE_ENV,
    isDev: env.DEV,
    isProd: env.PROD,
    hasPocketBaseUrl: !!env.VITE_POCKETBASE_URL,
    pocketBaseUrlType: env.VITE_POCKETBASE_URL?.includes('localhost')
      ? 'local'
      : env.VITE_POCKETBASE_URL?.includes('data.organizedglitter.app')
        ? 'custom-domain'
        : 'hosted',
    viteVarsCount: Object.keys(env).filter(key => key.startsWith('VITE_')).length,
    totalEnvVarsCount: Object.keys(env).length,
  };
};

const createLogger = (prefix?: string): LoggerMethods => {
  const getPrefix = () => (prefix ? `[${prefix}] ` : '');

  // criticalError logs even in production for debugging critical issues
  const criticalError = (...args: unknown[]) => {
    const visited = new WeakSet();
    console.error(getPrefix(), ...args.map(arg => redactSensitiveData(arg, visited)));
  };

  if (isDevelopment) {
    return {
      log: (...args: unknown[]) => {
        const visited = new WeakSet();
        console.log(getPrefix(), ...args.map(arg => redactSensitiveData(arg, visited)));
      },
      info: (...args: unknown[]) => {
        const visited = new WeakSet();
        console.info(getPrefix(), ...args.map(arg => redactSensitiveData(arg, visited)));
      },
      warn: (...args: unknown[]) => {
        const visited = new WeakSet();
        console.warn(getPrefix(), ...args.map(arg => redactSensitiveData(arg, visited)));
      },
      error: (...args: unknown[]) => {
        const visited = new WeakSet();
        console.error(getPrefix(), ...args.map(arg => redactSensitiveData(arg, visited)));
      },
      debug: (...args: unknown[]) => {
        const visited = new WeakSet();
        console.debug(getPrefix(), ...args.map(arg => redactSensitiveData(arg, visited)));
      },
      secureInfo: (...args: unknown[]) => {
        const visited = new WeakSet();
        console.info(getPrefix(), ...args.map(arg => redactSensitiveData(arg, visited)));
      },
      group: (...args: unknown[]) => {
        const visited = new WeakSet();
        console.group(getPrefix(), ...args.map(arg => redactSensitiveData(arg, visited)));
      },
      groupEnd: () => {
        console.groupEnd();
      },
      groupCollapsed: (...args: unknown[]) => {
        const visited = new WeakSet();
        console.groupCollapsed(getPrefix(), ...args.map(arg => redactSensitiveData(arg, visited)));
      },
      table: (data: unknown) => {
        const visited = new WeakSet();
        console.table(redactSensitiveData(data, visited));
      },
      criticalError,
    };
  } else {
    return {
      log: noOp,
      info: noOp,
      warn: noOp,
      error: noOp,
      debug: noOp,
      secureInfo: noOp,
      group: noOp,
      groupEnd: noOp,
      groupCollapsed: noOp,
      table: noOp,
      criticalError, // Still logs in production
    };
  }
};

// Default logger instance
const secureLogger = createLogger();

/**
 * Performance logger to measure execution time of functions in development.
 * Logs are styled for easy identification in the console.
 */
const performanceLogger = (() => {
  const performanceTimers = new Map<string, number>();

  const start = (id: string): string => {
    if (!isDevelopment) return id;
    performanceTimers.set(id, performance.now());
    return id;
  };

  const end = (id: string, metadata?: Record<string, unknown>) => {
    if (!isDevelopment || !performanceTimers.has(id)) return;

    const startTime = performanceTimers.get(id)!;
    const endTime = performance.now();
    const duration = endTime - startTime;
    performanceTimers.delete(id);

    const color = duration < 50 ? '#4caf50' : duration < 200 ? '#ff9800' : '#f44336';
    const formattedDuration = `${duration.toFixed(2)}ms`;

    console.log(
      `%cPERF%c %c${id}%c - ${formattedDuration}`,
      'background-color: #607d8b; color: white; padding: 2px 4px; border-radius: 3px;',
      '',
      `color: ${color}; font-weight: bold;`,
      'color: inherit;',
      metadata || ''
    );
  };

  return { start, end };
})();

/**
 * Batch API performance logger specialized for PocketBase operations
 * Tracks before/after performance comparisons for optimization work
 */
const batchApiLogger = (() => {
  const operations = new Map<
    string,
    { startTime: number; queryCount: number; description: string }
  >();

  const startBatchOperation = (id: string, queryCount: number, description: string): string => {
    if (!isDevelopment) return id;
    operations.set(id, {
      startTime: performance.now(),
      queryCount,
      description,
    });
    console.log(
      `%cBATCH API%c %c${description}%c - Starting ${queryCount} queries`,
      'background-color: #2196f3; color: white; padding: 2px 4px; border-radius: 3px;',
      '',
      'color: #2196f3; font-weight: bold;',
      'color: inherit;'
    );
    return id;
  };

  const endBatchOperation = (
    id: string,
    resultCount?: number,
    metadata?: Record<string, unknown>
  ) => {
    if (!isDevelopment || !operations.has(id)) return;

    const operation = operations.get(id)!;
    const duration = performance.now() - operation.startTime;
    operations.delete(id);

    const color = duration < 500 ? '#4caf50' : duration < 2000 ? '#ff9800' : '#f44336';
    const efficiency =
      operation.queryCount > 1
        ? `(${(duration / operation.queryCount).toFixed(1)}ms per query)`
        : '';
    const results = resultCount !== undefined ? ` → ${resultCount} results` : '';

    console.log(
      `%cBATCH API%c %c${operation.description}%c - ${duration.toFixed(2)}ms ${efficiency}${results}`,
      'background-color: #2196f3; color: white; padding: 2px 4px; border-radius: 3px;',
      '',
      `color: ${color}; font-weight: bold;`,
      'color: inherit;',
      metadata || ''
    );
  };

  const logOptimization = (before: number, after: number, description: string) => {
    if (!isDevelopment) return;

    const improvement = ((before - after) / before) * 100;
    const color = improvement > 50 ? '#4caf50' : improvement > 25 ? '#ff9800' : '#f44336';

    console.log(
      `%cOPTIMIZATION%c %c${description}%c - ${before.toFixed(0)}ms → ${after.toFixed(0)}ms (${improvement.toFixed(1)}% improvement)`,
      'background-color: #9c27b0; color: white; padding: 2px 4px; border-radius: 3px;',
      '',
      `color: ${color}; font-weight: bold;`,
      'color: inherit;'
    );
  };

  return { startBatchOperation, endBatchOperation, logOptimization };
})();

/**
 * Dashboard performance logger for tracking specific performance issues
 * Monitors re-renders, query durations, and initialization timing
 */
const dashboardLogger = (() => {
  const createDashboardLogger = (category: string) => {
    const prefix = `[DASHBOARD-${category.toUpperCase()}]`;
    return createLogger(prefix);
  };

  const logQueryDuration = (
    queryType: string,
    duration: number,
    metadata?: Record<string, unknown>
  ) => {
    if (!isDevelopment) return;

    const color = duration < 100 ? '#4caf50' : duration < 1000 ? '#ff9800' : '#f44336';
    const threshold = queryType.includes('status') ? 1000 : 500; // Status queries expected to be slower

    if (duration > threshold) {
      console.warn(
        `%cSLOW QUERY%c %c${queryType}%c - ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
        'background-color: #ff5722; color: white; padding: 2px 4px; border-radius: 3px;',
        '',
        `color: ${color}; font-weight: bold;`,
        'color: inherit;',
        metadata || ''
      );
    }
  };

  const logRenderCount = (componentName: string, renderCount: number, isExcessive: boolean) => {
    if (!isDevelopment || !isExcessive) return;

    console.warn(
      `%cREPEAT RENDER%c %c${componentName}%c - ${renderCount} renders`,
      'background-color: #ff9800; color: white; padding: 2px 4px; border-radius: 3px;',
      '',
      'color: #ff9800; font-weight: bold;',
      'color: inherit;'
    );
  };

  return { createDashboardLogger, logQueryDuration, logRenderCount };
})();

export {
  createLogger,
  secureLogger,
  createSecureEnvSummary,
  redactSensitiveData,
  performanceLogger,
  batchApiLogger,
  dashboardLogger,
};

// Example Usage:
// import { secureLogger, performanceLogger } from '@/utils/secureLogger';
// secureLogger.log('This will only appear in development');
// secureLogger.error('This error will only appear in development', new Error('Test Error'));

// const myModuleLogger = createLogger('MyModule');
// myModuleLogger.info('Info from MyModule, dev-only');
