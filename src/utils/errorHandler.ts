import { handleRateLimitError as checkRateLimit, RateLimitInfo } from './rateLimit';
import { logger } from '@/utils/logger';

type NotificationHandler = (
  message: string,
  type: 'error' | 'warning' | 'info' | 'success'
) => void;

let notificationHandler: NotificationHandler | null = null;

/**
 * Sets up the global error handler
 * @param handler Function to handle notifications
 */
export function setupErrorHandler(handler: NotificationHandler) {
  notificationHandler = handler;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Handle uncaught exceptions
  window.addEventListener('error', handleError);
}

/**
 * Handles unhandled promise rejections
 */
async function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const error = event.reason;
  const rateLimitInfo = checkRateLimit(error);

  if (rateLimitInfo) {
    event.preventDefault();
    showNotification(rateLimitInfo);
  }
}

/**
 * Handles uncaught exceptions
 */
function handleError(event: ErrorEvent) {
  const error = event.error;
  const rateLimitInfo = checkRateLimit(error);

  if (rateLimitInfo) {
    event.preventDefault();
    showNotification(rateLimitInfo);
    return true; // Prevent default error handling
  }

  return false;
}

/**
 * Shows a notification to the user
 */
function showNotification(rateLimitInfo: RateLimitInfo) {
  if (notificationHandler) {
    notificationHandler(rateLimitInfo.message, 'warning');
  } else {
    logger.warn('Rate limited:', rateLimitInfo.message);
  }
}

// Define a more specific generic function type
type AnyFunction = (...args: unknown[]) => Promise<unknown>;

/**
 * Wraps a function with error handling
 */
export function withErrorHandling<T extends AnyFunction>(
  fn: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async function (...args: Parameters<T>) {
    try {
      return (await fn(...args)) as Awaited<ReturnType<T>>;
    } catch (error) {
      const rateLimitInfo = checkRateLimit(error);
      if (rateLimitInfo) {
        showNotification(rateLimitInfo);
      }
      throw error; // Re-throw to allow further error handling
    }
  } as (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
}
