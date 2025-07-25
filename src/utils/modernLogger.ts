/**
 * Modern logging system using LogLayer
 * Replaces the entire secureLogger.ts system with a simpler, more powerful approach
 */

import { LogLayer, ConsoleTransport } from 'loglayer';
import { redactionPlugin } from '@loglayer/plugin-redaction';

const isDevelopment = import.meta.env.DEV;

// Single logger configuration that replaces all your current loggers
const createModernLogger = (namespace?: string) => {
  return new LogLayer({
    transport: new ConsoleTransport({
      logger: console,
      level: isDevelopment ? 'trace' : 'error',
    }),
    plugins: [
      redactionPlugin({
        paths: [
          'password',
          'token',
          'secret',
          'key',
          'auth',
          'authorization',
          'vite_supabase_anon_key',
          'supabase_anon_key',
          'api_key',
          'apikey',
        ],
        censor: '[REDACTED]',
      }),
    ],
    prefix: namespace ? `[${namespace}]` : undefined,
    enabled: isDevelopment,
    contextFieldName: 'context',
    metadataFieldName: 'metadata',
    consoleDebug: isDevelopment,
    errorSerializer: err => ({
      message: err.message,
      stack: err.stack,
      name: err.name,
    }),
  });
};

// Performance tracking built into LogLayer
export const createPerformanceLogger = (namespace: string) => {
  const logger = createModernLogger(namespace);

  return {
    start: (operationId: string, description: string, queryCount?: number) => {
      const startTime = performance.now();

      logger
        .withContext({ operationId, queryCount })
        .withMetadata({ startTime })
        .info(`Starting: ${description}`);

      return {
        end: (resultCount?: number, metadata?: Record<string, unknown>) => {
          const duration = performance.now() - startTime;
          const efficiency = queryCount ? duration / queryCount : undefined;

          logger
            .withContext({ operationId })
            .withMetadata({
              duration: `${duration.toFixed(2)}ms`,
              efficiency: efficiency ? `${efficiency.toFixed(1)}ms per query` : undefined,
              resultCount,
              ...metadata,
            })
            .info(`Completed: ${description}`);
        },
      };
    },
  };
};

// Export simplified loggers for different modules
export const authLogger = createModernLogger('AUTH');
export const apiLogger = createModernLogger('API');
export const dbLogger = createModernLogger('DATABASE');
export const uiLogger = createModernLogger('UI');
export const performanceLogger = createPerformanceLogger('PERFORMANCE');

// Default logger
export const logger = createModernLogger();
