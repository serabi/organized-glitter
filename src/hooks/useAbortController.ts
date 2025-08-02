/**
 * Reusable hook for managing AbortController instances
 * Provides proper cleanup and abort signal management for async operations
 * @author @serabi
 * @created 2025-01-01
 */

import { useEffect, useRef } from 'react';

/**
 * Hook that provides an AbortController for managing cancellable async operations
 * Automatically aborts operations when the component unmounts
 *
 * @returns Object with abort signal and manual abort function
 */
export const useAbortController = () => {
  const abortControllerRef = useRef<AbortController>(new AbortController());

  // Create new AbortController if the current one is aborted
  const getController = () => {
    if (abortControllerRef.current.signal.aborted) {
      abortControllerRef.current = new AbortController();
    }
    return abortControllerRef.current;
  };

  // Manual abort function
  const abort = () => {
    abortControllerRef.current.abort();
  };

  // Reset controller (creates a new one)
  const reset = () => {
    if (!abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current.abort();
    };
  }, []);

  return {
    signal: getController().signal,
    abort,
    reset,
    isAborted: abortControllerRef.current.signal.aborted,
  };
};

/**
 * Hook that provides an AbortController with automatic reset capability
 * Useful for hooks that need to cancel and restart operations
 *
 * @returns Object with abort signal, abort function, and reset function
 */
export const useAbortControllerWithReset = () => {
  const { signal, abort, reset, isAborted } = useAbortController();

  // Helper to check if operation should continue
  const shouldContinue = () => !signal.aborted;

  return {
    signal,
    abort,
    reset,
    isAborted,
    shouldContinue,
  };
};
