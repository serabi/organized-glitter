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
    // Redact anything that looks like an API key, token, or secret
    return data.replace(
      /(?:key|token|secret|password|auth)[=:]\s*['"]*([a-zA-Z0-9_-]{10,})['"]*\s*/gi,
      (match, captured) => match.replace(captured, '[REDACTED]')
    );
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

      // Handle regular objects
      const redacted = { ...(data as Record<string, unknown>) };

      // Redact sensitive keys
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
        'apikey',
      ];

      for (const [key, value] of Object.entries(redacted)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
          if (typeof value === 'string' && value.length > 0) {
            redacted[key] = '[REDACTED]';
          } else if (value) {
            redacted[key] = '[REDACTED]';
          }
        } else if (value && typeof value === 'object') {
          redacted[key] = redactSensitiveData(value, visitedSet);
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
