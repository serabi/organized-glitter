import { logger } from '@/utils/logger';

export interface RateLimitInfo {
  isRateLimited: boolean;
  message: string;
  retryAfter: number;
}

// Interface for PocketBase error objects
interface PocketBaseError {
  status?: number;
  message?: string;
  retryAfter?: number;
}

// Type guard for PocketBase errors
function isPocketBaseError(error: unknown): error is PocketBaseError {
  return error !== null && typeof error === 'object' && ('status' in error || 'message' in error);
}

/**
 * Handles rate limit errors from PocketBase
 * @param error The error object from a PocketBase query
 * @returns Rate limit information if it's a rate limit error
 */
export function handleRateLimitError(error: unknown): RateLimitInfo | null {
  if (!error) return null;

  // Check for 429 status code (Too Many Requests) or rate limit messages
  if (isPocketBaseError(error)) {
    const errorObj = error;

    if (
      errorObj.status === 429 ||
      (typeof errorObj.message === 'string' &&
        (errorObj.message.includes('rate limit') || errorObj.message.includes('too many requests')))
    ) {
      // Extract retry-after from error or default to 60 seconds
      const retryAfter = errorObj.retryAfter || 60;
      return {
        isRateLimited: true,
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      };
    }
  }

  return null;
}

/**
 * Creates a wrapper function that adds automatic rate limit handling to PocketBase queries
 * @param queryFn The PocketBase query function to wrap
 * @returns A function that returns a promise with the query result and rate limit info
 */
export function withRateLimitHandling<T>(queryFn: () => Promise<T>) {
  return async () => {
    try {
      const data = await queryFn();
      return {
        data,
        error: null,
        rateLimitInfo: null,
      };
    } catch (error) {
      const rateLimitInfo = handleRateLimitError(error);

      return {
        data: null,
        error: rateLimitInfo ? null : error,
        rateLimitInfo,
      };
    }
  };
}

/**
 * Creates a delay promise
 * @param ms Milliseconds to delay
 * @returns A promise that resolves after the specified time
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simple request queue to prevent too many simultaneous requests
 */
class RequestQueue {
  private queue: Array<() => Promise<unknown>> = [];
  private running: number = 0;
  private readonly maxConcurrent: number;

  constructor(maxConcurrent: number = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const operation = this.queue.shift();

    if (operation) {
      try {
        await operation();
      } finally {
        this.running--;
        this.process(); // Process next item in queue
      }
    }
  }
}

// Global request queue - limit to 2 concurrent requests to PocketHost
export const requestQueue = new RequestQueue(2);

/**
 * Retries a function with exponential backoff when rate limited
 * @param fn The function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param initialDelay Initial delay in milliseconds
 * @returns The result of the function or throws an error if max retries are exceeded
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 2000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Check for rate limit or network errors
      const isRateLimited = handleRateLimitError(error);
      const isNetworkError =
        isPocketBaseError(error) &&
        (error.status === 429 || error.message?.includes('Failed to fetch'));

      if (!isRateLimited && !isNetworkError) {
        throw error as Error; // Re-throw if it's not a retryable error
      }

      // Calculate delay with exponential backoff + jitter
      const jitter = Math.random() * 1000;
      const delayMs = initialDelay * Math.pow(2, attempt) + jitter;
      logger.warn(
        `Request failed (attempt ${attempt + 1}/${maxRetries}). Retrying in ${Math.round(delayMs)}ms...`
      );

      // Wait before retrying
      await delay(delayMs);
    }
  }

  throw lastError as Error; // If we've exhausted all retries, throw the last error
}

/**
 * Wrapper that combines request queuing and retry logic
 */
export async function queuedPbRequest<T>(operation: () => Promise<T>): Promise<T> {
  return requestQueue.add(() => withRetry(operation));
}
