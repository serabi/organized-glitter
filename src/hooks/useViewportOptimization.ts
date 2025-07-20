/**
 * @fileoverview Viewport Optimization Hook
 *
 * Provides viewport-based performance optimizations for mobile devices,
 * including intersection observer for conditional rendering and performance monitoring.
 *
 * @author @serabi
 * @created 2025-07-20
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createLogger } from '@/utils/secureLogger';
import { useIsMobile, useWindowSize } from '@/hooks/use-mobile';

const logger = createLogger('ViewportOptimization');

interface ViewportOptimizationOptions {
  /** Threshold for intersection observer (0-1) */
  threshold?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Enable performance monitoring */
  enablePerfMonitoring?: boolean;
  /** Debounce time for resize events */
  resizeDebounce?: number;
}

interface PerformanceMetrics {
  /** Frames per second */
  fps: number;
  /** Memory usage (if available) */
  memoryUsage?: number;
  /** Render time */
  renderTime: number;
  /** Is viewport optimized */
  isOptimized: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<ViewportOptimizationOptions, 'enablePerfMonitoring'>> &
  Pick<ViewportOptimizationOptions, 'enablePerfMonitoring'> = {
  threshold: 0.1,
  rootMargin: '50px',
  enablePerfMonitoring: true,
  resizeDebounce: 250,
};

/**
 * Viewport optimization hook for mobile performance
 *
 * Provides intersection observer utilities, performance monitoring,
 * and viewport-based optimizations for mobile devices.
 *
 * @param options - Configuration options
 * @returns Viewport optimization utilities and metrics
 */
export const useViewportOptimization = (options: ViewportOptimizationOptions = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const isMobile = useIsMobile();
  const { width, height } = useWindowSize();

  const [isVisible, setIsVisible] = useState(true);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    isOptimized: false,
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const rafIdRef = useRef<number>();
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());

  /**
   * Intersection observer callback
   */
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const entry = entries[0];
    if (entry) {
      setIsIntersecting(entry.isIntersecting);
      logger.debug('Intersection changed', {
        isIntersecting: entry.isIntersecting,
        intersectionRatio: entry.intersectionRatio,
      });
    }
  }, []);

  /**
   * Performance monitoring frame callback
   */
  const measurePerformance = useCallback(() => {
    if (!opts.enablePerfMonitoring) return;

    const now = performance.now();
    const deltaTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Calculate FPS
    frameTimesRef.current.push(deltaTime);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    const avgFrameTime =
      frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
    const fps = Math.round(1000 / avgFrameTime);

    // Get memory usage if available
    let memoryUsage: number | undefined;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : undefined;
    }

    setPerfMetrics(prev => ({
      ...prev,
      fps: Math.min(fps, 60),
      memoryUsage,
      renderTime: deltaTime,
      isOptimized: fps >= 30 && (memoryUsage ? memoryUsage < 100 : true),
    }));

    rafIdRef.current = requestAnimationFrame(measurePerformance);
  }, [opts.enablePerfMonitoring]);

  /**
   * Initialize intersection observer
   */
  const observeElement = useCallback(
    (element: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!element) return;

      elementRef.current = element;
      observerRef.current = new IntersectionObserver(handleIntersection, {
        threshold: opts.threshold,
        rootMargin: opts.rootMargin,
      });

      observerRef.current.observe(element);
      logger.debug('Element observation started', {
        threshold: opts.threshold,
        rootMargin: opts.rootMargin,
      });
    },
    [handleIntersection, opts.threshold, opts.rootMargin]
  );

  /**
   * Check if component should render based on viewport optimization
   */
  const shouldRender = useCallback(
    (alwaysRender: boolean = false) => {
      if (alwaysRender) return true;
      if (!isMobile) return true; // Don't optimize on desktop
      return isIntersecting || isVisible;
    },
    [isMobile, isIntersecting, isVisible]
  );

  /**
   * Get optimized render props based on viewport
   */
  const getOptimizedProps = useCallback(() => {
    const isLowPerf =
      perfMetrics.fps < 30 || (perfMetrics.memoryUsage && perfMetrics.memoryUsage > 100);

    return {
      // Reduce animation complexity on low performance
      reduceMotion: isLowPerf,
      // Use lower quality on small/low-perf devices
      quality: isLowPerf || width < 480 ? 'low' : 'high',
      // Defer non-critical renders
      deferRender: isLowPerf && !isIntersecting,
      // Enable optimizations
      enableOptimizations: isMobile,
    };
  }, [perfMetrics, width, isMobile, isIntersecting]);

  // Initialize performance monitoring
  useEffect(() => {
    if (opts.enablePerfMonitoring) {
      rafIdRef.current = requestAnimationFrame(measurePerformance);
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [measurePerformance, opts.enablePerfMonitoring]);

  // Cleanup intersection observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Handle visibility changes (page visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
      logger.debug('Visibility changed', { isVisible: !document.hidden });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    // Intersection observer
    observeElement,
    isIntersecting,

    // Performance metrics
    perfMetrics,

    // Viewport utilities
    isVisible,
    shouldRender,
    getOptimizedProps,

    // Device info
    isMobile,
    viewport: { width, height },
  };
};

export default useViewportOptimization;
