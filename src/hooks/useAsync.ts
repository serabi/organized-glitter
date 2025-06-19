import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * A hook for safely handling asynchronous operations in components,
 * preventing memory leaks when components unmount before operations complete.
 *
 * @returns An object with loading state, error state, and a safe executor function
 */
export function useAsync<T, E = Error>() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<E | null>(null);
  const [value, setValue] = useState<T | null>(null);

  // Use a ref to track if the component is mounted
  const mounted = useRef<boolean>(true);

  // Set mounted to false when the component unmounts
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // The execute function that wraps an async function and handles state updates
  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    if (!mounted.current) return;

    setLoading(true);
    setError(null);
    setValue(null);

    try {
      const result = await asyncFunction();

      // Only update state if the component is still mounted
      if (mounted.current) {
        setValue(result);
        return result;
      }
    } catch (e) {
      // Only update state if the component is still mounted
      if (mounted.current) {
        setError(e as E);
      }
      // Re-throw for external handling if needed
      throw e;
    } finally {
      // Only update state if the component is still mounted
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

  // A function to manually reset the state
  const reset = useCallback(() => {
    if (!mounted.current) return;

    setLoading(false);
    setError(null);
    setValue(null);
  }, []);

  return { execute, loading, error, value, reset };
}
