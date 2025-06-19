/**
 * Authentication utilities for TagService
 *
 * Extracted from TagService to reduce repetition and improve maintainability.
 * This module handles all authentication checks and user validation.
 */

import { pb } from '@/lib/pocketbase';
import { ServiceResponse, createErrorResponse } from '@/types/shared';

/**
 * Result of authentication check
 */
export interface AuthResult {
  isValid: boolean;
  userId?: string;
  error?: Error;
}

/**
 * Check if user is authenticated and return user ID
 */
export function checkAuthentication(): AuthResult {
  if (!pb.authStore.isValid) {
    return {
      isValid: false,
      error: new Error('User not authenticated'),
    };
  }

  const userId = pb.authStore.record?.id;
  if (!userId) {
    return {
      isValid: false,
      error: new Error('User not authenticated'),
    };
  }

  return {
    isValid: true,
    userId,
  };
}

/**
 * Wrapper to handle authentication and return early error response if needed
 */
export function withAuthentication<T>(
  operation: (userId: string) => Promise<ServiceResponse<T>>
): Promise<ServiceResponse<T>> {
  const auth = checkAuthentication();

  if (!auth.isValid) {
    return Promise.resolve(createErrorResponse(auth.error!));
  }

  return operation(auth.userId!);
}
