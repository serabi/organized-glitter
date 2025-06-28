import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Project } from '@/types/project';
import { ChevronDown } from 'lucide-react';
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
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleSpin = useCallback(() => {
    if (isSpinning || projects.length === 0) return;

    logger.debug('Starting wheel spin', { projectCount: projects.length });
    setIsSpinning(true);

    // Calculate random rotation (multiple full rotations + random angle)
    const baseRotation = 1800; // 5 full rotations (360 * 5)
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

    // Wait for animation to complete
    setTimeout(() => {
      setIsSpinning(false);
      if (selectedProject) {
        onSpinComplete(selectedProject);
        logger.info('Wheel spin completed', {
          selectedProjectId: selectedProject.id,
          selectedProjectTitle: selectedProject.title,
        });
      }
    }, 3000); // Match the CSS animation duration

  }, [isSpinning, projects, rotation, onSpinComplete]);

  // Empty wheel state - show beautiful gradient circle
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center space-y-6">
        {/* Empty Wheel Container */}
        <div className="relative">
          {/* Pointer Arrow */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
            <ChevronDown className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-800 dark:text-white drop-shadow-lg" />
          </div>

          {/* Empty Wheel with Gradient */}
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 lg:w-112 lg:h-112 rounded-full border-4 border-gray-800 dark:border-white overflow-hidden bg-gradient-to-br from-diamond-400 via-flamingo-400 via-peach-400 to-mauve-400 opacity-60">
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
        >
          Spin the Wheel!
        </Button>

        {/* Instructions */}
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Select your in-progress projects below, then come back to spin the wheel!
        </p>
      </div>
    );
  }

  const segmentAngle = 360 / projects.length;
  // Responsive wheel sizes: mobile: 280px, tablet: 384px, desktop: 448px
  const wheelSize = 448; // Base size for calculations (largest size)
  const radius = wheelSize / 2;

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Wheel Container */}
      <div className="relative">
        {/* Pointer Arrow */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
          <ChevronDown className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-800 dark:text-white drop-shadow-lg" />
        </div>

        {/* Wheel */}
        <div
          ref={wheelRef}
          className={`relative w-72 h-72 sm:w-96 sm:h-96 lg:w-112 lg:h-112 rounded-full border-4 border-gray-800 dark:border-white overflow-hidden transition-transform duration-3000 ease-out ${
            isSpinning ? 'animate-spin-custom' : ''
          }`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center',
          }}
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
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.9"
                />
                
                {/* Project title text */}
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12"
                  fontWeight="600"
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
      >
        {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
      </Button>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Click the button to spin and randomly select a project to work on today!
      </p>

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
      `}</style>
    </div>
  );
};