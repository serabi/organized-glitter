/**
 * Modern logging system using existing secure logger
 * @author @serabi
 * @created 2025-07-25
 */

import { createLogger, performanceLogger, batchApiLogger } from './secureLogger';

// Export simplified loggers for different modules using the existing secure system
export const authLogger = createLogger('AUTH');
export const apiLogger = createLogger('API');
export const dbLogger = createLogger('DATABASE');
export const uiLogger = createLogger('UI');

// Re-export the existing performance logger
export { performanceLogger };

// Create a performance logger that matches the expected interface
export const createPerformanceLogger = (namespace: string) => {
  const logger = createLogger(namespace);

  return {
    start: (operationId: string, description: string, queryCount?: number) => {
      const timerId = `${namespace}-${operationId}`;
      
      logger.info(`Starting: ${description}`, { operationId, queryCount });
      
      if (queryCount && queryCount > 1) {
        return {
          end: (resultCount?: number, metadata?: Record<string, unknown>) => {
            batchApiLogger.endBatchOperation(timerId, resultCount, metadata);
          },
        };
      } else {
        performanceLogger.start(timerId);
        return {
          end: (resultCount?: number, metadata?: Record<string, unknown>) => {
            performanceLogger.end(timerId, { resultCount, ...metadata });
          },
        };
      }
    },
  };
};

// Default logger
export const logger = createLogger();
