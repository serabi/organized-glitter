/**
 * Chunk Loading Error Handler
 * Uses Vite's official error handling with minimal fallback
 */

interface ChunkErrorEvent extends Event {
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
}

/**
 * Initialize chunk loading error handling
 * Uses Vite's official vite:preloadError handler as the primary solution
 */
export const initializeChunkLoadingRetry = (): void => {
  // Official Vite preload error handler (recommended approach)
  // This handles the vast majority of chunk loading failures
  window.addEventListener('vite:preloadError', () => {
    console.warn('🔄 Vite chunk loading failed, reloading page...');
    window.location.reload();
  });

  // Fallback for edge cases where vite:preloadError doesn't fire
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason;
    
    if (
      error instanceof Error &&
      (error.message.includes('Loading chunk') ||
        error.message.includes('Loading failed for') ||
        error.message.includes('assets/'))
    ) {
      console.warn('🔄 Chunk loading error detected, reloading page...', error.message);
      event.preventDefault();
      window.location.reload();
    }
  });

  console.log('🛠️ Chunk loading error handler initialized');
};

