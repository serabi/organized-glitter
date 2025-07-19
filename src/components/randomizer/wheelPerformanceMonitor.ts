/**
 * @fileoverview Performance monitoring utilities for OptimizedWheel component
 *
 * Provides specialized performance tracking for wheel rendering, animation,
 * and user interaction metrics to help optimize the randomizer experience.
 *
 * @author serabi
 * @version 1.0.0
 * @since 2025-01-19
 */

import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('WheelPerformanceMonitor');

/**
 * Performance metrics for wheel operations
 */
export interface WheelPerformanceMetrics {
  renderTime: number;
  animationFrameTime: number;
  projectCount: number;
  renderMode: 'css' | 'canvas';
  memoryUsage?: number;
  userInteractionTime?: number;
  spinDuration?: number;
}

/**
 * Performance thresholds for wheel operations
 */
export const WHEEL_PERFORMANCE_THRESHOLDS = {
  RENDER_TIME_WARNING: 16.67, // 60fps target
  RENDER_TIME_CRITICAL: 33.33, // 30fps minimum
  MEMORY_WARNING_MB: 50,
  MEMORY_CRITICAL_MB: 100,
  ANIMATION_FRAME_WARNING: 16.67,
  SPIN_DURATION_MAX: 5000, // 5 seconds max
} as const;

/**
 * Performance monitoring class for wheel component
 */
export class WheelPerformanceMonitor {
  private metrics: WheelPerformanceMetrics[] = [];
  private maxMetricsHistory = 50;
  private performanceObserver?: PerformanceObserver;

  constructor() {
    if (import.meta.env.DEV) {
      this.initializePerformanceObserver();
    }
  }

  /**
   * Initialize performance observer for advanced metrics
   */
  private initializePerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('wheel') || entry.name.includes('randomizer')) {
            logger.debug('Performance entry detected', {
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'paint'] 
      });
    } catch (error) {
      logger.debug('Performance observer initialization failed', error);
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: WheelPerformanceMetrics): void {
    this.metrics.push({
      ...metric,
      memoryUsage: this.getCurrentMemoryUsage(),
    });

    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Check for performance issues
    this.analyzePerformance(metric);

    if (import.meta.env.DEV) {
      logger.debug('Wheel performance metric recorded', metric);
    }
  }

  /**
   * Get current memory usage if available
   */
  private getCurrentMemoryUsage(): number | undefined {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return undefined;
    }

    const memoryInfo = (performance as any).memory;
    if (!memoryInfo) return undefined;

    return Math.round(memoryInfo.usedJSHeapSize / 1048576); // Convert to MB
  }

  /**
   * Analyze performance metrics and log warnings
   */
  private analyzePerformance(metric: WheelPerformanceMetrics): void {
    const warnings: string[] = [];

    // Check render time
    if (metric.renderTime > WHEEL_PERFORMANCE_THRESHOLDS.RENDER_TIME_CRITICAL) {
      warnings.push(`Critical render time: ${metric.renderTime.toFixed(2)}ms (>${WHEEL_PERFORMANCE_THRESHOLDS.RENDER_TIME_CRITICAL}ms)`);
    } else if (metric.renderTime > WHEEL_PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING) {
      warnings.push(`Slow render time: ${metric.renderTime.toFixed(2)}ms (>${WHEEL_PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING}ms)`);
    }

    // Check memory usage
    if (metric.memoryUsage) {
      if (metric.memoryUsage > WHEEL_PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL_MB) {
        warnings.push(`Critical memory usage: ${metric.memoryUsage}MB (>${WHEEL_PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL_MB}MB)`);
      } else if (metric.memoryUsage > WHEEL_PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB) {
        warnings.push(`High memory usage: ${metric.memoryUsage}MB (>${WHEEL_PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB}MB)`);
      }
    }

    // Check animation frame time
    if (metric.animationFrameTime > WHEEL_PERFORMANCE_THRESHOLDS.ANIMATION_FRAME_WARNING) {
      warnings.push(`Slow animation frame: ${metric.animationFrameTime.toFixed(2)}ms (>${WHEEL_PERFORMANCE_THRESHOLDS.ANIMATION_FRAME_WARNING}ms)`);
    }

    // Log warnings
    if (warnings.length > 0) {
      logger.warn('Wheel performance issues detected', {
        warnings,
        metric,
        renderMode: metric.renderMode,
        projectCount: metric.projectCount,
      });

      // Suggest optimizations
      this.suggestOptimizations(metric, warnings);
    }
  }

  /**
   * Suggest performance optimizations based on metrics
   */
  private suggestOptimizations(metric: WheelPerformanceMetrics, warnings: string[]): void {
    const suggestions: string[] = [];

    // Render mode suggestions
    if (metric.renderMode === 'css' && metric.projectCount > 20) {
      suggestions.push('Consider using Canvas render mode for better performance with many projects');
    }

    if (metric.renderMode === 'canvas' && metric.renderTime > WHEEL_PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING) {
      suggestions.push('Canvas rendering is slow - consider reducing project count or simplifying graphics');
    }

    // Memory suggestions
    if (metric.memoryUsage && metric.memoryUsage > WHEEL_PERFORMANCE_THRESHOLDS.MEMORY_WARNING_MB) {
      suggestions.push('High memory usage detected - consider implementing virtualization for large project lists');
    }

    // Project count suggestions
    if (metric.projectCount > 50) {
      suggestions.push('Very high project count - consider pagination or filtering options');
    }

    if (suggestions.length > 0) {
      logger.info('Performance optimization suggestions', {
        suggestions,
        currentMetric: metric,
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageRenderTime: number;
    maxRenderTime: number;
    averageMemoryUsage: number;
    totalMetrics: number;
    renderModeDistribution: Record<string, number>;
    performanceGrade: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    if (this.metrics.length === 0) {
      return {
        averageRenderTime: 0,
        maxRenderTime: 0,
        averageMemoryUsage: 0,
        totalMetrics: 0,
        renderModeDistribution: {},
        performanceGrade: 'excellent',
      };
    }

    const renderTimes = this.metrics.map(m => m.renderTime);
    const memoryUsages = this.metrics.map(m => m.memoryUsage).filter(Boolean) as number[];
    
    const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
    const maxRenderTime = Math.max(...renderTimes);
    const averageMemoryUsage = memoryUsages.length > 0 
      ? memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length 
      : 0;

    // Calculate render mode distribution
    const renderModeDistribution = this.metrics.reduce((dist, metric) => {
      dist[metric.renderMode] = (dist[metric.renderMode] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    // Determine performance grade
    let performanceGrade: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    if (averageRenderTime > WHEEL_PERFORMANCE_THRESHOLDS.RENDER_TIME_CRITICAL) {
      performanceGrade = 'poor';
    } else if (averageRenderTime > WHEEL_PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING) {
      performanceGrade = 'fair';
    } else if (averageRenderTime > WHEEL_PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING / 2) {
      performanceGrade = 'good';
    }

    return {
      averageRenderTime,
      maxRenderTime,
      averageMemoryUsage,
      totalMetrics: this.metrics.length,
      renderModeDistribution,
      performanceGrade,
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    logger.debug('Wheel performance metrics cleared');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = undefined;
    }
    this.clearMetrics();
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): WheelPerformanceMetrics[] {
    return [...this.metrics];
  }
}

/**
 * Global wheel performance monitor instance
 */
export const wheelPerformanceMonitor = new WheelPerformanceMonitor();

/**
 * Hook for using wheel performance monitoring
 */
export function useWheelPerformanceMonitoring() {
  const recordMetric = (metric: WheelPerformanceMetrics) => {
    wheelPerformanceMonitor.recordMetric(metric);
  };

  const getPerformanceSummary = () => {
    return wheelPerformanceMonitor.getPerformanceSummary();
  };

  const clearMetrics = () => {
    wheelPerformanceMonitor.clearMetrics();
  };

  return {
    recordMetric,
    getPerformanceSummary,
    clearMetrics,
  };
}