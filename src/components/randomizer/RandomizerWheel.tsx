/**
 * @fileoverview Interactive Randomizer Wheel Component
 *
 * An accessible spinning wheel component that randomly selects from a list of projects.
 * Features smooth animations, comprehensive accessibility support, responsive design, and
 * integration with the Organized Glitter brand color palette.
 *
 * @author @serabi
 * @version 1.0.0
 * @since 2025-06-28
 */

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Project } from '@/types/project';
import { createLogger } from '@/utils/logger';
import {
  useAccessibilityAnnouncements,
  useFocusManagement,
} from '@/hooks/useAccessibilityAnnouncements';
import { useWheelTouchGestures } from '@/hooks/useTouchGestures';
import { useIsMobile, useIsTouchDevice } from '@/hooks/use-mobile';
import { useEnhancedTouchFeedback } from '@/hooks/useEnhancedTouchFeedback';
import { RippleEffect } from '@/components/ui/ripple-effect';

const logger = createLogger('RandomizerWheel');

/**
 * Gets a wheel segment color from the Organized Glitter brand palette
 *
 * Cycles through a curated set of brand colors to ensure visual variety
 * while maintaining consistency with the application's design system.
 *
 * @param {number} index - The segment index to get a color for
 * @returns {string} Hex color code for the segment
 *
 * @example
 * ```typescript
 * const color1 = getWheelColor(0); // '#a855f7' (diamond-500)
 * const color2 = getWheelColor(1); // '#f43f5e' (flamingo-500)
 * ```
 */
const getWheelColor = (index: number): string => {
  const colors = [
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
  ];
  return colors[index % colors.length];
};

/**
 * Props interface for the RandomizerWheel component
 * @interface RandomizerWheelProps
 */
interface RandomizerWheelProps {
  /** Array of projects to display on the wheel */
  projects: Project[];
  /** Callback function called when a spin completes with the selected project */
  onSpinComplete: (selectedProject: Project) => void;
  /** Whether the wheel should be disabled (optional) */
  disabled?: boolean;
}

/**
 * Interactive randomizer wheel component with accessibility and animations
 *
 * Creates a spinning wheel that displays projects as colored segments and randomly
 * selects one when spun. Includes comprehensive accessibility features, responsive
 * design, reduced motion support, and smooth animations.
 *
 * @param {RandomizerWheelProps} props - Component props
 * @param {Project[]} props.projects - Projects to display on the wheel
 * @param {function} props.onSpinComplete - Callback for when spin completes
 * @param {boolean} [props.disabled=false] - Whether the wheel is disabled
 *
 * @returns {JSX.Element} The rendered randomizer wheel component
 *
 * @example
 * ```tsx
 * const handleSpinComplete = (project: Project) => {
 *   console.log('Selected:', project.title);
 *   // Save to history, show toast, etc.
 * };
 *
 * <RandomizerWheel
 *   projects={selectedProjects}
 *   onSpinComplete={handleSpinComplete}
 *   disabled={isProcessingResults}
 * />
 * ```
 *
 * @features
 * - Smooth 3D-style spinning animation with easing
 * - Responsive design (mobile, tablet, desktop)
 * - Comprehensive accessibility support (ARIA, keyboard nav, screen readers)
 * - Reduced motion support for vestibular disorders
 * - Visual feedback with brand colors and patterns
 * - Empty state with gradient placeholder
 * - Mathematical precision for fair random selection
 * - Comprehensive logging for debugging
 *
 * @accessibility
 * - WCAG 2.1 AA compliant
 * - Keyboard navigation (Enter/Space to spin, Escape to exit)
 * - Screen reader announcements for spin state and results
 * - Alternative content listing all projects
 * - Proper ARIA labels and descriptions
 * - Focus management and visual focus indicators
 * - Color accessibility with patterns for colorblind users
 *
 * @mathematics
 * The wheel selection uses precise angle calculations:
 * - Each segment spans 360° / projectCount
 * - Arrow fixed at top (270° from 0° reference)
 * - Selection = Math.floor((270° - finalRotation + 360°) % 360° / segmentAngle)
 * - Ensures fair distribution across all segments
 */
export const RandomizerWheel: React.FC<RandomizerWheelProps> = ({
  projects,
  onSpinComplete,
  disabled = false,
}) => {
  /** Whether the wheel is currently spinning */
  const [isSpinning, setIsSpinning] = useState(false);
  /** Current rotation angle in degrees */
  const [rotation, setRotation] = useState(0);
  /** Current window size for responsive calculations */
  const [windowSize, setWindowSize] = useState({ width: 1024, height: 768 });
  /** Reference to the wheel DOM element for focus management */
  const wheelRef = useRef<HTMLDivElement>(null);

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

  // Update window size for responsive calculations
  React.useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    if (typeof window !== 'undefined') {
      updateWindowSize();
      window.addEventListener('resize', updateWindowSize);
      return () => window.removeEventListener('resize', updateWindowSize);
    }
  }, []);

  // Forward declaration for handleSpin function
  const handleSpinRef = useRef<() => void>();

  // Touch gesture support for wheel
  const { wheelTouchHandlers, touchFeedback, triggerHapticFeedback } = useWheelTouchGestures(
    () => handleSpinRef.current?.(),
    disabled || isSpinning
  );

  // Enhanced touch feedback for better mobile experience
  const enhancedTouchFeedback = useEnhancedTouchFeedback({
    enableHaptic: true,
    enableRipple: true,
    enableScale: false, // Don't scale the whole wheel
    hapticIntensity: 'medium',
    duration: 400,
  });

  const handleSpin = useCallback(() => {
    if (isSpinning || projects.length === 0) return;

    logger.debug('Starting wheel spin', { projectCount: projects.length });
    setIsSpinning(true);

    // Announce spin start with accessibility support
    announceSpinStart(projects.length);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Calculate random rotation (multiple full rotations + random angle)
    const baseRotation = prefersReducedMotion ? 0 : 1800; // No spin if reduced motion
    const randomRotation = Math.random() * 360;
    const totalRotation = rotation + baseRotation + randomRotation;

    setRotation(totalRotation);

    // Calculate which project was selected
    const segmentAngle = 360 / projects.length;
    // The wheel rotates clockwise, and the arrow points down (at 270 degrees from 0)
    // We need to find which segment the arrow (fixed at top) points to after rotation
    const finalRotation = totalRotation % 360;
    // Since the wheel rotates and the arrow is fixed, we need to find where
    // the original 0-degree position ended up, then add 270 for the arrow
    const arrowPointsAt = (270 - finalRotation + 360) % 360;
    const selectedIndex = Math.floor(arrowPointsAt / segmentAngle);
    const selectedProject = projects[selectedIndex];

    logger.debug('Wheel spin calculation', {
      totalRotation,
      finalRotation,
      arrowPointsAt,
      segmentAngle,
      selectedIndex,
      selectedProjectId: selectedProject?.id,
      selectedProjectTitle: selectedProject?.title,
    });

    // Wait for animation to complete (shorter for reduced motion)
    const animationDuration = prefersReducedMotion ? 500 : 3000;
    setTimeout(() => {
      setIsSpinning(false);
      if (selectedProject) {
        onSpinComplete(selectedProject);
        logger.info('Wheel spin completed', {
          selectedProjectId: selectedProject.id,
          selectedProjectTitle: selectedProject.title,
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
    rotation,
    onSpinComplete,
    announceSpinStart,
    announceSpinResult,
    isTouchDevice,
    triggerHapticFeedback,
  ]);

  // Update the ref with the current handleSpin function
  handleSpinRef.current = handleSpin;

  // Enhanced keyboard navigation handler with comprehensive accessibility support
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
            announceSpinStart(0); // This will announce no projects available
          } else if (disabled) {
            announce('Wheel is currently disabled. Please wait or check your selection.');
          }
          break;
        case 'Escape':
          event.preventDefault();
          removeFocus();
          announce('Focus removed from randomizer wheel.');
          break;
        case 'Tab':
          // Allow default tab behavior but provide audio feedback
          if (!event.shiftKey) {
            announce('Navigating to next interactive element.');
          } else {
            announce('Navigating to previous interactive element.');
          }
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          event.preventDefault();
          announce(
            `Use Enter or Space to spin the wheel. Currently ${projects.length} projects available.`
          );
          break;
        case 'Home':
          event.preventDefault();
          announce(
            `Randomizer wheel with ${projects.length} projects. Use Enter or Space to spin.`
          );
          break;
        case 'End':
          event.preventDefault();
          announce('End of wheel interaction. Use Tab to navigate to other elements.');
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
        case 'h':
        case 'H':
          // Help shortcut
          event.preventDefault();
          announce(
            `Randomizer wheel help: ${projects.length} projects available. Use Enter or Space to spin. Use F1 for detailed instructions.`
          );
          break;
        case 'r':
        case 'R':
          // Refresh/read current state
          event.preventDefault();
          if (projects.length > 0) {
            const projectList = projects
              .slice(0, 5)
              .map(p => p.title)
              .join(', ');
            const moreText = projects.length > 5 ? ` and ${projects.length - 5} more` : '';
            announce(
              `${projects.length} projects selected: ${projectList}${moreText}. Press Enter to spin.`
            );
          } else {
            announce(
              'No projects selected for randomizer. Please select projects from the list below.'
            );
          }
          break;
        default:
          // Announce unhandled keys for better user feedback
          if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
            announce('Use Enter or Space to spin, F1 for help, or Tab to navigate.');
          }
          break;
      }
    },
    [
      isSpinning,
      disabled,
      projects,
      handleSpin,
      removeFocus,
      announceKeyboardInstructions,
      announceTouchInstructions,
      announceSpinStart,
      announce,
      isTouchDevice,
    ]
  );

  // Empty wheel state with enhanced accessibility
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center space-y-6">
        {/* Accessibility live regions */}
        <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />
        <div ref={statusRef} aria-live="assertive" aria-atomic="true" className="sr-only" />

        {/* Screen Reader Instructions */}
        <div className="sr-only" id="wheel-instructions">
          Project randomizer wheel. Select some projects from the list below to start spinning.
          {isTouchDevice &&
            ' You can also swipe up on the wheel to spin when projects are selected.'}
          Press F1 or question mark for help.
        </div>

        {/* Empty Wheel Container */}
        <div
          className="relative"
          role="img"
          aria-label="Empty project randomizer wheel"
          aria-describedby="wheel-instructions"
        >
          {/* Pointer Line */}
          <div
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-2 transform"
            aria-hidden="true"
          >
            <div className="h-8 w-0.5 bg-flamingo-300 shadow-lg sm:h-10 sm:w-1 lg:h-12 lg:w-1.5"></div>
          </div>

          {/* Empty Wheel with Gradient */}
          <div className="relative h-60 w-60 overflow-hidden rounded-full border-4 border-flamingo-300 bg-gradient-to-br from-diamond-400 via-flamingo-400 to-mauve-400 opacity-60 xs:h-72 xs:w-72 sm:h-80 sm:w-80 md:h-96 md:w-96 lg:h-105 lg:w-105 xl:h-140 xl:w-140">
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white drop-shadow-lg">
                <p className="text-lg font-semibold">Select projects below</p>
                <p className="text-sm opacity-90">to get started!</p>
                {isTouchDevice && (
                  <p className="mt-1 text-xs opacity-80">Swipe up to spin when ready</p>
                )}
              </div>
            </div>

            {/* Subtle pulse animation */}
            <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-diamond-300 via-flamingo-300 to-mauve-300 opacity-30"></div>
          </div>
        </div>

        {/* Disabled Spin Button */}
        <Button
          disabled={true}
          size="lg"
          className="cursor-not-allowed bg-gradient-to-r from-primary to-mauve-500 px-8 py-3 text-lg font-semibold text-white opacity-50 shadow-lg hover:from-primary/90 hover:to-mauve-500/90"
          aria-label="Spin the wheel (disabled - no projects selected)"
          aria-describedby="wheel-instructions"
        >
          Spin the Wheel!
        </Button>
      </div>
    );
  }

  const segmentAngle = 360 / projects.length;

  // Enhanced responsive wheel sizes with tablet landscape/portrait optimization:
  // Very small mobile: 240px, Mobile: 288px, Large mobile: 320px
  // Tablet portrait: 384px, Tablet landscape: 420px, Desktop: 560px
  const getWheelSize = () => {
    const { width, height } = windowSize;
    const isLandscape = width > height;

    // Desktop (1024px+)
    if (width >= 1024) return 560;

    // Large tablet landscape (920px+)
    if (width >= 920 && isLandscape) return 480;

    // Tablet landscape (768px+) - optimize for landscape mode
    if (width >= 768 && isLandscape) return 420;

    // Tablet portrait or larger (640px+)
    if (width >= 640) return 384;

    // Large mobile (480px+)
    if (width >= 480) return 320;

    // Small mobile (360px+)
    if (width >= 360) return 288;

    // Very small mobile (default)
    return 240;
  };

  const wheelSize = getWheelSize();
  const radius = wheelSize / 2;

  // Enhanced responsive text properties based on wheel size and project count
  const getTextProperties = () => {
    const projectCount = projects.length;
    const { width, height } = windowSize;
    const isLandscape = width > height;

    // Desktop: larger wheel (560px)
    if (width >= 1024) {
      if (projectCount <= 4) return { fontSize: 18, strokeWidth: 3, maxChars: 15 };
      if (projectCount <= 8) return { fontSize: 16, strokeWidth: 3, maxChars: 12 };
      if (projectCount <= 15) return { fontSize: 14, strokeWidth: 2, maxChars: 10 };
      return { fontSize: 12, strokeWidth: 2, maxChars: 8 };
    }

    // Large tablet landscape: enhanced wheel (480px)
    if (width >= 920 && isLandscape) {
      if (projectCount <= 4) return { fontSize: 17, strokeWidth: 2, maxChars: 14 };
      if (projectCount <= 8) return { fontSize: 15, strokeWidth: 2, maxChars: 11 };
      if (projectCount <= 15) return { fontSize: 13, strokeWidth: 2, maxChars: 9 };
      return { fontSize: 11, strokeWidth: 2, maxChars: 7 };
    }

    // Tablet landscape: optimized wheel (420px)
    if (width >= 768 && isLandscape) {
      if (projectCount <= 4) return { fontSize: 16, strokeWidth: 2, maxChars: 13 };
      if (projectCount <= 8) return { fontSize: 14, strokeWidth: 2, maxChars: 10 };
      if (projectCount <= 15) return { fontSize: 12, strokeWidth: 2, maxChars: 8 };
      return { fontSize: 10, strokeWidth: 1, maxChars: 6 };
    }

    // Tablet portrait: medium wheel (384px)
    if (width >= 640) {
      if (projectCount <= 4) return { fontSize: 16, strokeWidth: 2, maxChars: 12 };
      if (projectCount <= 8) return { fontSize: 14, strokeWidth: 2, maxChars: 10 };
      if (projectCount <= 15) return { fontSize: 12, strokeWidth: 2, maxChars: 8 };
      return { fontSize: 10, strokeWidth: 1, maxChars: 6 };
    }

    // Large mobile: enhanced wheel (320px)
    if (width >= 480) {
      if (projectCount <= 4) return { fontSize: 15, strokeWidth: 2, maxChars: 11 };
      if (projectCount <= 8) return { fontSize: 13, strokeWidth: 2, maxChars: 9 };
      if (projectCount <= 15) return { fontSize: 11, strokeWidth: 1, maxChars: 7 };
      return { fontSize: 9, strokeWidth: 1, maxChars: 5 };
    }

    // Small mobile: standard wheel (288px)
    if (width >= 360) {
      if (projectCount <= 4) return { fontSize: 14, strokeWidth: 2, maxChars: 10 };
      if (projectCount <= 8) return { fontSize: 12, strokeWidth: 2, maxChars: 8 };
      if (projectCount <= 15) return { fontSize: 10, strokeWidth: 1, maxChars: 6 };
      return { fontSize: 8, strokeWidth: 1, maxChars: 4 };
    }

    // Very small mobile: compact wheel (240px)
    if (projectCount <= 4) return { fontSize: 12, strokeWidth: 1, maxChars: 8 };
    if (projectCount <= 8) return { fontSize: 10, strokeWidth: 1, maxChars: 6 };
    if (projectCount <= 15) return { fontSize: 8, strokeWidth: 1, maxChars: 4 };
    return { fontSize: 7, strokeWidth: 1, maxChars: 3 };
  };

  const textProps = getTextProperties();

  // Project list for screen readers
  const projectList = projects.map(p => p.title).join(', ');

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-4 md:space-y-6">
      {/* Accessibility live regions */}
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <div ref={statusRef} aria-live="assertive" aria-atomic="true" className="sr-only" />

      {/* Screen Reader Content */}
      <div className="sr-only">
        <div id="wheel-description">
          Project randomizer wheel with {projects.length} projects: {projectList}
        </div>
        <div id="wheel-instructions">
          Press Enter or Space to spin the wheel. Use Escape to exit focus. Use Tab to navigate.
          {isTouchDevice && ' You can also tap the wheel or swipe up to spin.'}
          Press F1 or question mark for help.
        </div>

        {/* Alternative content - project list for screen readers */}
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
        <div className="wheel-touch-feedback" role="status" aria-live="polite">
          {touchFeedback}
        </div>
      )}

      {/* Enhanced Wheel Container with Touch Support and Visual Feedback */}
      <RippleEffect
        duration={600}
        color="rgba(168, 85, 247, 0.4)"
        disabled={disabled || isSpinning}
        className={`relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          isTouchDevice ? 'cursor-pointer' : ''
        }`}
        onClick={() => {
          if (!disabled && !isSpinning) {
            enhancedTouchFeedback.triggerFeedback('haptic', { intensity: 'medium' });
            handleSpin();
          }
        }}
      >
        <div
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
          {/* Pointer Line */}
          <div
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-2 transform"
            aria-hidden="true"
          >
            <div className="h-8 w-0.5 bg-flamingo-300 shadow-lg sm:h-10 sm:w-1 lg:h-12 lg:w-1.5"></div>
          </div>

          {/* Wheel */}
          <div
            ref={wheelRef}
            className={`duration-3000 relative h-60 w-60 overflow-hidden rounded-full border-4 border-flamingo-300 transition-transform ease-out xs:h-72 xs:w-72 sm:h-80 sm:w-80 md:h-96 md:w-96 lg:h-105 lg:w-105 xl:h-140 xl:w-140 ${
              isSpinning ? 'animate-spin-custom' : ''
            }`}
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center',
            }}
            aria-hidden="true"
          >
            {projects.map((project, index) => {
              const startAngle = index * segmentAngle;
              const colorHex = getWheelColor(index);

              // Calculate the path for the pie slice
              const startAngleRad = (startAngle * Math.PI) / 180;
              const endAngleRad = ((startAngle + segmentAngle) * Math.PI) / 180;

              const x1 = radius + radius * Math.cos(startAngleRad);
              const y1 = radius + radius * Math.sin(startAngleRad);
              const x2 = radius + radius * Math.cos(endAngleRad);
              const y2 = radius + radius * Math.sin(endAngleRad);

              const largeArcFlag = segmentAngle > 180 ? 1 : 0;

              const pathData = [
                `M ${radius} ${radius}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z',
              ].join(' ');

              // Text position (middle of the segment)
              const textAngle = startAngle + segmentAngle / 2;
              const textAngleRad = (textAngle * Math.PI) / 180;
              const textRadius = radius * 0.7;
              const textX = radius + textRadius * Math.cos(textAngleRad);
              const textY = radius + textRadius * Math.sin(textAngleRad);

              return (
                <svg
                  key={project.id}
                  className="absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${wheelSize} ${wheelSize}`}
                >
                  {/* Segment background */}
                  <path
                    d={pathData}
                    fill={colorHex}
                    stroke="#fda4af"
                    strokeWidth="3"
                    opacity="0.9"
                  />

                  {/* Pattern overlay for better accessibility */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="white"
                    strokeWidth="1"
                    strokeDasharray={index % 2 === 0 ? '5,5' : 'none'}
                    opacity="0.3"
                  />

                  {/* Project title text with better contrast - stroke outline layer */}
                  <text
                    x={textX}
                    y={textY}
                    fill="none"
                    stroke="black"
                    strokeWidth={textProps.strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={textProps.fontSize}
                    fontWeight="500"
                    style={{
                      transform: `rotate(${textAngle}deg)`,
                      transformOrigin: `${textX}px ${textY}px`,
                    }}
                  >
                    {project.title.length > textProps.maxChars
                      ? `${project.title.substring(0, textProps.maxChars - 3)}...`
                      : project.title}
                  </text>
                  {/* Project title text - white fill layer */}
                  <text
                    x={textX}
                    y={textY}
                    fill="white"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={textProps.fontSize}
                    fontWeight="500"
                    className="drop-shadow-sm"
                    style={{
                      transform: `rotate(${textAngle}deg)`,
                      transformOrigin: `${textX}px ${textY}px`,
                    }}
                  >
                    {project.title.length > textProps.maxChars
                      ? `${project.title.substring(0, textProps.maxChars - 3)}...`
                      : project.title}
                  </text>
                </svg>
              );
            })}
          </div>
        </div>
      </RippleEffect>

      {/* Enhanced Spin Button with Accessibility and Touch Feedback */}
      <RippleEffect
        duration={400}
        color="rgba(255, 255, 255, 0.4)"
        disabled={disabled || isSpinning || projects.length === 0}
      >
        <Button
          onClick={handleSpin}
          disabled={disabled || isSpinning || projects.length === 0}
          size="lg"
          className={`bg-gradient-to-r from-primary to-mauve-500 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:from-primary/90 hover:to-mauve-500/90 ${
            isTouchDevice ? 'min-h-[48px] touch-manipulation active:scale-95' : ''
          } ${isMobile ? 'w-full max-w-[280px]' : ''} transition-transform duration-150`}
          aria-label={
            isSpinning
              ? `Spinning wheel to select from ${projects.length} projects`
              : `Spin the wheel to randomly select from ${projects.length} projects${
                  isTouchDevice ? '. You can also swipe up on the wheel' : ''
                }`
          }
          aria-describedby="wheel-description wheel-instructions"
        >
          {isSpinning ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
              Spinning...
            </>
          ) : (
            <>
              Spin the Wheel!
              {isTouchDevice && <span className="mt-1 block text-xs opacity-70">or swipe ↑</span>}
            </>
          )}
        </Button>
      </RippleEffect>

      {/* Additional touch instructions for mobile */}
      {isTouchDevice && !isSpinning && (
        <div className="mt-2 text-center">
          <p className="text-sm text-muted-foreground">
            Tap the button above or swipe up on the wheel to spin
          </p>
        </div>
      )}

      {/* Custom CSS for the spin animation */}
      <style>{`
        @keyframes spin-custom {
          from {
            transform: rotate(${rotation}deg);
          }
          to {
            transform: rotate(${rotation + 1800}deg);
          }
        }
        .animate-spin-custom {
          animation: spin-custom 3s cubic-bezier(0.17, 0.67, 0.12, 0.99);
        }
        .duration-3000 {
          transition-duration: 3000ms;
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .animate-spin-custom {
            animation: none;
            transition: transform 0.5s ease-out;
          }
          .duration-3000 {
            transition-duration: 500ms;
          }
        }
      `}</style>
    </div>
  );
};
