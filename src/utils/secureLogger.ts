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

export { createLogger, secureLogger, createSecureEnvSummary, redactSensitiveData };

// Example Usage:
// import { secureLogger } from '@/utils/secureLogger';
// secureLogger.log('This will only appear in development');
// secureLogger.error('This error will only appear in development', new Error('Test Error'));

// const myModuleLogger = createLogger('MyModule');
// myModuleLogger.info('Info from MyModule, dev-only');
