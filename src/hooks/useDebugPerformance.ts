/**
 * Debug Performance Hook
 * 
 * Minimal version for debugging mobile form issues without causing performance problems
 */

import { useRef } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  startTime: number;
}

export const useDebugPerformance = (label: string, enabled: boolean = false) => {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // Simple render counting without state updates
  if (enabled) {
    renderCountRef.current += 1;
    if (renderCountRef.current <= 5) { // Only log first few renders to avoid spam
      console.log(`[Debug] ${label} render #${renderCountRef.current}`);
    }
  }

  const logEvent = (event: string, data?: unknown) => {
    if (!enabled) return;
    const timestamp = new Date().toLocaleTimeString();
    const elapsed = Date.now() - startTimeRef.current;
    console.log(`[Debug] ${timestamp} (+${elapsed}ms) - ${label}: ${event}`, data || '');
  };

  const metrics: PerformanceMetrics = {
    renderCount: renderCountRef.current,
    startTime: startTimeRef.current,
  };

  return {
    metrics,
    logEvent,
    enabled,
  };
};

export default useDebugPerformance;