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
    const normalizedAngle = (360 - (totalRotation % 360)) % 360;
    const selectedIndex = Math.floor(normalizedAngle / segmentAngle);
    const selectedProject = projects[selectedIndex];

    logger.debug('Wheel spin calculation', {
      totalRotation,
      normalizedAngle,
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

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No projects selected</p>
          <p className="text-sm">Select some projects to start spinning!</p>
        </div>
      </div>
    );
  }

  const segmentAngle = 360 / projects.length;
  const wheelSize = 320; // Size in pixels
  const radius = wheelSize / 2;

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Wheel Container */}
      <div className="relative">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-10">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-gray-800 dark:border-b-white"></div>
        </div>

        {/* Wheel */}
        <div
          ref={wheelRef}
          className={`relative w-80 h-80 rounded-full border-4 border-gray-800 dark:border-white overflow-hidden transition-transform duration-3000 ease-out ${
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