/**
 * @fileoverview Tests for Wheel Performance Monitor
 *
 * Tests the performance monitoring utilities for the OptimizedWheel component
 * including metrics collection, analysis, and optimization suggestions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WheelPerformanceMonitor,
  useWheelPerformanceMonitoring,
  WHEEL_PERFORMANCE_THRESHOLDS,
  WheelPerformanceMetrics,
} from '../wheelPerformanceMonitor';

// Mock logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('WheelPerformanceMonitor', () => {
  let monitor: WheelPerformanceMonitor;

  beforeEach(() => {
    monitor = new WheelPerformanceMonitor();

    // Mock PerformanceObserver
    const MockPerformanceObserver = vi
      .fn()
      .mockImplementation((_callback: PerformanceObserverCallback) => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
      }));
    (MockPerformanceObserver as unknown).supportedEntryTypes = [
      'measure',
      'navigation',
      'resource',
    ];
    global.PerformanceObserver = MockPerformanceObserver as typeof PerformanceObserver;

    // Mock performance.memory
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 52428800, // 50MB
        totalJSHeapSize: 104857600, // 100MB
        jsHeapSizeLimit: 2147483648, // 2GB
      },
      configurable: true,
    });
  });

  afterEach(() => {
    monitor.destroy();
    vi.clearAllMocks();
  });

  describe('Metric Recording', () => {
    it('records performance metrics correctly', () => {
      const metric: WheelPerformanceMetrics = {
        renderTime: 15.5,
        animationFrameTime: 12.3,
        projectCount: 10,
        renderMode: 'css',
      };

      monitor.recordMetric(metric);
      const summary = monitor.getPerformanceSummary();

      expect(summary.totalMetrics).toBe(1);
      expect(summary.averageRenderTime).toBe(15.5);
      expect(summary.maxRenderTime).toBe(15.5);
      expect(summary.renderModeDistribution.css).toBe(1);
    });

    it('includes memory usage in metrics', () => {
      const metric: WheelPerformanceMetrics = {
        renderTime: 10,
        animationFrameTime: 8,
        projectCount: 5,
        renderMode: 'css',
      };

      monitor.recordMetric(metric);
      const exportedMetrics = monitor.exportMetrics();

      expect(exportedMetrics[0].memoryUsage).toBe(50); // 50MB
    });

    it('limits metrics history to prevent memory leaks', () => {
      // Record more than the max history
      for (let i = 0; i < 60; i++) {
        monitor.recordMetric({
          renderTime: i,
          animationFrameTime: i,
          projectCount: 10,
          renderMode: 'css',
        });
      }

      const summary = monitor.getPerformanceSummary();
      expect(summary.totalMetrics).toBe(50); // Should be limited to maxMetricsHistory
    });
  });

  describe('Performance Analysis', () => {
    it('detects slow render times', () => {
      const slowMetric: WheelPerformanceMetrics = {
        renderTime: 50, // Above critical threshold
        animationFrameTime: 10,
        projectCount: 20,
        renderMode: 'css',
      };

      // Should log warning for slow render time
      monitor.recordMetric(slowMetric);

      const summary = monitor.getPerformanceSummary();
      expect(summary.performanceGrade).toBe('poor');
    });

    it('detects high memory usage', () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 125829120, // 120MB
          totalJSHeapSize: 209715200, // 200MB
          jsHeapSizeLimit: 2147483648, // 2GB
        },
        configurable: true,
      });

      const metric: WheelPerformanceMetrics = {
        renderTime: 10,
        animationFrameTime: 8,
        projectCount: 50,
        renderMode: 'canvas',
      };

      monitor.recordMetric(metric);
      const exportedMetrics = monitor.exportMetrics();

      expect(exportedMetrics[0].memoryUsage).toBe(120); // 120MB
    });

    it('calculates performance grades correctly', () => {
      // Excellent performance
      monitor.recordMetric({
        renderTime: 5,
        animationFrameTime: 4,
        projectCount: 10,
        renderMode: 'css',
      });

      expect(monitor.getPerformanceSummary().performanceGrade).toBe('excellent');

      // Poor performance
      monitor.recordMetric({
        renderTime: 40,
        animationFrameTime: 35,
        projectCount: 10,
        renderMode: 'css',
      });

      expect(monitor.getPerformanceSummary().performanceGrade).toBe('poor');
    });
  });

  describe('Performance Summary', () => {
    it('calculates correct averages', () => {
      const metrics = [
        { renderTime: 10, animationFrameTime: 8, projectCount: 5, renderMode: 'css' as const },
        { renderTime: 20, animationFrameTime: 15, projectCount: 10, renderMode: 'canvas' as const },
        { renderTime: 15, animationFrameTime: 12, projectCount: 8, renderMode: 'css' as const },
      ];

      metrics.forEach(metric => monitor.recordMetric(metric));

      const summary = monitor.getPerformanceSummary();

      expect(summary.averageRenderTime).toBe(15); // (10 + 20 + 15) / 3
      expect(summary.maxRenderTime).toBe(20);
      expect(summary.totalMetrics).toBe(3);
      expect(summary.renderModeDistribution.css).toBe(2);
      expect(summary.renderModeDistribution.canvas).toBe(1);
    });

    it('handles empty metrics gracefully', () => {
      const summary = monitor.getPerformanceSummary();

      expect(summary.averageRenderTime).toBe(0);
      expect(summary.maxRenderTime).toBe(0);
      expect(summary.totalMetrics).toBe(0);
      expect(summary.performanceGrade).toBe('excellent');
    });
  });

  describe('Cleanup', () => {
    it('clears metrics correctly', () => {
      monitor.recordMetric({
        renderTime: 10,
        animationFrameTime: 8,
        projectCount: 5,
        renderMode: 'css',
      });

      expect(monitor.getPerformanceSummary().totalMetrics).toBe(1);

      monitor.clearMetrics();

      expect(monitor.getPerformanceSummary().totalMetrics).toBe(0);
    });

    it('destroys resources properly', () => {
      const disconnectSpy = vi.fn();

      // Mock PerformanceObserver with disconnect spy
      const MockPerformanceObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: disconnectSpy,
      }));
      (MockPerformanceObserver as unknown).supportedEntryTypes = [
        'measure',
        'navigation',
        'resource',
      ];
      global.PerformanceObserver = MockPerformanceObserver as typeof PerformanceObserver;

      const testMonitor = new WheelPerformanceMonitor();
      testMonitor.destroy();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Export Functionality', () => {
    it('exports metrics correctly', () => {
      const metric: WheelPerformanceMetrics = {
        renderTime: 15,
        animationFrameTime: 12,
        projectCount: 10,
        renderMode: 'css',
      };

      monitor.recordMetric(metric);
      const exported = monitor.exportMetrics();

      expect(exported).toHaveLength(1);
      expect(exported[0].renderTime).toBe(15);
      expect(exported[0].renderMode).toBe('css');
    });
  });
});

describe('useWheelPerformanceMonitoring Hook', () => {
  it('provides correct interface', () => {
    const hook = useWheelPerformanceMonitoring();

    expect(typeof hook.recordMetric).toBe('function');
    expect(typeof hook.getPerformanceSummary).toBe('function');
    expect(typeof hook.clearMetrics).toBe('function');
  });

  it('records metrics through hook', () => {
    const hook = useWheelPerformanceMonitoring();

    const metric: WheelPerformanceMetrics = {
      renderTime: 10,
      animationFrameTime: 8,
      projectCount: 5,
      renderMode: 'css',
    };

    hook.recordMetric(metric);
    const summary = hook.getPerformanceSummary();

    expect(summary.totalMetrics).toBe(1);
    expect(summary.averageRenderTime).toBe(10);
    expect(summary.maxRenderTime).toBe(10);
    expect(summary.renderModeDistribution).toEqual({ css: 1 });
    expect(summary.performanceGrade).toBe('excellent');
  });
});

describe('Performance Thresholds', () => {
  it('defines correct threshold values', () => {
    expect(WHEEL_PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING).toBe(16.67);
    expect(WHEEL_PERFORMANCE_THRESHOLDS.RENDER_TIME_CRITICAL).toBe(33.33);
    expect(WHEEL_PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB).toBe(50);
    expect(WHEEL_PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL_MB).toBe(100);
    expect(WHEEL_PERFORMANCE_THRESHOLDS.ANIMATION_FRAME_WARNING).toBe(16.67);
    expect(WHEEL_PERFORMANCE_THRESHOLDS.SPIN_DURATION_MAX).toBe(5000);
  });
});
