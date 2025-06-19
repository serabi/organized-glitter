/**
 * Chunk Loading Retry Utility
 * Handles failed JavaScript chunk loading with retry logic
 */

interface ChunkErrorEvent extends Event {
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Track failed chunks to prevent infinite retries
const failedChunks = new Set<string>();
const retryAttempts = new Map<string, number>();

/**
 * Extract chunk name from error or URL
 */
const getChunkIdentifier = (error: Error | Event, url?: string): string => {
  if (url) {
    const match = url.match(/assets\/(index-[^.]+\.js)/);
    if (match) return match[1];
  }

  if (error instanceof Error) {
    const match = error.message.match(/assets\/(index-[^.]+\.js)/);
    if (match) return match[1];
  }

  return 'unknown-chunk';
};

/**
 * Reload the page as a last resort
 */
const reloadPage = (): void => {
  console.warn('🔄 Reloading page due to chunk loading failures');
  window.location.reload();
};

/**
 * Retry loading a failed chunk
 */
const retryChunk = async (chunkId: string): Promise<void> => {
  const currentAttempts = retryAttempts.get(chunkId) || 0;

  if (currentAttempts >= MAX_RETRIES) {
    console.error(`❌ Max retries exceeded for chunk: ${chunkId}`);
    failedChunks.add(chunkId);

    // If multiple chunks have failed, reload the page
    if (failedChunks.size >= 3) {
      reloadPage();
    }
    return;
  }

  retryAttempts.set(chunkId, currentAttempts + 1);

  console.log(`🔄 Retrying chunk load (${currentAttempts + 1}/${MAX_RETRIES}): ${chunkId}`);

  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (currentAttempts + 1)));

  try {
    // Try to re-import the chunk
    const chunkUrl = `/assets/${chunkId}`;

    // Create a script element to test if the chunk is available
    const script = document.createElement('script');
    script.src = chunkUrl;
    script.async = true;

    const loadPromise = new Promise<void>((resolve, reject) => {
      script.onload = () => {
        console.log(`✅ Successfully reloaded chunk: ${chunkId}`);
        retryAttempts.delete(chunkId);
        document.head.removeChild(script);
        resolve();
      };

      script.onerror = () => {
        document.head.removeChild(script);
        reject(new Error(`Failed to reload chunk: ${chunkId}`));
      };
    });

    document.head.appendChild(script);
    await loadPromise;
  } catch (error) {
    console.error(`❌ Failed to retry chunk: ${chunkId}`, error);
    await retryChunk(chunkId); // Recursive retry
  }
};

/**
 * Handle chunk loading errors
 */
const handleChunkError = async (error: Error | Event, url?: string): Promise<void> => {
  const chunkId = getChunkIdentifier(error, url);

  // Skip if we've already marked this chunk as permanently failed
  if (failedChunks.has(chunkId)) {
    return;
  }

  console.warn(`⚠️ Chunk loading failed: ${chunkId}`, error);

  // Track the error for analytics
  if (typeof window !== 'undefined' && 'posthog' in window) {
    (
      window as Window & {
        posthog?: { capture: (event: string, data: Record<string, unknown>) => void };
      }
    ).posthog?.capture('chunk_load_error', {
      chunk_id: chunkId,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      retry_attempt: retryAttempts.get(chunkId) || 0,
      user_agent: navigator.userAgent,
      url: window.location.href,
    });
  }

  await retryChunk(chunkId);
};

/**
 * Initialize chunk loading error handling
 */
export const initializeChunkLoadingRetry = (): void => {
  // Handle unhandled promise rejections (common for dynamic imports)
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason;

    // Check if this is a chunk loading error
    if (
      error instanceof Error &&
      (error.message.includes('Loading chunk') ||
        error.message.includes('Loading failed for') ||
        error.message.includes('assets/index-'))
    ) {
      event.preventDefault(); // Prevent the error from being logged to console
      handleChunkError(error);
    }
  });

  // Handle script loading errors
  window.addEventListener('error', (event: ChunkErrorEvent) => {
    const target = event.target;

    // Check if this is a script loading error
    if (target instanceof HTMLScriptElement && target.src && target.src.includes('assets/index-')) {
      event.preventDefault();
      handleChunkError(event, target.src);
    }
  });

  console.log('🛠️ Chunk loading retry system initialized');
};

/**
 * Reset retry state (useful for testing)
 */
export const resetChunkRetryState = (): void => {
  failedChunks.clear();
  retryAttempts.clear();
};
