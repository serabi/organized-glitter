import { pb } from '@/lib/pocketbase';
import { PocketBaseUser } from '@/contexts/AuthContext.types';

/**
 * Standard authentication error message used across the application
 */
const AUTH_ERROR_MESSAGE = 'User not authenticated.';

/**
 * Authentication error class for consistent error handling
 */
export class AuthenticationError extends Error {
  constructor(message: string = AUTH_ERROR_MESSAGE) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Requires authentication using PocketBase auth store
 * Throws AuthenticationError if not authenticated
 * 
 * @throws {AuthenticationError} When pb.authStore.isValid is false
 */
export function requireValidAuthStore(): void {
  if (!pb.authStore.isValid) {
    throw new AuthenticationError();
  }
}

/**
 * Requires authentication and returns authenticated user ID
 * Throws AuthenticationError if user is not authenticated
 * 
 * @param user - User object from auth context
 * @returns The authenticated user ID
 * @throws {AuthenticationError} When user is null/undefined or has no ID
 */
export function requireAuthenticatedUser(user: PocketBaseUser | null | undefined): string {
  if (!user?.id) {
    throw new AuthenticationError();
  }
  return user.id;
}

/**
 * Type guard to check if an error is an AuthenticationError
 * 
 * @param error - Error to check
 * @returns True if error is AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Checks if the current user is authenticated using PocketBase auth store
 * 
 * @returns True if user is authenticated
 */
export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

/**
 * Gets the current authenticated user ID from PocketBase auth store
 * 
 * @returns User ID if authenticated, null otherwise
 */
export function getCurrentUserId(): string | null {
  if (!pb.authStore.isValid || !pb.authStore.record) {
    return null;
  }
  return pb.authStore.record.id;
}

/**
 * Higher-order function that wraps an async function with authentication check
 * 
 * @param fn - Async function to wrap
 * @returns Wrapped function that requires authentication
 */
export function withAuthGuard<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    requireValidAuthStore();
    return fn(...args);
  };
}