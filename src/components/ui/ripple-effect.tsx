/**
 * @fileoverview Ripple Effect Component for Enhanced Touch Feedback
 *
 * Provides visual ripple effects for touch interactions, enhancing the mobile
 * user experience with immediate visual feedback on touch events.
 *
 * @author @serabi
 * @created 2025-07-20
 */

import React, { useState, useCallback, useRef } from 'react';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('RippleEffect');

interface RippleInfo {
  id: string;
  x: number;
  y: number;
  size: number;
}

interface RippleEffectProps {
  /** Duration of ripple animation in milliseconds */
  duration?: number;
  /** Color of the ripple effect */
  color?: string;
  /** Maximum number of concurrent ripples */
  maxRipples?: number;
  /** Whether ripple is disabled */
  disabled?: boolean;
  /** Children to render */
  children: React.ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Click handler that triggers ripple */
  onClick?: (event: React.MouseEvent | React.TouchEvent) => void;
}

/**
 * Ripple effect component for enhanced touch feedback
 *
 * Creates animated ripple effects at the point of touch/click, providing
 * immediate visual feedback for user interactions on mobile devices.
 *
 * @param props - Component props
 * @returns JSX element with ripple effect capability
 *
 * @example
 * ```tsx
 * <RippleEffect
 *   duration={600}
 *   color="rgba(168, 85, 247, 0.3)"
 *   onClick={handleClick}
 * >
 *   <button>Click me!</button>
 * </RippleEffect>
 * ```
 */
export const RippleEffect: React.FC<RippleEffectProps> = ({
  duration = 600,
  color = 'rgba(255, 255, 255, 0.3)',
  maxRipples = 3,
  disabled = false,
  children,
  className = '',
  onClick,
}) => {
  const [ripples, setRipples] = useState<RippleInfo[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdCounter = useRef(0);

  const createRipple = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (disabled || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      // Get touch/click position
      let clientX: number, clientY: number;
      if ('touches' in event && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if ('clientX' in event) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        return; // Invalid event
      }

      // Calculate position relative to container
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Calculate ripple size (diameter should cover the entire container)
      const size =
        Math.max(
          Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
          Math.sqrt(Math.pow(rect.width - x, 2) + Math.pow(y, 2)),
          Math.sqrt(Math.pow(x, 2) + Math.pow(rect.height - y, 2)),
          Math.sqrt(Math.pow(rect.width - x, 2) + Math.pow(rect.height - y, 2))
        ) * 2;

      const rippleId = `ripple-${rippleIdCounter.current++}`;
      const newRipple: RippleInfo = { id: rippleId, x, y, size };

      logger.debug('Creating ripple effect', {
        x,
        y,
        size,
        containerWidth: rect.width,
        containerHeight: rect.height,
      });

      // Add new ripple and limit concurrent ripples
      setRipples(prev => {
        const updated = [...prev, newRipple];
        return updated.slice(-maxRipples);
      });

      // Remove ripple after animation completes
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== rippleId));
      }, duration);

      // Call onClick handler if provided
      onClick?.(event);
    },
    [disabled, duration, maxRipples, onClick]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      createRipple(event);
    },
    [createRipple]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      createRipple(event);
    },
    [createRipple]
  );

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {children}

      {/* Ripple animations */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="pointer-events-none absolute animate-ping rounded-full"
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            animationDuration: `${duration}ms`,
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            animationFillMode: 'forwards',
          }}
        />
      ))}
    </div>
  );
};

export default RippleEffect;
