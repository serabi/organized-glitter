import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';
import { queuedPbRequest } from '@/utils/rateLimit';

// PocketBase error interface
export interface PocketBaseError {
  status?: number;
  message?: string;
  data?: {
    message?: string;
    data?: Record<string, { message?: string; code?: string }>;
  };
  isAbort?: boolean;
}

// Generic PocketBase record interface
export interface PocketBaseRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

const baseLogger = createLogger('PocketBaseService');

export class BasePocketBaseService {
  protected pb = pb;
  protected logger = baseLogger;

  /**
   * Check if user is authenticated
   */
  protected checkAuth(): boolean {
    const isValid = this.pb.authStore.isValid;
    if (!isValid) {
      this.logger.warn('User not authenticated');
    }
    return isValid;
  }

  /**
   * Get current user ID
   */
  protected getCurrentUserId(): string | null {
    if (!this.checkAuth()) {
      return null;
    }
    return this.pb.authStore.model?.id || null;
  }

  /**
   * Get current user record
   */
  protected getCurrentUser() {
    if (!this.checkAuth()) {
      return null;
    }
    return this.pb.authStore.model;
  }

  /**
   * Handle PocketBase errors consistently
   */
  protected handleError(error: unknown, operation: string = 'operation') {
    this.logger.error(`${operation} failed:`, error);

    let errorMessage = `${operation} failed`;

    if (error && typeof error === 'object') {
      const pbError = error as PocketBaseError;
      if (pbError.data?.message) {
        errorMessage = pbError.data.message;
      } else if (pbError.message) {
        errorMessage = pbError.message;
      } else if (pbError.data?.data) {
        // Handle validation errors
        const validationErrors = pbError.data.data;
        const fieldErrors = Object.keys(validationErrors).map(field => {
          const fieldError = validationErrors[field];
          return `${field}: ${fieldError?.message || String(fieldError)}`;
        });
        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join(', ');
        }
      }
    }

    return this.createErrorResponse(errorMessage);
  }

  /**
   * Build filter string for PocketBase queries
   */
  protected buildFilter(conditions: Record<string, unknown>): string {
    const filters: string[] = [];

    Object.entries(conditions)
      .filter(([_, value]) => value !== undefined && value !== null)
      .forEach(([key, value]) => {
        // Escape quotes in string values
        const escapedValue = typeof value === 'string' ? value.replace(/"/g, '\\"') : value;
        filters.push(`${key} = "${escapedValue}"`);
      });

    return filters.join(' && ');
  }

  /**
   * Standardized response format for success
   */
  protected createSuccessResponse<T>(data: T) {
    return {
      data,
      error: null,
      status: 'success' as const,
    };
  }

  /**
   * Standardized response format for errors
   */
  protected createErrorResponse(error: string) {
    return {
      data: null,
      error: new Error(error),
      status: 'error' as const,
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  protected createResponse<T>(data: T | null, error?: string) {
    if (error) {
      return this.createErrorResponse(error);
    }
    if (data === null) {
      throw new Error(
        'Cannot create success response with null data. Use createErrorResponse instead.'
      );
    }
    return this.createSuccessResponse(data);
  }

  /**
   * Rate-limited PocketBase operation wrapper
   */
  protected async rateLimitedOperation<T>(operation: () => Promise<T>): Promise<T> {
    return queuedPbRequest(operation);
  }
}
