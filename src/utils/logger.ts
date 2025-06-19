/**
 * Centralized logging utility for the application
 * Provides consistent logging with environment-based filtering
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  function?: string;
  userId?: string;
  projectId?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Debug level logging - only shown in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Info level logging - shown in development and staging
   */
  info(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.log(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Warning level logging - shown in all environments
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');
  }

  /**
   * Error level logging - shown in all environments
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails =
      error instanceof Error ? { message: error.message, stack: error.stack } : error;

    console.error(`[ERROR] ${message}`, { error: errorDetails, ...context });
  }

  /**
   * Database conversion logging - only in development
   */
  dbConversion(operation: string, _data: unknown, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[DB_CONVERSION] ${operation}`, context || '');
    }
  }

  /**
   * Service operation logging - only in development
   */
  service(operation: string, result: 'success' | 'error', context?: LogContext): void {
    if (this.isDevelopment) {
      const level = result === 'success' ? 'INFO' : 'ERROR';
      console.log(`[SERVICE] [${level}] ${operation}`, context?.component || '');
    }
  }

  /**
   * CSV import operation logging - only in development
   */
  csvImport(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[CSV IMPORT] ${message}`, context || '');
    }
  }
}

export const logger = new Logger();
export default logger;
