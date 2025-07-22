/**
 * @fileoverview Enhanced Touch Feedback Hook
 *
 * Provides comprehensive touch feedback including visual effects, haptic feedback,
 * and animation enhancements for improved mobile user experience.
 *
 * @author @serabi
 * @created 2025-07-20
 */

import { useState, useCallback, useRef } from 'react';
import { createLogger } from '@/utils/secureLogger';
import { useIsTouchDevice, useIsMobile } from '@/hooks/use-mobile';

const logger = createLogger('EnhancedTouchFeedback');

interface TouchFeedbackOptions {
  /** Enable haptic feedback */
  enableHaptic?: boolean;
  /** Enable visual ripple effects */
  enableRipple?: boolean;
  /** Enable scale animation on touch */
  enableScale?: boolean;
  /** Enable touch sound feedback */
  enableSound?: boolean;
  /** Duration of feedback animations */
  duration?: number;
  /** Intensity of haptic feedback ('light' | 'medium' | 'heavy') */
  hapticIntensity?: 'light' | 'medium' | 'heavy';
}

interface TouchFeedbackState {
  /** Whether touch is currently active */
  isPressed: boolean;
  /** Current ripple effects */
  ripples: Array<{
    id: string;
    x: number;
    y: number;
    timestamp: number;
  }>;
  /** Touch feedback message */
  feedbackMessage: string;
}

interface FeedbackData {
  intensity?: 'light' | 'medium' | 'heavy';
  message?: string;
  duration?: number;
}

const DEFAULT_OPTIONS: Required<TouchFeedbackOptions> = {
  enableHaptic: true,
  enableRipple: true,
  enableScale: true,
  enableSound: false,
  duration: 300,
  hapticIntensity: 'medium',
};

/**
 * Enhanced touch feedback hook for mobile interactions
 *
 * Provides comprehensive touch feedback including haptic vibration,
 * visual effects, and interactive animations to enhance mobile UX.
 *
 * @param options - Configuration options for touch feedback
 * @returns Touch feedback utilities and state
 *
 * @example
 * ```tsx
 * const {
 *   touchProps,
 *   isPressed,
 *   triggerFeedback,
 *   showMessage
 * } = useEnhancedTouchFeedback({
 *   enableHaptic: true,
 *   enableScale: true,
 *   duration: 200
 * });
 *
 * return (
 *   <button
 *     {...touchProps}
 *     className={`transition-transform ${isPressed ? 'scale-95' : 'scale-100'}`}
 *   >
 *     Touch me!
 *   </button>
 * );
 * ```
 */
export const useEnhancedTouchFeedback = (options: TouchFeedbackOptions = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const isTouchDevice = useIsTouchDevice();
  const isMobile = useIsMobile();

  const [state, setState] = useState<TouchFeedbackState>({
    isPressed: false,
    ripples: [],
    feedbackMessage: '',
  });

  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rippleIdCounter = useRef(0);

  /**
   * Trigger haptic feedback if available
   */
  const triggerHapticFeedback = useCallback(
    (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
      if (!opts.enableHaptic || !isTouchDevice) return;

      try {
        if ('vibrate' in navigator) {
          const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
          };
          navigator.vibrate(patterns[intensity]);
          logger.debug('Haptic feedback triggered', { intensity });
        }
      } catch (error) {
        logger.warn('Haptic feedback failed', { error });
      }
    },
    [opts.enableHaptic, isTouchDevice]
  );

  /**
   * Show temporary feedback message
   */
  const showFeedbackMessage = useCallback((message: string, duration: number = 2000) => {
    setState(prev => ({ ...prev, feedbackMessage: message }));

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, feedbackMessage: '' }));
    }, duration);

    logger.debug('Feedback message shown', { message, duration });
  }, []);

  /**
   * Create ripple effect at touch position
   */
  const createRipple = useCallback(
    (x: number, y: number) => {
      if (!opts.enableRipple) return;

      const rippleId = `ripple-${rippleIdCounter.current++}`;
      const ripple = {
        id: rippleId,
        x,
        y,
        timestamp: Date.now(),
      };

      setState(prev => ({
        ...prev,
        ripples: [...prev.ripples.slice(-2), ripple], // Keep max 3 ripples
      }));

      // Remove ripple after animation
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          ripples: prev.ripples.filter(r => r.id !== rippleId),
        }));
      }, opts.duration);

      logger.debug('Ripple effect created', { x, y, rippleId });
    },
    [opts.enableRipple, opts.duration]
  );

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!isTouchDevice) return;

      setState(prev => ({ ...prev, isPressed: true }));

      // Get touch position for ripple effect
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        const rect = (event.currentTarget as Element).getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        createRipple(x, y);
      }

      // Trigger haptic feedback
      triggerHapticFeedback(opts.hapticIntensity);

      logger.debug('Touch start handled');
    },
    [isTouchDevice, createRipple, triggerHapticFeedback, opts.hapticIntensity]
  );

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback(() => {
    if (!isTouchDevice) return;

    setState(prev => ({ ...prev, isPressed: false }));
    logger.debug('Touch end handled');
  }, [isTouchDevice]);

  /**
   * Handle mouse down (for desktop testing)
   */
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (isTouchDevice) return; // Only for non-touch devices

      setState(prev => ({ ...prev, isPressed: true }));

      // Create ripple effect at click position
      const rect = (event.currentTarget as Element).getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      createRipple(x, y);

      logger.debug('Mouse down handled');
    },
    [isTouchDevice, createRipple]
  );

  /**
   * Handle mouse up
   */
  const handleMouseUp = useCallback(() => {
    setState(prev => ({ ...prev, isPressed: false }));
    logger.debug('Mouse up handled');
  }, []);

  /**
   * Manual feedback trigger
   */
  const triggerFeedback = useCallback(
    (type: 'haptic' | 'message', data?: FeedbackData) => {
      switch (type) {
        case 'haptic':
          triggerHapticFeedback(data?.intensity || opts.hapticIntensity);
          break;
        case 'message':
          showFeedbackMessage(data?.message || 'Action completed', data?.duration);
          break;
      }
    },
    [triggerHapticFeedback, showFeedbackMessage, opts.hapticIntensity]
  );

  // Touch event handlers for components
  const touchProps = {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp, // Reset on mouse leave
  };

  // CSS classes for enhanced interactions
  const feedbackClasses = [
    isTouchDevice ? 'touch-manipulation' : '',
    opts.enableScale ? 'transition-transform duration-150' : '',
    state.isPressed && opts.enableScale ? 'scale-95' : '',
    'select-none', // Prevent text selection during interactions
  ]
    .filter(Boolean)
    .join(' ');

  return {
    // Event handlers
    touchProps,

    // State
    isPressed: state.isPressed,
    ripples: state.ripples,
    feedbackMessage: state.feedbackMessage,

    // Utilities
    triggerFeedback,
    showMessage: showFeedbackMessage,
    createRipple,

    // CSS helpers
    feedbackClasses,

    // Device info
    isTouchDevice,
    isMobile,
  };
};

export default useEnhancedTouchFeedback;
