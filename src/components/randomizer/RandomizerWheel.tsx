import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Project } from '@/types/project';
// Custom color palette for the randomizer wheel using Organized Glitter brand colors
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
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('RandomizerWheel');

interface RandomizerWheelProps {
  projects: Project[];
  onSpinComplete: (selectedProject: Project) => void;
  disabled?: boolean;
}

export const RandomizerWheel: React.FC<RandomizerWheelProps> = ({
  projects,
  onSpinComplete,
  disabled = false,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedResult, setSelectedResult] = useState<Project | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const resultAnnouncementRef = useRef<HTMLDivElement>(null);

  const handleSpin = useCallback(() => {
    if (isSpinning || projects.length === 0) return;

    logger.debug('Starting wheel spin', { projectCount: projects.length });
    setIsSpinning(true);
    
    // Announce spin start to screen readers
    if (resultAnnouncementRef.current) {
      resultAnnouncementRef.current.textContent = 
        `Spinning wheel to select from ${projects.length} projects...`;
    }

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
        setSelectedResult(selectedProject);
        onSpinComplete(selectedProject);
        logger.info('Wheel spin completed', {
          selectedProjectId: selectedProject.id,
          selectedProjectTitle: selectedProject.title,
        });
        
        // Announce result to screen readers
        if (resultAnnouncementRef.current) {
          resultAnnouncementRef.current.textContent = 
            `Spin complete! Selected project: ${selectedProject.title}`;
        }
      }
    }, animationDuration);

  }, [isSpinning, projects, rotation, onSpinComplete]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
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
      default:
        break;
    }
  }, [isSpinning, disabled, projects.length, handleSpin]);

  // Empty wheel state - show beautiful gradient circle
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center space-y-6">
        {/* Screen Reader Instructions */}
        <div className="sr-only" id="wheel-instructions">
          Project randomizer wheel. Select some projects from the list below to start spinning.
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
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10"
            aria-hidden="true"
          >
            <div className="w-0.5 h-8 sm:w-1 sm:h-10 lg:w-1.5 lg:h-12 bg-flamingo-300 shadow-lg"></div>
          </div>

          {/* Empty Wheel with Gradient */}
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 lg:w-112 lg:h-112 rounded-full border-4 border-flamingo-300 overflow-hidden bg-gradient-to-br from-diamond-400 via-flamingo-400 via-peach-400 to-mauve-400 opacity-60">
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white drop-shadow-lg">
                <p className="text-lg font-semibold">Select projects below</p>
                <p className="text-sm opacity-90">to get started!</p>
              </div>
            </div>
            
            {/* Subtle pulse animation */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-diamond-300 via-flamingo-300 via-peach-300 to-mauve-300 opacity-30 animate-pulse"></div>
          </div>
        </div>

        {/* Disabled Spin Button */}
        <Button
          disabled={true}
          size="lg"
          className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-primary to-mauve-500 hover:from-primary/90 hover:to-mauve-500/90 text-white shadow-lg opacity-50 cursor-not-allowed"
          aria-label="Spin the wheel (disabled - no projects selected)"
          aria-describedby="wheel-instructions"
        >
          Spin the Wheel!
        </Button>

      </div>
    );
  }

  const segmentAngle = 360 / projects.length;
  // Responsive wheel sizes: mobile: 280px, tablet: 384px, desktop: 448px
  const wheelSize = 448; // Base size for calculations (largest size)
  const radius = wheelSize / 2;

  // Project list for screen readers
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
        <div 
          ref={resultAnnouncementRef}
          aria-live="polite"
          aria-atomic="true"
        />
        
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

      {/* Wheel Container */}
      <div 
        className="relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
        role="application"
        aria-label={`Project randomizer wheel with ${projects.length} projects`}
        aria-describedby="wheel-description wheel-instructions project-alternatives"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Pointer Line */}
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10"
          aria-hidden="true"
        >
          <div className="w-0.5 h-8 sm:w-1 sm:h-10 lg:w-1.5 lg:h-12 bg-flamingo-300 shadow-lg"></div>
        </div>

        {/* Wheel */}
        <div
          ref={wheelRef}
          className={`relative w-72 h-72 sm:w-96 sm:h-96 lg:w-112 lg:h-112 rounded-full border-4 border-flamingo-300 overflow-hidden transition-transform duration-3000 ease-out ${
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
              'Z'
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
                className="absolute inset-0 w-full h-full"
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
                  strokeDasharray={index % 2 === 0 ? "5,5" : "none"}
                  opacity="0.3"
                />
                
                {/* Project title text with better contrast */}
                <text
                  x={textX}
                  y={textY}
                  fill="black"
                  stroke="white"
                  strokeWidth="2"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12"
                  fontWeight="700"
                  className="drop-shadow-lg"
                  style={{
                    transform: `rotate(${textAngle}deg)`,
                    transformOrigin: `${textX}px ${textY}px`,
                  }}
                >
                  {project.title.length > 15 
                    ? `${project.title.substring(0, 12)}...` 
                    : project.title
                  }
                </text>
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12"
                  fontWeight="700"
                  style={{
                    transform: `rotate(${textAngle}deg)`,
                    transformOrigin: `${textX}px ${textY}px`,
                  }}
                >
                  {project.title.length > 15 
                    ? `${project.title.substring(0, 12)}...` 
                    : project.title
                  }
                </text>
              </svg>
            );
          })}
        </div>
      </div>

      {/* Spin Button */}
      <Button
        onClick={handleSpin}
        disabled={disabled || isSpinning || projects.length === 0}
        size="lg"
        className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-primary to-mauve-500 hover:from-primary/90 hover:to-mauve-500/90 text-white shadow-lg"
        aria-label={
          isSpinning 
            ? `Spinning wheel to select from ${projects.length} projects` 
            : `Spin the wheel to randomly select from ${projects.length} projects`
        }
        aria-describedby="wheel-description"
      >
        {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
      </Button>


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