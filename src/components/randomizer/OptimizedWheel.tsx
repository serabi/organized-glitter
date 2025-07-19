/**
 * @fileoverview Optimized Randomizer Wheel Component
 *
 * A performance-optimized spinning wheel component that uses CSS-based animations
 * instead of complex SVG calculations. Features simplified selection algorithm,
 * responsive sizing with CSS custom properties, and comprehensive accessibility support.
 *
 * @author serabi
 * @version 2.0.0
 * @since 2025-01-19
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Project } from '@/types/shared';
import { createLogger } from '@/utils/secureLogger';
import './OptimizedWheel.css';

const logger = createLogger('OptimizedWheel');

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
}

/**
 * Optimized randomizer wheel component with CSS-based animations
 *
 * Uses CSS transforms and animations instead of complex JavaScript calculations
 * for better performance. Implements simplified selection algorithm using
 * modular arithmetic for fair distribution.
 *
 * @param props - Component props
 * @returns The rendered optimized wheel component
 *
 * @features
 * - CSS-based animations for smooth 60fps performance
 * - Simplified selection algorithm using modular arithmetic
 * - Responsive sizing with CSS custom properties
 * - Reduced motion support for accessibility
 * - Canvas fallback for complex scenarios (future enhancement)
 * - Comprehensive keyboard and screen reader support
 */
export const OptimizedWheel: React.FC<OptimizedWheelProps> = ({
  projects,
  onSpinComplete,
  disabled = false,
  size: preferredSize,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDegrees, setSpinDegrees] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const resultAnnouncementRef = useRef<HTMLDivElement>(null);

  // Use responsive sizing hook
  const size = useResponsiveWheelSize(preferredSize);

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
   * Generate wheel segments using CSS conic-gradient
   * More performant than individual SVG paths
   */
  const generateWheelGradient = useCallback(() => {
    if (projects.length === 0) return '';

    const segmentSize = 100 / projects.length; // Percentage per segment
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
   * Generate project labels positioned around the wheel
   */
  const generateProjectLabels = useCallback(() => {
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

  const wheelGradient = generateWheelGradient();
  const projectLabels = generateProjectLabels();
  const projectList = projects.map(p => p.title).join(', ');

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Screen Reader Content */}
      <div className="sr-only">
        <div id="wheel-description">
          Project randomizer wheel with {projects.length} projects: {projectList}
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

      {/* Wheel Container */}
      <div
        className={`wheel-container wheel-container--${size}`}
        role="application"
        aria-label={`Project randomizer wheel with ${projects.length} projects`}
        aria-describedby="wheel-description wheel-instructions project-alternatives"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Pointer */}
        <div className="wheel-pointer" aria-hidden="true" />

        {/* Wheel */}
        <div
          ref={wheelRef}
          className={`wheel ${isSpinning ? 'wheel--spinning' : ''}`}
          style={{
            background: wheelGradient,
          }}
          aria-hidden="true"
        >
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
        </div>
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
    </div>
  );
};
