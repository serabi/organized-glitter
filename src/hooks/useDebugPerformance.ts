/**
 * Debug Performance Hook
 * 
 * Tracks performance metrics for debugging mobile form issues
 */

import { useState, useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  memoryUsage: {
    used: string;
    total: string;
    limit: string;
  } | null;
  recentRenderTimes: number[];
  isHighFrequencyRendering: boolean;
}

export const useDebugPerformance = (label: string, enabled: boolean = false) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    memoryUsage: null,
    recentRenderTimes: [],
    isHighFrequencyRendering: false,
  });

  const lastRenderTime = useRef<number>(Date.now());
  const renderTimes = useRef<number[]>([]);
  const renderCountRef = useRef(0);

  // Track re-renders
  useEffect(() => {
    if (!enabled) return;

    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    renderTimes.current.push(timeSinceLastRender);
    if (renderTimes.current.length > 10) {
      renderTimes.current = renderTimes.current.slice(-10);
    }
    
    lastRenderTime.current = now;
    renderCountRef.current += 1;

    const averageTime = renderTimes.current.length > 0 
      ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
      : 0;

    // Consider high frequency if average render time is < 100ms (more than 10 renders/sec)
    const isHighFrequency = averageTime < 100 && renderTimes.current.length >= 5;

    console.log(`[Debug] ${label} render #${renderCountRef.current} (+${timeSinceLastRender}ms)${isHighFrequency ? ' [HIGH FREQUENCY]' : ''}`);

    setMetrics(prev => ({
      ...prev,
      renderCount: renderCountRef.current,
      averageRenderTime: averageTime,
      recentRenderTimes: [...renderTimes.current],
      isHighFrequencyRendering: isHighFrequency,
    }));
  }, [enabled, label]);

  // Track memory usage
  useEffect(() => {
    if (!enabled) return;

    const updateMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: {
            used: (memory.usedJSHeapSize / 1048576).toFixed(1) + 'MB',
            total: (memory.totalJSHeapSize / 1048576).toFixed(1) + 'MB',
            limit: (memory.jsHeapSizeLimit / 1048576).toFixed(1) + 'MB',
          }
        }));
      }
    };

    updateMemory();
    const interval = setInterval(updateMemory, 2000);
    return () => clearInterval(interval);
  }, [enabled]);

  const logEvent = (event: string, data?: any) => {
    if (!enabled) return;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[Debug] ${timestamp} - ${label}: ${event}`, data || '');
  };

  return {
    metrics,
    logEvent,
    enabled,
  };
};

export default useDebugPerformance;