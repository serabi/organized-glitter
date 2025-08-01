import { logger } from '@/utils/logger';

/**
 * Global error handlers for unhandled promise rejections and JavaScript errors
 * This helps prevent console spam and provides better error tracking
 */

let errorReportingInitialized = false;

export function initializeErrorHandling(): void {
  if (errorReportingInitialized) {
    return;
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason;

    // Check if this is an image loading error that we can safely ignore
    if (error instanceof Error && error.message.includes('Failed to load image:')) {
      logger.warn('Image loading failed (handled):', { message: error.message });
      event.preventDefault(); // Prevent the error from being logged as unhandled
      return;
    }

    // For tunnel errors, also handle gracefully
    if (
      error instanceof Error &&
      (error.message.includes('tunnel') || error.message.includes('500'))
    ) {
      logger.warn('Tunnel error (handled):', { message: error.message });
      event.preventDefault();
      return;
    }

    // Log other unhandled rejections for debugging
    logger.criticalError('Unhandled promise rejection:', error);

    // You can report to your error tracking service here
    // For now, we'll just prevent the browser's default handling
    // event.preventDefault();
  });

  // Handle general JavaScript errors
  window.addEventListener('error', event => {
    const { message, filename, lineno, colno, error } = event;

    // Filter out image loading errors
    if (
      message.includes('Failed to load image:') ||
      filename?.includes('image') ||
      error?.message?.includes('Failed to load image:')
    ) {
      logger.warn('Image error handled:', { message, filename, lineno, colno });
      return;
    }

    // Log other errors
    logger.error('JavaScript error:', { message, filename, lineno, colno, error });
  });

  errorReportingInitialized = true;
  logger.info('Global error handling initialized');
}

/**
 * Safely handle promise rejections by wrapping async operations
 */
export function safeAsync<T>(promise: Promise<T>, fallback?: T): Promise<T | undefined> {
  return promise.catch(error => {
    logger.warn('Async operation failed safely:', error);
    return fallback;
  });
}

/**
 * Create a safe image loader that won't throw unhandled rejections
 */
export function safeImageLoad(src: string): Promise<{ success: boolean; error?: Error }> {
  return new Promise(resolve => {
    const img = new Image();

    img.onload = () => {
      resolve({ success: true });
    };

    img.onerror = () => {
      const error = new Error(`Failed to load image: ${src}`);
      logger.warn('Safe image load failed:', { src, event: 'error' });
      resolve({ success: false, error });
    };

    img.src = src;
  });
}

export default {
  initializeErrorHandling,
  safeAsync,
  safeImageLoad,
};
