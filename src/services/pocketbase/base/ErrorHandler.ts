/**
 * Centralized error handling for PocketBase operations
 * @author @serabi
 * @created 2025-01-16
 */

import { ClientResponseError } from 'pocketbase';
import { PocketBaseError, ValidationError } from './types';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ErrorHandler');

export class ErrorHandler {
  /**
   * Convert PocketBase ClientResponseError to our standardized error format
   */
  static handleError(error: unknown, context?: string): PocketBaseError {
    if (error instanceof ClientResponseError) {
      return this.handleClientResponseError(error, context);
    }

    // Handle network errors
    if (error instanceof Error && error.name === 'NetworkError') {
      return {
        type: 'network',
        message: 'Network connection failed. Please check your connection and try again.',
        retryable: true,
        originalError: error instanceof ClientResponseError ? error : undefined,
      };
    }

    // Handle generic errors
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    logger.error('Unhandled error', { error, context });

    return {
      type: 'server',
      message,
      retryable: false,
      originalError: error instanceof ClientResponseError ? error : undefined,
    };
  }

  /**
   * Handle PocketBase ClientResponseError specifically
   */
  private static handleClientResponseError(
    error: ClientResponseError,
    context?: string
  ): PocketBaseError {
    const { status, data, message } = error;

    logger.error('PocketBase error', {
      status,
      message,
      data,
      context,
      url: error.url,
    });

    switch (status) {
      case 400:
        return this.handleValidationError(error);

      case 401:
        return {
          type: 'auth',
          message: 'Authentication required. Please log in and try again.',
          retryable: false,
          originalError: error,
        };

      case 403:
        return {
          type: 'permission',
          message: "You don't have permission to perform this action.",
          retryable: false,
          originalError: error,
        };

      case 404:
        return {
          type: 'not_found',
          message: 'The requested resource was not found.',
          retryable: false,
          originalError: error,
        };

      case 429:
        return {
          type: 'server',
          message: 'Too many requests. Please wait a moment and try again.',
          retryable: true,
          originalError: error,
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: 'server',
          message: 'Server error. Please try again later.',
          retryable: true,
          originalError: error,
        };

      default:
        return {
          type: 'server',
          message: message || 'An unexpected error occurred',
          retryable: false,
          originalError: error,
        };
    }
  }

  /**
   * Handle validation errors (400 status)
   */
  private static handleValidationError(error: ClientResponseError): PocketBaseError {
    const validationErrors: ValidationError[] = [];

    if (error.data && typeof error.data === 'object') {
      Object.entries(error.data).forEach(([field, errorData]) => {
        if (errorData && typeof errorData === 'object') {
          const fieldError = errorData as { code?: string; message?: string };
          validationErrors.push({
            code: fieldError.code || 'validation_error',
            message: fieldError.message || 'Invalid value',
            field,
          });
        }
      });
    }

    return {
      type: 'validation',
      message: this.getValidationMessage(validationErrors),
      details: { validationErrors },
      retryable: false,
      originalError: error,
    };
  }

  /**
   * Generate user-friendly message for validation errors
   */
  private static getValidationMessage(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return 'Please check your input and try again.';
    }

    if (errors.length === 1) {
      const error = errors[0];
      return error.field ? `${this.formatFieldName(error.field)}: ${error.message}` : error.message;
    }

    return `Please fix the following errors: ${errors
      .map(e => (e.field ? `${this.formatFieldName(e.field)}: ${e.message}` : e.message))
      .join(', ')}`;
  }

  /**
   * Format field names for user display
   */
  private static formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: PocketBaseError): boolean {
    return error.retryable;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: PocketBaseError): string {
    return error.message;
  }

  /**
   * Log error for debugging (in development only)
   */
  static logError(error: PocketBaseError, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      logger.error('PocketBase operation failed', {
        type: error.type,
        message: error.message,
        details: error.details,
        context,
        originalError: error.originalError,
      });
    }
  }

  /**
   * Create a standardized error for common scenarios
   */
  static createError(
    type: PocketBaseError['type'],
    message: string,
    retryable: boolean = false,
    details?: Record<string, unknown>
  ): PocketBaseError {
    return {
      type,
      message,
      retryable,
      details,
    };
  }

  /**
   * Handle async operations with error transformation
   */
  static async handleAsync<T>(operation: () => Promise<T>, context?: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handleError(error, context);
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context?: string
  ): Promise<T> {
    let lastError: PocketBaseError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError =
          error instanceof Error ? this.handleError(error, context) : (error as PocketBaseError);

        if (!this.isRetryable(lastError) || attempt === maxRetries) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        logger.debug(
          `Retrying operation after ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}
