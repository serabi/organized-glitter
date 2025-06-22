/**
 * Performance Monitor Component
 * 
 * Tracks re-renders, memory usage, and performance metrics
 * to help identify mobile performance issues.
 */

import React, { useState, useEffect, useRef } from 'react';

interface PerformanceMonitorProps {
  label: string;
  trackRenders?: boolean;
  trackMemory?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  label,
  trackRenders = true,
  trackMemory = true,
}) => {
  const [renderCount, setRenderCount] = useState(0);
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [performanceEntries, setPerformanceEntries] = useState<PerformanceEntry[]>([]);
  const lastRenderTime = useRef<number>(Date.now());
  const renderTimes = useRef<number[]>([]);

  // Track re-renders
  useEffect(() => {
    if (trackRenders) {
      const now = Date.now();
      const timeSinceLastRender = now - lastRenderTime.current;
      renderTimes.current.push(timeSinceLastRender);
      
      // Keep only last 10 render times
      if (renderTimes.current.length > 10) {
        renderTimes.current = renderTimes.current.slice(-10);
      }
      
      lastRenderTime.current = now;
      setRenderCount(prev => prev + 1);
      
      console.log(`[PerformanceMonitor] ${label} re-rendered (${renderCount + 1}). Time since last: ${timeSinceLastRender}ms`);
    }
  });

  // Track memory usage (if available)
  useEffect(() => {
    if (trackMemory) {
      const updateMemoryInfo = () => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          setMemoryInfo({
            usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2), // MB
            totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2), // MB
            jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2), // MB
          });
        }
      };

      updateMemoryInfo();
      const interval = setInterval(updateMemoryInfo, 1000);
      return () => clearInterval(interval);
    }
  }, [trackMemory]);

  // Track performance entries
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      setPerformanceEntries(prev => [...prev.slice(-20), ...entries].slice(-20));
    });

    try {
      observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    } catch (e) {
      console.warn('PerformanceObserver not supported:', e);
    }

    return () => observer.disconnect();
  }, []);

  const averageRenderTime = renderTimes.current.length > 0 
    ? (renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length).toFixed(2)
    : '0';

  return (
    <div style={{ 
      padding: '10px', 
      margin: '10px 0',
      border: '1px solid #6c757d', 
      borderRadius: '4px', 
      backgroundColor: '#f8f9fa',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Performance Monitor: {label}</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        {trackRenders && (
          <div>
            <strong>Render Stats:</strong>
            <br />
            Count: {renderCount}
            <br />
            Avg Time: {averageRenderTime}ms
            <br />
            Last Times: {renderTimes.current.slice(-3).join(', ')}ms
          </div>
        )}

        {trackMemory && memoryInfo && (
          <div>
            <strong>Memory Usage:</strong>
            <br />
            Used: {memoryInfo.usedJSHeapSize} MB
            <br />
            Total: {memoryInfo.totalJSHeapSize} MB
            <br />
            Limit: {memoryInfo.jsHeapSizeLimit} MB
          </div>
        )}

        <div>
          <strong>Browser Info:</strong>
          <br />
          Touch Points: {navigator.maxTouchPoints}
          <br />
          Cores: {navigator.hardwareConcurrency || 'Unknown'}
          <br />
          Connection: {(navigator as any).connection?.effectiveType || 'Unknown'}
        </div>
      </div>

      {performanceEntries.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <strong>Recent Performance Entries:</strong>
          <div style={{ maxHeight: '100px', overflowY: 'auto', marginTop: '5px' }}>
            {performanceEntries.slice(-5).map((entry, index) => (
              <div key={index} style={{ fontSize: '10px', color: '#6c757d' }}>
                {entry.entryType}: {entry.name} ({entry.duration?.toFixed(2)}ms)
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;