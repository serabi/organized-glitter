/**
 * @fileoverview Touch Gesture Support Hook
 *
 * Provides comprehensive touch gesture support for mobile devices including
 * swipe detection, touch optimization, and gesture-based interactions for
 * the randomizer wheel component.
 *
 * @author serabi
 * @version 1.0.0
 * @since 2025-07-19
 */

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { createLogger } from '@/utils/logger';
import { useIsTouchDevice } from '@/hooks/use-mobile';

const logger = createLogger('TouchGestures');

/**
 * Touch gesture configuration options
 */
interface TouchGestureConfig {
  /** Minimum distance for swipe detection (px) */
  swipeThreshold?: number;
  /** Maximum time for swipe gesture (ms) */
  swipeTimeout?: number;
  /** Minimum velocity for swipe detection (px/ms) */
  velocityThreshold?: number;
  /** Enable haptic feedback if available */
  enableHaptics?: boolean;
  /** Enable touch sound feedback */
  enableSoundFeedback?: boolean;
}

/**
 * Touch gesture event data
 */
interface TouchGestureEvent {
  /** Type of gesture detected */
  type: 'swipe' | 'tap' | 'longpress';
  /** Direction of swipe (if applicable) */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Distance of gesture */
  distance?: number;
  /** Velocity of gesture */
  velocity?: number;
  /** Duration of gesture */
  duration?: number;
  /** Original touch event */
  originalEvent: React.TouchEvent;
}

/**
 * Touch gesture callbacks
 */
interface TouchGestureCallbacks {
  /** Called when swipe gesture is detected */
  onSwipe?: (event: TouchGestureEvent) => void;
  /** Called when tap gesture is detected */
  onTap?: (event: TouchGestureEvent) => void;
  /** Called when long press is detected */
  onLongPress?: (event: TouchGestureEvent) => void;
  /** Called when touch starts */
  onTouchStart?: (event: React.TouchEvent) => void;
  /** Called when touch ends */
  onTouchEnd?: (event: React.TouchEvent) => void;
}

/**
 * Touch state tracking
 */
interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  isTracking: boolean;
  touchId: number | null;
}

/**
 * Default configuration for touch gestures
 */
const DEFAULT_CONFIG: Required<TouchGestureConfig> = {
  swipeThreshold: 50,
  swipeTimeout: 500,
  velocityThreshold: 0.1,
  enableHaptics: true,
  enableSoundFeedback: false,
};

/**
 * Hook for comprehensive touch gesture support
 *
 * Provides touch gesture detection and handling for mobile devices,
 * including swipe gestures, tap detection, and touch optimization.
 *
 * @param callbacks - Gesture event callbacks
 * @param config - Configuration options
 * @returns Touch gesture utilities and event handlers
 *
 * @example
 * ```tsx
 * const { touchHandlers, isTouch } = useTouchGestures({
 *   onSwipe: (event) => {
 *     if (event.direction === 'up') {
 *       handleSpin();
 *     }
 *   },
 *   onTap: () => {
 *     handleSpin();
 *   }
 * });
 *
 * <div {...touchHandlers}>
 *   Touch-enabled content
 * </div>
 * ```
 */
export const useTouchGestures = (
  callbacks: TouchGestureCallbacks = {},
  config: TouchGestureConfig = {}
) => {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const touchStateRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isTracking: false,
    touchId: null,
  });
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTouch = useIsTouchDevice();

  /**
   * Trigger haptic feedback if available and enabled
   */
  const triggerHapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!mergedConfig.enableHaptics || !('vibrate' in navigator)) return;

      try {
        // Use Vibration API for haptic feedback
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30],
        };
        navigator.vibrate(patterns[type]);
      } catch (error) {
        logger.debug('Haptic feedback not available', { error });
      }
    },
    [mergedConfig.enableHaptics]
  );

  /**
   * Calculate gesture velocity
   */
  const calculateVelocity = useCallback((distance: number, duration: number): number => {
    return duration > 0 ? distance / duration : 0;
  }, []);

  /**
   * Determine swipe direction
   */
  const getSwipeDirection = useCallback(
    (deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' => {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX > absDeltaY) {
        return deltaX > 0 ? 'right' : 'left';
      } else {
        return deltaY > 0 ? 'down' : 'up';
      }
    },
    []
  );

  /**
   * Handle touch start event
   */
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      // Only handle single touch for now
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      const touchState = touchStateRef.current;

      touchState.startX = touch.clientX;
      touchState.startY = touch.clientY;
      touchState.startTime = Date.now();
      touchState.isTracking = true;
      touchState.touchId = touch.identifier;

      // Set up long press detection
      if (callbacks.onLongPress) {
        longPressTimeoutRef.current = setTimeout(() => {
          if (touchState.isTracking) {
            const gestureEvent: TouchGestureEvent = {
              type: 'longpress',
              duration: Date.now() - touchState.startTime,
              originalEvent: event,
            };
            callbacks.onLongPress?.(gestureEvent);
            triggerHapticFeedback('medium');
          }
        }, 500); // 500ms for long press
      }

      callbacks.onTouchStart?.(event);

      logger.debug('Touch start detected', {
        x: touch.clientX,
        y: touch.clientY,
        touchId: touch.identifier,
      });
    },
    [callbacks, triggerHapticFeedback]
  );

  /**
   * Handle touch end event
   */
  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const touchState = touchStateRef.current;

      if (!touchState.isTracking) return;

      // Clear long press timeout
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      // Find the touch that ended
      const touch = Array.from(event.changedTouches).find(t => t.identifier === touchState.touchId);

      if (!touch) return;

      const endTime = Date.now();
      const duration = endTime - touchState.startTime;
      const deltaX = touch.clientX - touchState.startX;
      const deltaY = touch.clientY - touchState.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = calculateVelocity(distance, duration);

      // Reset tracking state
      touchState.isTracking = false;
      touchState.touchId = null;

      // Determine gesture type
      if (
        distance >= mergedConfig.swipeThreshold &&
        duration <= mergedConfig.swipeTimeout &&
        velocity >= mergedConfig.velocityThreshold
      ) {
        // Swipe gesture detected
        const direction = getSwipeDirection(deltaX, deltaY);
        const gestureEvent: TouchGestureEvent = {
          type: 'swipe',
          direction,
          distance,
          velocity,
          duration,
          originalEvent: event,
        };

        callbacks.onSwipe?.(gestureEvent);
        triggerHapticFeedback('light');

        logger.debug('Swipe gesture detected', {
          direction,
          distance: distance.toFixed(2),
          velocity: velocity.toFixed(3),
          duration,
        });
      } else if (distance < mergedConfig.swipeThreshold && duration < 300) {
        // Tap gesture detected
        const gestureEvent: TouchGestureEvent = {
          type: 'tap',
          duration,
          originalEvent: event,
        };

        callbacks.onTap?.(gestureEvent);
        triggerHapticFeedback('light');

        logger.debug('Tap gesture detected', {
          duration,
          distance: distance.toFixed(2),
        });
      }

      callbacks.onTouchEnd?.(event);
    },
    [callbacks, mergedConfig, calculateVelocity, getSwipeDirection, triggerHapticFeedback]
  );

  /**
   * Handle touch move event (for gesture tracking)
   */
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    const touchState = touchStateRef.current;

    if (!touchState.isTracking) return;

    // Find the tracked touch
    const touch = Array.from(event.touches).find(t => t.identifier === touchState.touchId);

    if (!touch) return;

    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Cancel long press if moved too far
    if (distance > 10 && longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  /**
   * Touch event handlers object
   */
  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  return {
    touchHandlers,
    isTouch,
    triggerHapticFeedback,
  };
};

/**
 * Hook for wheel-specific touch gestures
 *
 * Provides specialized touch gesture handling for the randomizer wheel,
 * including swipe-to-spin and touch optimization for wheel interactions.
 *
 * @param onSpin - Callback when spin gesture is detected
 * @param disabled - Whether touch gestures should be disabled
 * @returns Wheel-specific touch handlers and utilities
 */
export const useWheelTouchGestures = (onSpin: () => void, disabled: boolean = false) => {
  const [touchFeedback, setTouchFeedback] = useState<string>('');
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Show touch feedback message
   */
  const showTouchFeedback = useCallback((message: string, duration: number = 2000) => {
    setTouchFeedback(message);

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setTouchFeedback('');
    }, duration);
  }, []);

  const { touchHandlers, isTouch, triggerHapticFeedback } = useTouchGestures(
    {
      onSwipe: event => {
        if (disabled) return;

        // Enhanced swipe detection for better accessibility
        if (event.direction === 'up' && event.velocity && event.velocity > 0.15) {
          onSpin();
          showTouchFeedback('Swipe up detected - spinning wheel!');
          triggerHapticFeedback('medium'); // Stronger feedback for successful gesture
          logger.info('Wheel spin triggered by swipe gesture', {
            direction: event.direction,
            velocity: event.velocity,
            distance: event.distance,
          });
        } else if (event.direction === 'up' && event.velocity && event.velocity > 0.05) {
          showTouchFeedback('Swipe up faster to spin the wheel!');
          triggerHapticFeedback('light'); // Light feedback for attempted gesture
        } else if (event.direction === 'down') {
          showTouchFeedback('Swipe up to spin the wheel');
          triggerHapticFeedback('light');
        } else if (event.direction === 'left' || event.direction === 'right') {
          showTouchFeedback('Swipe up on the wheel to spin');
          triggerHapticFeedback('light');
        }
      },
      onTap: () => {
        if (disabled) return;
        // Provide feedback for tap on wheel area
        showTouchFeedback('Tap the spin button below or swipe up to spin');
        triggerHapticFeedback('light');
      },
      onLongPress: () => {
        if (disabled) return;
        showTouchFeedback(
          'Touch help: Swipe up on wheel or tap spin button. Double tap for quick access.'
        );
        triggerHapticFeedback('medium');
      },
    },
    {
      swipeThreshold: 25, // Lower threshold for better accessibility
      velocityThreshold: 0.1, // Lower velocity requirement
      enableHaptics: true,
      enableSoundFeedback: false, // Keep sound feedback disabled for now
    }
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  return {
    wheelTouchHandlers: touchHandlers,
    isTouch,
    touchFeedback,
    showTouchFeedback,
    triggerHapticFeedback,
  };
};
