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
 * @since 2025-01-19
 */

import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types/shared';
import { createLogger } from '@/utils/secureLogger';
import { useSimplePerformanceTracking } from '@/hooks/usePerformanceMonitoring';
import { useWheelPerformanceMonitoring, WheelPerformanceMetrics } from './wheelPerformanceMonitor';
import './OptimizedWheel.css';

const logger = createLogger('OptimizedWheel');

/**
 * Performance thresholds for determining render mode
 */
const PERFORMANCE_THRESHOLDS = {
  CANVAS_FALLBACK_PROJECT_COUNT: 20, // Use Canvas for >20 projects
  COMPLEX_SCENARIO_PROJECT_COUNT: 50, // Consider very complex for >50 projects
  ANIMATION_PERFORMANCE_THRESHOLD: 16.67, // Target 60fps (16.67ms per frame)
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

  // Canvas drawing function with performance monitoring
  const drawWheel = useCallback((currentRotation: number = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderStartTime = performance.now();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, radius } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Save context for rotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((currentRotation * Math.PI) / 180);

    // Draw segments
    projectSegments.forEach(segment => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, segment.startAngle, segment.endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw project text
      ctx.save();
      ctx.rotate(segment.centerAngle);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${size === 'small' ? '12' : size === 'medium' ? '14' : '16'}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const textRadius = radius * 0.7;
      const text = segment.project.title.length > 12 
        ? `${segment.project.title.substring(0, 9)}...` 
        : segment.project.title;
      
      ctx.fillText(text, textRadius, 0);
      ctx.restore();
    });

    // Restore context
    ctx.restore();

    // Draw border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4;
    ctx.stroke();

    const renderTime = performance.now() - renderStartTime;
    onPerformanceMetric({ 
      renderTime, 
      renderMode: 'canvas',
      projectCount: projects.length,
    });
  }, [dimensions, projectSegments, size, projects.length, onPerformanceMetric]);

  // Animation loop for spinning
  useEffect(() => {
    if (!isSpinning) {
      drawWheel(spinDegrees);
      return;
    }

    const startTime = performance.now();
    const duration = 3000; // 3 seconds
    const startRotation = spinDegrees - (3 * 360 + Math.random() * 360); // Previous rotation
    const endRotation = spinDegrees;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (cubic-bezier approximation)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (endRotation - startRotation) * easeOut;

      drawWheel(currentRotation);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpinning, spinDegrees, drawWheel]);

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
}>(({ projectLabels }) => {
  return (
    <>
      {/* Project Labels */}
      {projectLabels.map(label => (
        <div
          key={label.id}
          className="wheel__label"
          style={{
            left: `${label.x}%`,
            top: `${label.y}%`,
            transform: `translate(-50%, -50%) rotate(${label.angle}deg)`,
          }}
        >
          {label.title.length > 12 ? `${label.title.substring(0, 9)}...` : label.title}
        </div>
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
 */
export const OptimizedWheel: React.FC<OptimizedWheelProps> = memo(({
  projects,
  onSpinComplete,
  disabled = false,
  size: preferredSize,
  forceRenderMode,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDegrees, setSpinDegrees] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<WheelPerformanceMetrics[]>([]);
  const wheelRef = useRef<HTMLDivElement>(null);
  const resultAnnouncementRef = useRef<HTMLDivElement>(null);

  // Performance monitoring
  const { getElapsedTime } = useSimplePerformanceTracking('OptimizedWheel');
  const { recordMetric, getPerformanceSummary } = useWheelPerformanceMonitoring();

  // Use responsive sizing hook
  const size = useResponsiveWheelSize(preferredSize);

  // Determine render mode based on project count and performance
  const renderMode = useMemo(() => {
    if (forceRenderMode) return forceRenderMode;
    
    // Use Canvas for complex scenarios
    if (projects.length > PERFORMANCE_THRESHOLDS.CANVAS_FALLBACK_PROJECT_COUNT) {
      logger.debug('Using Canvas render mode for complex scenario', {
        projectCount: projects.length,
        threshold: PERFORMANCE_THRESHOLDS.CANVAS_FALLBACK_PROJECT_COUNT,
      });
      return 'canvas';
    }
    
    return 'css';
  }, [projects.length, forceRenderMode]);

  // Performance metrics callback
  const handlePerformanceMetric = useCallback((metric: Partial<WheelPerformanceMetrics>) => {
    const fullMetric: WheelPerformanceMetrics = {
      renderTime: 0,
      animationFrameTime: 0,
      projectCount: projects.length,
      renderMode,
      ...metric,
    };

    // Record metric in performance monitor
    recordMetric(fullMetric);

    setPerformanceMetrics(prev => {
      const newMetrics = [...prev, fullMetric];
      // Keep only last 10 metrics to prevent memory leaks
      return newMetrics.slice(-10);
    });
  }, [projects.length, renderMode, recordMetric]);

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

  /**
   * Handle wheel spin with CSS-based animation
   */
  const handleSpin = useCallback(() => {
    if (isSpinning || projects.length === 0 || disabled) return;

    logger.debug('Starting optimized wheel spin', { projectCount: projects.length });
    setIsSpinning(true);

    // Announce spin start to screen readers
    if (resultAnnouncementRef.current) {
      resultAnnouncementRef.current.textContent = `Spinning wheel to select from ${projects.length} projects...`;
    }

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

        // Announce result to screen readers
        if (resultAnnouncementRef.current) {
          resultAnnouncementRef.current.textContent = `Spin complete! Selected project: ${selectedProject.title}`;
        }
      }
    }, animationDuration);
  }, [isSpinning, projects, disabled, spinDegrees, selectProject, onSpinComplete]);

  /**
   * Keyboard navigation handler
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
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (wheelRef.current) {
            wheelRef.current.blur();
          }
          break;
      }
    },
    [isSpinning, disabled, projects.length, handleSpin]
  );

  /**
   * Memoized wheel gradient generation for CSS-based rendering
   * More performant than individual SVG paths, with caching for identical project lists
   */
  const wheelGradient = useMemo(() => {
    if (projects.length === 0) return '';

    const renderStartTime = performance.now();
    const segmentSize = 100 / projects.length; // Percentage per segment
    const gradientStops: string[] = [];

    projects.forEach((_, index) => {
      const color = WHEEL_COLORS[index % WHEEL_COLORS.length];
      const startPercent = index * segmentSize;
      const endPercent = (index + 1) * segmentSize;

      gradientStops.push(`${color} ${startPercent}%`);
      gradientStops.push(`${color} ${endPercent}%`);
    });

    const gradient = `conic-gradient(from 0deg, ${gradientStops.join(', ')})`;
    const renderTime = performance.now() - renderStartTime;

    // Track performance for gradient generation
    handlePerformanceMetric({ renderTime });

    return gradient;
  }, [projects, handlePerformanceMetric]);

  /**
   * Memoized project labels positioned around the wheel
   * Cached to prevent recalculation on every render
   */
  const projectLabels = useMemo(() => {
    if (projects.length === 0) return [];

    const renderStartTime = performance.now();
    const segmentAngle = 360 / projects.length;

    const labels = projects.map((project, index) => {
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

    const renderTime = performance.now() - renderStartTime;
    handlePerformanceMetric({ renderTime });

    return labels;
  }, [projects, handlePerformanceMetric]);

  // Memoized project list string for accessibility
  const projectListString = useMemo(() => {
    return projects.map(p => p.title).join(', ');
  }, [projects]);

  // Empty wheel state
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center space-y-6">
        <div className="sr-only" id="wheel-instructions">
          Project randomizer wheel. Select some projects from the list below to start spinning.
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
            </div>
          </div>
        </div>

        <Button
          disabled={true}
          size="lg"
          className="wheel-button wheel-button--disabled"
          aria-label="Spin the wheel (disabled - no projects selected)"
        >
          Spin the Wheel!
        </Button>
      </div>
    );
  }

  // Performance monitoring effect
  useEffect(() => {
    if (import.meta.env.DEV && performanceMetrics.length > 0) {
      const latestMetric = performanceMetrics[performanceMetrics.length - 1];
      const elapsedTime = getElapsedTime();
      
      logger.debug('Wheel performance metrics', {
        componentLifetime: `${elapsedTime.toFixed(2)}ms`,
        latestRenderTime: `${latestMetric.renderTime.toFixed(2)}ms`,
        renderMode: latestMetric.renderMode,
        projectCount: latestMetric.projectCount,
        totalMetrics: performanceMetrics.length,
      });

      // Log performance summary every 5 metrics
      if (performanceMetrics.length % 5 === 0) {
        const summary = getPerformanceSummary();
        logger.info('Wheel performance summary', {
          ...summary,
          componentLifetime: `${elapsedTime.toFixed(2)}ms`,
        });
      }
    }
  }, [performanceMetrics, getElapsedTime, getPerformanceSummary]);

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Screen Reader Content */}
      <div className="sr-only">
        <div id="wheel-description">
          Project randomizer wheel with {projects.length} projects: {projectListString}
        </div>
        <div id="wheel-instructions">
          Press Enter or Space to spin the wheel. Use Escape to exit focus.
        </div>
        <div ref={resultAnnouncementRef} aria-live="polite" aria-atomic="true" />

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

      {/* Performance Debug Info (Development Only) */}
      {import.meta.env.DEV && performanceMetrics.length > 0 && (
        <div className="sr-only">
          <div id="performance-debug">
            Render mode: {renderMode}, Latest render time: {performanceMetrics[performanceMetrics.length - 1]?.renderTime.toFixed(2)}ms
          </div>
        </div>
      )}

      {/* Wheel Container */}
      <div
        className={`wheel-container wheel-container--${size} wheel-container--${renderMode}`}
        role="application"
        aria-label={`Project randomizer wheel with ${projects.length} projects`}
        aria-describedby="wheel-description wheel-instructions project-alternatives"
        tabIndex={0}
        onKeyDown={handleKeyDown}
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
            <MemoizedWheelSegments
              projectLabels={projectLabels}
            />
          </div>
        )}
      </div>

      {/* Spin Button */}
      <Button
        onClick={handleSpin}
        disabled={disabled || isSpinning || projects.length === 0}
        size="lg"
        className="wheel-button"
        aria-label={
          isSpinning
            ? `Spinning wheel to select from ${projects.length} projects`
            : `Spin the wheel to randomly select from ${projects.length} projects`
        }
      >
        {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
      </Button>

      {/* Performance Metrics Display (Development Only) */}
      {import.meta.env.DEV && performanceMetrics.length > 0 && (
        <div className="text-xs text-muted-foreground mt-2">
          <div>Render Mode: {renderMode}</div>
          <div>Latest Render: {performanceMetrics[performanceMetrics.length - 1]?.renderTime.toFixed(2)}ms</div>
          <div>Projects: {projects.length}</div>
        </div>
      )}
    </div>
  );
});

OptimizedWheel.displayName = 'OptimizedWheel';
