/**
 * @fileoverview Optimized Randomizer Wheel Component
 *
 * A performance-optimized spinning wheel component that uses CSS-based animations
 * instead of complex SVG calculations. Features simplified selection algorithm,
 * responsive sizing with CSS custom properties, Canvas fallback for complex scenarios,
 * comprehensive memoization, and performance monitoring.
 *
 * @author serabi
 * @version 2.1.0
 * @since 2025-07-19
 */

import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types/shared';
import { createLogger } from '@/utils/secureLogger';
import { useSimplePerformanceTracking } from '@/hooks/usePerformanceMonitoring';
import { useWheelPerformanceMonitoring, WheelPerformanceMetrics } from './wheelPerformanceMonitor';
import { useAccessibilityAnnouncements, useFocusManagement } from '@/hooks/useAccessibilityAnnouncements';
import { useWheelTouchGestures } from '@/hooks/useTouchGestures';
import { useIsMobile, useIsTouchDevice } from '@/hooks/use-mobile';
import './OptimizedWheel.css';

const logger = createLogger('OptimizedWheel');

/**
 * Performance thresholds for determining render mode
 */
const PERFORMANCE_THRESHOLDS = {
  CANVAS_FALLBACK_PROJECT_COUNT: 20, // Use Canvas for >20 projects
  COMPLEX_SCENARIO_PROJECT_COUNT: 50, // Consider very complex for >50 projects
  ANIMATION_PERFORMANCE_THRESHOLD: 16.67, // Target 60fps (16.67ms per frame)
  MEMORY_THRESHOLD_MB: 50, // Switch to Canvas if memory usage exceeds this
  RENDER_TIME_THRESHOLD_MS: 33, // Switch to Canvas if render time exceeds this
} as const;

/**
 * Custom hook for responsive wheel sizing
 * Automatically adjusts wheel size based on screen dimensions
 */
const useResponsiveWheelSize = (preferredSize?: 'small' | 'medium' | 'large') => {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>(preferredSize || 'medium');

  useEffect(() => {
    if (preferredSize) {
      setSize(preferredSize);
      return;
    }

    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setSize('small');
      } else if (width < 1024) {
        setSize('medium');
      } else {
        setSize('large');
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [preferredSize]);

  return size;
};

/**
 * Brand color palette for wheel segments
 * Optimized for accessibility and visual variety
 */
const WHEEL_COLORS = [
  '#a855f7', // diamond-500 (primary lavender)
  '#f43f5e', // flamingo-500 (primary flamingo pink)
  '#f97316', // peach-500 (primary peach/orange)
  '#d946ef', // mauve-500 (primary mauve)
  '#9333ea', // diamond-600 (medium dark lavender)
  '#e11d48', // flamingo-600 (darker flamingo)
  '#ea580c', // peach-600 (darker peach)
  '#c026d3', // mauve-600 (darker mauve)
  '#7e22ce', // diamond-700 (dark lavender)
  '#be123c', // flamingo-700 (very dark flamingo)
  '#c2410c', // peach-700 (very dark peach)
  '#a21caf', // mauve-700 (very dark mauve)
] as const;

/**
 * Props interface for the OptimizedWheel component
 */
interface OptimizedWheelProps {
  /** Array of projects to display on the wheel */
  projects: Project[];
  /** Callback function called when a spin completes with the selected project */
  onSpinComplete: (selectedProject: Project) => void;
  /** Whether the wheel should be disabled (optional) */
  disabled?: boolean;
  /** Wheel size variant (optional) */
  size?: 'small' | 'medium' | 'large';
  /** Force specific render mode (optional, for testing) */
  forceRenderMode?: 'css' | 'canvas';
}

/**
 * Canvas-based wheel component for complex scenarios (many projects)
 * Provides better performance when CSS-based rendering becomes inefficient
 */
const CanvasWheel = memo<{
  projects: Project[];
  size: 'small' | 'medium' | 'large';
  isSpinning: boolean;
  spinDegrees: number;
  onPerformanceMetric: (metric: Partial<WheelPerformanceMetrics>) => void;
}>(({ projects, size, isSpinning, spinDegrees, onPerformanceMetric }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastRenderTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Memoized wheel dimensions based on size
  const dimensions = useMemo(() => {
    const sizeMap = {
      small: { width: 240, height: 240, radius: 110 },
      medium: { width: 320, height: 320, radius: 150 },
      large: { width: 480, height: 480, radius: 230 },
    };
    return sizeMap[size];
  }, [size]);

  // Memoized project segments for Canvas rendering
  const projectSegments = useMemo(() => {
    const segmentAngle = (2 * Math.PI) / projects.length;
    return projects.map((project, index) => ({
      project,
      startAngle: index * segmentAngle,
      endAngle: (index + 1) * segmentAngle,
      color: WHEEL_COLORS[index % WHEEL_COLORS.length],
      centerAngle: index * segmentAngle + segmentAngle / 2,
    }));
  }, [projects]);

  // Create offscreen canvas for better performance
  const createOffscreenCanvas = useCallback(() => {
    if (!offscreenCanvasRef.current) {
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = dimensions.width;
      offscreenCanvas.height = dimensions.height;
      offscreenCanvasRef.current = offscreenCanvas;
    }
    return offscreenCanvasRef.current;
  }, [dimensions]);

  // Canvas drawing function with performance monitoring and optimizations
  const drawWheel = useCallback(
    (currentRotation: number = 0) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const renderStartTime = performance.now();
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height, radius } = dimensions;
      const centerX = width / 2;
      const centerY = height / 2;

      // Performance optimization: Skip rendering if rotation hasn't changed significantly
      const rotationDiff = Math.abs(currentRotation - lastRenderTimeRef.current);
      if (!isSpinning && rotationDiff < 0.1) {
        return;
      }
      lastRenderTimeRef.current = currentRotation;

      // Use offscreen canvas for complex rendering when many projects
      const useOffscreen = projects.length > 30;
      const renderCanvas = useOffscreen ? createOffscreenCanvas() : canvas;
      const renderCtx = renderCanvas.getContext('2d');
      if (!renderCtx) return;

      // Clear canvas with optimized method
      if (useOffscreen) {
        renderCtx.clearRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }

      // Save context for rotation
      renderCtx.save();
      renderCtx.translate(centerX, centerY);
      renderCtx.rotate((currentRotation * Math.PI) / 180);

      // Batch drawing operations for better performance
      renderCtx.lineWidth = 2;
      renderCtx.strokeStyle = '#ffffff';

      // Draw segments with optimized batching
      projectSegments.forEach(segment => {
        renderCtx.beginPath();
        renderCtx.moveTo(0, 0);
        renderCtx.arc(0, 0, radius, segment.startAngle, segment.endAngle);
        renderCtx.closePath();
        renderCtx.fillStyle = segment.color;
        renderCtx.fill();
        renderCtx.stroke();
      });

      // Draw text in a separate pass for better performance
      renderCtx.fillStyle = '#ffffff';
      renderCtx.font = `bold ${size === 'small' ? '12' : size === 'medium' ? '14' : '16'}px sans-serif`;
      renderCtx.textAlign = 'center';
      renderCtx.textBaseline = 'middle';
      renderCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      renderCtx.shadowBlur = 2;
      renderCtx.shadowOffsetX = 1;
      renderCtx.shadowOffsetY = 1;

      projectSegments.forEach(segment => {
        renderCtx.save();
        renderCtx.rotate(segment.centerAngle);

        const textRadius = radius * 0.7;
        const maxChars = size === 'small' ? 8 : size === 'medium' ? 10 : 12;
        const text =
          segment.project.title.length > maxChars
            ? `${segment.project.title.substring(0, maxChars - 3)}...`
            : segment.project.title;

        renderCtx.fillText(text, textRadius, 0);
        renderCtx.restore();
      });

      // Reset shadow
      renderCtx.shadowColor = 'transparent';
      renderCtx.shadowBlur = 0;
      renderCtx.shadowOffsetX = 0;
      renderCtx.shadowOffsetY = 0;

      // Restore context
      renderCtx.restore();

      // Draw border
      renderCtx.beginPath();
      renderCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      renderCtx.strokeStyle = '#f43f5e';
      renderCtx.lineWidth = 4;
      renderCtx.stroke();

      // Copy from offscreen canvas if used
      if (useOffscreen && renderCanvas !== canvas) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(renderCanvas, 0, 0);
      }

      const renderTime = performance.now() - renderStartTime;
      frameCountRef.current++;

      // Only report performance metrics occasionally to avoid render loops
      if (frameCountRef.current % 10 === 0) {
        // Use setTimeout to avoid calling during render
        setTimeout(() => {
          onPerformanceMetric({
            renderTime,
            animationFrameTime: renderTime,
            renderMode: 'canvas',
            projectCount: projects.length,
            memoryUsage: useOffscreen ? Math.round((width * height * 4) / 1048576) : undefined,
          });
        }, 0);
      }

      // Log performance warnings in development (debounced)
      if (
        import.meta.env.DEV &&
        renderTime > PERFORMANCE_THRESHOLDS.ANIMATION_PERFORMANCE_THRESHOLD &&
        frameCountRef.current % 30 === 0
      ) {
        const fps = 1000 / renderTime;
        logger.warn('Canvas render performance issue', {
          renderTime: renderTime.toFixed(2),
          fps: fps.toFixed(1),
          projectCount: projects.length,
          useOffscreen,
        });
      }
    },
    [
      dimensions,
      projectSegments,
      size,
      projects.length,
      onPerformanceMetric,
      isSpinning,
      createOffscreenCanvas,
    ]
  );

  // Animation loop for spinning with performance monitoring
  useEffect(() => {
    if (!isSpinning) {
      drawWheel(spinDegrees);
      return;
    }

    const startTime = performance.now();
    const duration = 3000; // 3 seconds
    const startRotation = spinDegrees - (3 * 360 + Math.random() * 360); // Previous rotation
    const endRotation = spinDegrees;
    let frameCount = 0;

    const animate = (currentTime: number) => {
      const frameStartTime = performance.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (cubic-bezier approximation)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (endRotation - startRotation) * easeOut;

      drawWheel(currentRotation);
      frameCount++;

      const frameTime = performance.now() - frameStartTime;

      // Monitor animation performance
      if (frameTime > PERFORMANCE_THRESHOLDS.ANIMATION_PERFORMANCE_THRESHOLD) {
        onPerformanceMetric({
          animationFrameTime: frameTime,
          renderMode: 'canvas',
          projectCount: projects.length,
        });
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation completed - log final performance stats
        const totalTime = performance.now() - startTime;
        const avgFrameTime = totalTime / frameCount;

        if (import.meta.env.DEV) {
          logger.debug('Canvas animation completed', {
            totalTime: totalTime.toFixed(2),
            frameCount,
            avgFrameTime: avgFrameTime.toFixed(2),
            projectCount: projects.length,
          });
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Cleanup offscreen canvas
      if (offscreenCanvasRef.current) {
        const ctx = offscreenCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
        }
        offscreenCanvasRef.current = null;
      }
    };
  }, [isSpinning, spinDegrees, drawWheel, onPerformanceMetric, projects.length]);

  // Initial draw
  useEffect(() => {
    drawWheel(spinDegrees);
  }, [drawWheel, spinDegrees]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="wheel-canvas"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: '50%',
      }}
      aria-hidden="true"
    />
  );
});

CanvasWheel.displayName = 'CanvasWheel';

/**
 * Individual memoized wheel label component
 * Prevents unnecessary re-renders of individual labels
 */
const MemoizedWheelLabel = memo<{
  label: {
    id: string;
    title: string;
    x: number;
    y: number;
    angle: number;
  };
  maxChars: number;
}>(({ label, maxChars }) => {
  const displayText = useMemo(() => {
    return label.title.length > maxChars
      ? `${label.title.substring(0, maxChars - 3)}...`
      : label.title;
  }, [label.title, maxChars]);

  const labelStyle = useMemo(
    () => ({
      left: `${label.x}%`,
      top: `${label.y}%`,
      transform: `translate(-50%, -50%) rotate(${label.angle}deg)`,
    }),
    [label.x, label.y, label.angle]
  );

  return (
    <div className="wheel__label wheel__label--optimized" style={labelStyle}>
      {displayText}
    </div>
  );
});

MemoizedWheelLabel.displayName = 'MemoizedWheelLabel';

/**
 * Memoized wheel segments component for CSS-based rendering
 * Optimizes re-renders when project list changes
 */
const MemoizedWheelSegments = memo<{
  projectLabels: Array<{
    id: string;
    title: string;
    x: number;
    y: number;
    angle: number;
  }>;
  size: 'small' | 'medium' | 'large';
}>(({ projectLabels, size }) => {
  const maxChars = useMemo(() => {
    switch (size) {
      case 'small':
        return 8;
      case 'medium':
        return 10;
      case 'large':
        return 12;
      default:
        return 10;
    }
  }, [size]);

  return (
    <>
      {/* Project Labels with individual memoization */}
      {projectLabels.map(label => (
        <MemoizedWheelLabel key={label.id} label={label} maxChars={maxChars} />
      ))}
    </>
  );
});

MemoizedWheelSegments.displayName = 'MemoizedWheelSegments';

/**
 * Optimized randomizer wheel component with CSS-based animations and Canvas fallback
 *
 * Uses CSS transforms and animations for optimal performance, with automatic fallback
 * to Canvas rendering for complex scenarios (many projects). Implements simplified
 * selection algorithm using modular arithmetic for fair distribution.
 *
 * @param props - Component props
 * @returns The rendered optimized wheel component
 *
 * @features
 * - CSS-based animations for smooth 60fps performance
 * - Canvas fallback for complex scenarios (>20 projects)
 * - Comprehensive memoization for optimal re-renders
 * - Performance monitoring and metrics collection
 * - Simplified selection algorithm using modular arithmetic
 * - Responsive sizing with CSS custom properties
 * - Reduced motion support for accessibility
 * - Comprehensive keyboard and screen reader support
 * - Touch gesture support for mobile devices
 * - WCAG 2.1 AA compliance with proper ARIA labels
 * - Haptic feedback for touch interactions
 */
export const OptimizedWheel: React.FC<OptimizedWheelProps> = memo(
  ({ projects, onSpinComplete, disabled = false, size: preferredSize, forceRenderMode }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [spinDegrees, setSpinDegrees] = useState(0);
    const [performanceMetrics, setPerformanceMetrics] = useState<WheelPerformanceMetrics[]>([]);
    const [adaptiveRenderMode, setAdaptiveRenderMode] = useState<'css' | 'canvas' | null>(null);
    const wheelRef = useRef<HTMLDivElement>(null);
    const performanceFallbackTriggered = useRef(false);

    // Performance monitoring
    const { getElapsedTime } = useSimplePerformanceTracking('OptimizedWheel');
    const { recordMetric, getPerformanceSummary } = useWheelPerformanceMonitoring();

    // Accessibility and mobile support
    const {
      announce,
      announceSpinStart,
      announceSpinResult,
      announceKeyboardInstructions,
      announceTouchInstructions,
      liveRegionRef,
      statusRef,
    } = useAccessibilityAnnouncements();

    const { removeFocus } = useFocusManagement();
    const isMobile = useIsMobile();
    const isTouchDevice = useIsTouchDevice();

    // Use responsive sizing hook
    const size = useResponsiveWheelSize(preferredSize);

    // Adaptive performance fallback system - only in development and heavily debounced
    useEffect(() => {
      if (!import.meta.env.DEV || forceRenderMode || performanceMetrics.length < 5) return;

      // Heavy debounce to prevent rapid state changes
      const timeoutId = setTimeout(() => {
        const recentMetrics = performanceMetrics.slice(-3);
        const avgRenderTime =
          recentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentMetrics.length;
        const hasPerformanceIssues =
          avgRenderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD_MS;

        // Only trigger fallback once per component lifecycle
        if (hasPerformanceIssues && !performanceFallbackTriggered.current) {
          const newMode = adaptiveRenderMode === 'css' ? 'canvas' : 'css';
          setAdaptiveRenderMode(newMode);
          performanceFallbackTriggered.current = true;

          logger.info('Performance fallback triggered', {
            avgRenderTime: avgRenderTime.toFixed(2),
            threshold: PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD_MS,
            switchingTo: newMode,
            projectCount: projects.length,
          });
        }
      }, 5000); // 5 second debounce

      return () => clearTimeout(timeoutId);
    }, [performanceMetrics, adaptiveRenderMode, forceRenderMode, projects.length]);

    // Determine render mode based on project count, performance, and adaptive fallback
    const renderMode = useMemo(() => {
      if (forceRenderMode) return forceRenderMode;
      if (adaptiveRenderMode) return adaptiveRenderMode;

      // Use Canvas for complex scenarios (simple threshold check)
      if (projects.length > PERFORMANCE_THRESHOLDS.CANVAS_FALLBACK_PROJECT_COUNT) {
        logger.debug('Using Canvas render mode for high project count', {
          projectCount: projects.length,
          threshold: PERFORMANCE_THRESHOLDS.CANVAS_FALLBACK_PROJECT_COUNT,
        });
        return 'canvas';
      }

      return 'css';
    }, [projects.length, forceRenderMode, adaptiveRenderMode]); // Remove performanceMetrics from deps

    // Performance metrics callback - use ref to avoid render loops
    const handlePerformanceMetric = useCallback(
      (metric: Partial<WheelPerformanceMetrics>) => {
        // Only record metrics in development and avoid during render
        if (!import.meta.env.DEV) return;

        const fullMetric: WheelPerformanceMetrics = {
          renderTime: 0,
          animationFrameTime: 0,
          projectCount: projects.length,
          renderMode,
          ...metric,
        };

        // Use setTimeout to avoid updating state during render
        setTimeout(() => {
          recordMetric(fullMetric);
          setPerformanceMetrics(prev => {
            const newMetrics = [...prev, fullMetric];
            return newMetrics.slice(-10);
          });
        }, 0);
      },
      [projects.length, renderMode, recordMetric]
    );

    /**
     * Simplified project selection using modular arithmetic
     * More efficient than complex angle calculations
     */
    const selectProject = useCallback((projects: Project[], finalDegrees: number): Project => {
      const segmentSize = 360 / projects.length;
      // Normalize degrees to 0-360 range
      const normalizedDegrees = (360 - (finalDegrees % 360) + 360) % 360;
      // Calculate selected index using modular arithmetic
      const selectedIndex = Math.floor(normalizedDegrees / segmentSize) % projects.length;

      logger.debug('Project selection calculation', {
        finalDegrees,
        normalizedDegrees,
        segmentSize,
        selectedIndex,
        projectCount: projects.length,
      });

      return projects[selectedIndex];
    }, []);

    // Forward declaration for handleSpin function
    const handleSpinRef = useRef<() => void>();

    // Touch gesture support for wheel
    const { wheelTouchHandlers, touchFeedback, triggerHapticFeedback } = useWheelTouchGestures(
      () => handleSpinRef.current?.(),
      disabled || isSpinning
    );

    /**
     * Handle wheel spin with CSS-based animation and accessibility support
     */
    const handleSpin = useCallback(() => {
      if (isSpinning || projects.length === 0 || disabled) return;

      logger.debug('Starting optimized wheel spin', { projectCount: projects.length });
      setIsSpinning(true);

      // Announce spin start with accessibility support
      announceSpinStart(projects.length);

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Generate random spin degrees (3-5 full rotations + random angle)
      const baseRotations = prefersReducedMotion ? 1 : 3 + Math.random() * 2;
      const randomAngle = Math.random() * 360;
      const totalDegrees = spinDegrees + baseRotations * 360 + randomAngle;

      // Set CSS custom property for animation
      if (wheelRef.current) {
        wheelRef.current.style.setProperty('--spin-degrees', `${totalDegrees}deg`);
      }

      setSpinDegrees(totalDegrees);

      // Calculate selected project using simplified algorithm
      const selectedProject = selectProject(projects, totalDegrees);

      // Animation duration based on motion preference
      const animationDuration = prefersReducedMotion ? 500 : 3000;

      // Wait for animation to complete
      setTimeout(() => {
        setIsSpinning(false);

        if (selectedProject) {
          onSpinComplete(selectedProject);

          logger.info('Optimized wheel spin completed', {
            selectedProjectId: selectedProject.id,
            selectedProjectTitle: selectedProject.title,
            totalDegrees,
          });

          // Announce result with accessibility support
          const projectDetails = [selectedProject.company, selectedProject.artist]
            .filter(Boolean)
            .join(' • ');
          announceSpinResult(selectedProject.title, projectDetails);

          // Trigger haptic feedback for touch devices
          if (isTouchDevice) {
            triggerHapticFeedback('medium');
          }
        }
      }, animationDuration);
    }, [
      isSpinning, 
      projects, 
      disabled, 
      spinDegrees, 
      selectProject, 
      onSpinComplete, 
      announceSpinStart, 
      announceSpinResult, 
      isTouchDevice, 
      triggerHapticFeedback
    ]);

    // Update the ref with the current handleSpin function
    handleSpinRef.current = handleSpin;

    /**
     * Enhanced keyboard navigation handler with accessibility support
     */
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (isSpinning) return;

        switch (event.key) {
          case 'Enter':
          case ' ':
            event.preventDefault();
            if (!disabled && projects.length > 0) {
              handleSpin();
            } else if (projects.length === 0) {
              announce('No projects selected. Please select projects from the list below.');
            } else if (disabled) {
              announce('Wheel is currently disabled.');
            }
            break;
          case 'Escape':
            event.preventDefault();
            removeFocus();
            announce('Focus removed from wheel.');
            break;
          case 'Tab':
            // Let default tab behavior work, but announce navigation
            if (!event.shiftKey) {
              announce('Navigating to next element.');
            } else {
              announce('Navigating to previous element.');
            }
            break;
          case 'F1':
          case '?':
            event.preventDefault();
            if (isTouchDevice) {
              announceTouchInstructions();
            } else {
              announceKeyboardInstructions();
            }
            break;
          case 'ArrowUp':
          case 'ArrowDown':
          case 'ArrowLeft':
          case 'ArrowRight':
            event.preventDefault();
            announce('Use Enter or Space to spin the wheel.');
            break;
          default:
            break;
        }
      },
      [
        isSpinning, 
        disabled, 
        projects.length, 
        handleSpin, 
        announce, 
        removeFocus, 
        announceKeyboardInstructions, 
        announceTouchInstructions, 
        isTouchDevice
      ]
    );

    /**
     * Memoized wheel gradient generation for CSS-based rendering
     * More performant than individual SVG paths, with caching for identical project lists
     */
    const wheelGradient = useMemo(() => {
      if (projects.length === 0) return '';

      // Performance optimization: Use simpler gradient for many projects
      if (projects.length > 40) {
        // Simplified gradient with fewer stops for better performance
        const simplifiedColors = WHEEL_COLORS.slice(0, Math.min(8, projects.length));
        const segmentSize = 100 / simplifiedColors.length;
        const gradientStops = simplifiedColors.map(
          (color, index) => `${color} ${index * segmentSize}% ${(index + 1) * segmentSize}%`
        );

        return `conic-gradient(from 0deg, ${gradientStops.join(', ')})`;
      }

      // Full gradient for smaller project counts
      const segmentSize = 100 / projects.length;
      const gradientStops: string[] = [];

      projects.forEach((_, index) => {
        const color = WHEEL_COLORS[index % WHEEL_COLORS.length];
        const startPercent = index * segmentSize;
        const endPercent = (index + 1) * segmentSize;

        gradientStops.push(`${color} ${startPercent}%`);
        gradientStops.push(`${color} ${endPercent}%`);
      });

      return `conic-gradient(from 0deg, ${gradientStops.join(', ')})`;
    }, [projects]);

    /**
     * Memoized project labels positioned around the wheel
     * Cached to prevent recalculation on every render
     */
    const projectLabels = useMemo(() => {
      if (projects.length === 0) return [];

      const segmentAngle = 360 / projects.length;

      return projects.map((project, index) => {
        const angle = index * segmentAngle + segmentAngle / 2;
        const radian = (angle * Math.PI) / 180;

        // Position text at 70% of radius for better readability
        const textRadius = 35; // 70% of 50% (radius in CSS)
        const x = 50 + textRadius * Math.cos(radian);
        const y = 50 + textRadius * Math.sin(radian);

        return {
          id: project.id,
          title: project.title,
          x,
          y,
          angle,
        };
      });
    }, [projects]);

    // Memoized project list string for accessibility
    const projectListString = useMemo(() => {
      return projects.map(p => p.title).join(', ');
    }, [projects]);
// Performance monitoring effect - simplified and heavily debounced
    useEffect(() => {
      if (!import.meta.env.DEV || performanceMetrics.length === 0) return;

      // Heavy debounce to prevent excessive logging and state updates
      const timeoutId = setTimeout(() => {
        const latestMetric = performanceMetrics[performanceMetrics.length - 1];
        const elapsedTime = getElapsedTime();

        // Simple logging without complex operations
        logger.debug('Wheel performance', {
          renderTime: `${latestMetric.renderTime.toFixed(2)}ms`,
          renderMode: latestMetric.renderMode,
          projectCount: latestMetric.projectCount,
          totalMetrics: performanceMetrics.length,
        });

        // Only log summary occasionally
        if (performanceMetrics.length % 10 === 0) {
          const summary = getPerformanceSummary();
          logger.info('Wheel performance summary', {
            ...summary,
            componentLifetime: `${elapsedTime.toFixed(2)}ms`,
          });
        }
      }, 2000); // 2 second debounce

      return () => clearTimeout(timeoutId);
    }, [performanceMetrics, getElapsedTime, getPerformanceSummary]);

    // Cleanup effect for memory management
    useEffect(() => {
      return () => {
        // Clear performance metrics to prevent memory leaks
        setPerformanceMetrics([]);
      };
    }, []);

    // Empty wheel state with enhanced accessibility
    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center space-y-6">
          {/* Accessibility live regions */}
          <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />
          <div ref={statusRef} aria-live="assertive" aria-atomic="true" className="sr-only" />

          <div className="sr-only" id="wheel-instructions">
            Project randomizer wheel. Select some projects from the list below to start spinning.
            {isTouchDevice && ' You can also swipe up on the wheel to spin when projects are selected.'}
            Press F1 or question mark for help.
          </div>

          <div
            className="wheel-container wheel-container--empty"
            role="img"
            aria-label="Empty project randomizer wheel"
            aria-describedby="wheel-instructions"
          >
            <div className="wheel-pointer" aria-hidden="true" />
            <div className="wheel wheel--empty">
              <div className="wheel__content">
                <p className="wheel__empty-text">Select projects below</p>
                <p className="wheel__empty-subtext">to get started!</p>
                {isTouchDevice && (
                  <p className="wheel__empty-touch-hint">Swipe up to spin when ready</p>
                )}
              </div>
            </div>
          </div>

          <Button
            disabled={true}
            size="lg"
            className="wheel-button wheel-button--disabled"
            aria-label="Spin the wheel (disabled - no projects selected)"
            aria-describedby="wheel-instructions"
          >
            Spin the Wheel!
          </Button>
        </div>
      );
    }


    return (
      <div className="flex flex-col items-center space-y-6">
        {/* Accessibility live regions */}
        <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />
        <div ref={statusRef} aria-live="assertive" aria-atomic="true" className="sr-only" />

        {/* Screen Reader Content */}
        <div className="sr-only">
          <div id="wheel-description">
            Project randomizer wheel with {projects.length} projects: {projectListString}
          </div>
          <div id="wheel-instructions">
            Press Enter or Space to spin the wheel. Use Escape to exit focus. Use Tab to navigate.
            {isTouchDevice && ' You can also tap the wheel or swipe up to spin.'}
            Press F1 or question mark for help.
          </div>

          <div id="project-alternatives">
            <h3>Available Projects:</h3>
            <ul>
              {projects.map((project, index) => (
                <li key={project.id}>
                  {index + 1}. {project.title}
                  {(project.company || project.artist) && (
                    <span> by {[project.company, project.artist].filter(Boolean).join(' • ')}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Touch feedback for mobile users */}
        {isTouchDevice && touchFeedback && (
          <div 
            className="wheel-touch-feedback"
            role="status"
            aria-live="polite"
          >
            {touchFeedback}
          </div>
        )}

        {/* Performance Debug Info (Development Only) */}
        {import.meta.env.DEV && performanceMetrics.length > 0 && (
          <div className="sr-only">
            <div id="performance-debug">
              Render mode: {renderMode}, Latest render time:{' '}
              {performanceMetrics[performanceMetrics.length - 1]?.renderTime.toFixed(2)}ms
            </div>
          </div>
        )}

        {/* Wheel Container with Touch Support */}
        <div
          className={`wheel-container wheel-container--${size} wheel-container--${renderMode} ${
            isTouchDevice ? 'wheel-container--touch' : ''
          } ${isMobile ? 'wheel-container--mobile' : ''}`}
          role="application"
          aria-label={`Project randomizer wheel with ${projects.length} projects`}
          aria-describedby="wheel-description wheel-instructions project-alternatives"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (isTouchDevice) {
              announceTouchInstructions();
            } else {
              announceKeyboardInstructions();
            }
          }}
          {...(isTouchDevice ? wheelTouchHandlers : {})}
        >
          {/* Pointer */}
          <div className="wheel-pointer" aria-hidden="true" />

          {/* Conditional Rendering: CSS vs Canvas */}
          {renderMode === 'canvas' ? (
            <CanvasWheel
              projects={projects}
              size={size}
              isSpinning={isSpinning}
              spinDegrees={spinDegrees}
              onPerformanceMetric={handlePerformanceMetric}
            />
          ) : (
            <div
              ref={wheelRef}
              className={`wheel ${isSpinning ? 'wheel--spinning' : ''}`}
              style={{
                background: wheelGradient,
              }}
              aria-hidden="true"
            >
              <MemoizedWheelSegments projectLabels={projectLabels} size={size} />
            </div>
          )}
        </div>

        {/* Enhanced Spin Button with Accessibility */}
        <Button
          onClick={handleSpin}
          disabled={disabled || isSpinning || projects.length === 0}
          size="lg"
          className={`wheel-button ${isTouchDevice ? 'wheel-button--touch' : ''} ${
            isMobile ? 'wheel-button--mobile' : ''
          }`}
          aria-label={
            isSpinning
              ? `Spinning wheel to select from ${projects.length} projects`
              : `Spin the wheel to randomly select from ${projects.length} projects${
                  isTouchDevice ? '. You can also swipe up on the wheel' : ''
                }`
          }
          aria-describedby="wheel-description wheel-instructions"
          onFocus={() => {
            announce(`Spin button focused. ${projects.length} projects available for selection.`);
          }}
        >
          {isSpinning ? (
            <>
              <span className="wheel-button__spinner" aria-hidden="true" />
              Spinning...
            </>
          ) : (
            <>
              Spin the Wheel!
              {isTouchDevice && (
                <span className="wheel-button__touch-hint" aria-hidden="true">
                  or swipe ↑
                </span>
              )}
            </>
          )}
        </Button>

        {/* Additional touch instructions for mobile */}
        {isTouchDevice && !isSpinning && (
          <div className="wheel-touch-instructions">
            <p className="text-sm text-muted-foreground text-center">
              Tap the button above or swipe up on the wheel to spin
            </p>
          </div>
        )}

        {/* Performance Metrics Display (Development Only) */}
        {import.meta.env.DEV && performanceMetrics.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            <div>Render Mode: {renderMode}</div>
            <div>
              Latest Render:{' '}
              {performanceMetrics[performanceMetrics.length - 1]?.renderTime.toFixed(2)}ms
            </div>
            <div>Projects: {projects.length}</div>
          </div>
        )}
      </div>
    );
  }
);

OptimizedWheel.displayName = 'OptimizedWheel';
