/**
 * Render guards utility to prevent excessive re-renders
 * @author @serabi
 * @created 2025-07-09
 */

import { useRef } from 'react';
import { createLogger } from './secureLogger';

const logger = createLogger('RenderGuards');

/**
 * Hook to track and warn about excessive re-renders
 */
export const useRenderGuard = (componentName: string, threshold: number = 10) => {
  const renderCountRef = useRef(0);
  const lastWarningTimeRef = useRef(0);
  const resetTimeRef = useRef(Date.now());

  renderCountRef.current += 1;

  // Reset counter every 10 seconds to allow for normal operation
  const now = Date.now();
  if (now - resetTimeRef.current > 10000) {
    renderCountRef.current = 1;
    resetTimeRef.current = now;
  }

  // Only warn once per 5 seconds to avoid spam
  if (renderCountRef.current > threshold) {
    const timeSinceLastWarning = now - lastWarningTimeRef.current;
    if (timeSinceLastWarning > 5000) {
      logger.warn(`🚨 ${componentName} excessive re-renders detected:`, {
        renderCount: renderCountRef.current,
        threshold,
        timeSinceReset: now - resetTimeRef.current,
      });
      lastWarningTimeRef.current = now;
    }
  }

  return {
    renderCount: renderCountRef.current,
    isExcessive: renderCountRef.current > threshold,
  };
};

/**
 * Throttle logging to prevent log spam
 */
export const useThrottledLogger = (componentName: string, intervalMs: number = 1000) => {
  const lastLogTimeRef = useRef(0);
  const logCountRef = useRef(0);

  const shouldLog = (force: boolean = false) => {
    const now = Date.now();
    const timeSinceLastLog = now - lastLogTimeRef.current;
    logCountRef.current += 1;

    // Log first 3 calls or after interval
    if (force || logCountRef.current <= 3 || timeSinceLastLog > intervalMs) {
      lastLogTimeRef.current = now;
      return true;
    }

    return false;
  };

  return { shouldLog };
};
