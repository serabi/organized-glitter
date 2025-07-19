/**
 * @fileoverview Accessibility Announcements Hook
 *
 * Provides utilities for making screen reader announcements and managing
 * accessibility features for the randomizer components. Ensures WCAG 2.1 AA
 * compliance with proper ARIA live regions and announcement management.
 *
 * @author serabi
 * @version 1.0.0
 * @since 2025-07-19
 */

import { useRef, useCallback, useEffect } from 'react';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('AccessibilityAnnouncements');

/**
 * Priority levels for screen reader announcements
 */
export type AnnouncementPriority = 'polite' | 'assertive';

/**
 * Configuration for accessibility announcements
 */
interface AnnouncementConfig {
  /** Priority level for the announcement */
  priority?: AnnouncementPriority;
  /** Whether to clear previous announcements */
  clearPrevious?: boolean;
  /** Delay before making the announcement (ms) */
  delay?: number;
}

/**
 * Hook for managing accessibility announcements and screen reader support
 *
 * Provides utilities for making announcements to screen readers, managing
 * ARIA live regions, and ensuring proper accessibility feedback for user actions.
 *
 * @returns Object with announcement utilities and refs
 *
 * @example
 * ```tsx
 * const { announce, liveRegionRef, statusRef } = useAccessibilityAnnouncements();
 *
 * // Make an announcement
 * announce('Wheel spinning started', { priority: 'assertive' });
 *
 * // Include live regions in JSX
 * <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />
 * <div ref={statusRef} aria-live="assertive" aria-atomic="true" className="sr-only" />
 * ```
 */
export const useAccessibilityAnnouncements = () => {
  /** Reference to the polite live region */
  const liveRegionRef = useRef<HTMLDivElement>(null);
  /** Reference to the assertive live region */
  const statusRef = useRef<HTMLDivElement>(null);
  /** Reference to track announcement timeouts */
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Make an announcement to screen readers
   *
   * @param message - The message to announce
   * @param config - Configuration options for the announcement
   */
  const announce = useCallback((message: string, config: AnnouncementConfig = {}) => {
    const { priority = 'polite', clearPrevious = false, delay = 0 } = config;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const makeAnnouncement = () => {
      const targetRef = priority === 'assertive' ? statusRef : liveRegionRef;

      if (targetRef.current) {
        // Clear previous announcement if requested
        if (clearPrevious) {
          targetRef.current.textContent = '';
          // Small delay to ensure screen readers notice the change
          setTimeout(() => {
            if (targetRef.current) {
              targetRef.current.textContent = message;
            }
          }, 50);
        } else {
          targetRef.current.textContent = message;
        }

        logger.debug('Accessibility announcement made', {
          message,
          priority,
          clearPrevious,
          delay,
        });
      } else {
        logger.warn('Live region not available for announcement', {
          message,
          priority,
          targetRefExists: !!targetRef.current,
        });
      }
    };

    if (delay > 0) {
      timeoutRef.current = setTimeout(makeAnnouncement, delay);
    } else {
      makeAnnouncement();
    }
  }, []);

  /**
   * Clear all announcements
   */
  const clearAnnouncements = useCallback(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = '';
    }
    if (statusRef.current) {
      statusRef.current.textContent = '';
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Announce spin start with appropriate messaging
   */
  const announceSpinStart = useCallback(
    (projectCount: number) => {
      announce(
        `Spinning wheel to select from ${projectCount} project${projectCount !== 1 ? 's' : ''}...`,
        { priority: 'assertive', clearPrevious: true }
      );
    },
    [announce]
  );

  /**
   * Announce spin result with project details
   */
  const announceSpinResult = useCallback(
    (projectTitle: string, projectDetails?: string) => {
      const message = projectDetails
        ? `Spin complete! Selected project: ${projectTitle} by ${projectDetails}`
        : `Spin complete! Selected project: ${projectTitle}`;

      announce(message, { priority: 'assertive', clearPrevious: true, delay: 100 });
    },
    [announce]
  );

  /**
   * Announce keyboard navigation instructions
   */
  const announceKeyboardInstructions = useCallback(() => {
    announce(
      'Use Enter or Space to spin the wheel. Use Escape to exit focus. Use Tab to navigate between elements.',
      { priority: 'polite' }
    );
  }, [announce]);

  /**
   * Announce touch gesture instructions
   */
  const announceTouchInstructions = useCallback(() => {
    announce('Tap the spin button or swipe up on the wheel to start spinning.', {
      priority: 'polite',
    });
  }, [announce]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    announce,
    clearAnnouncements,
    announceSpinStart,
    announceSpinResult,
    announceKeyboardInstructions,
    announceTouchInstructions,
    liveRegionRef,
    statusRef,
  };
};

/**
 * Hook for managing focus and keyboard navigation
 *
 * Provides utilities for managing focus states, keyboard navigation,
 * and ensuring proper focus management for accessibility.
 *
 * @returns Object with focus management utilities
 */
export const useFocusManagement = () => {
  /** Reference to the currently focused element */
  const focusedElementRef = useRef<HTMLElement | null>(null);
  /** Reference to track focus trap state */
  const focusTrapActiveRef = useRef<boolean>(false);

  /**
   * Set focus to an element with proper error handling
   */
  const setFocus = useCallback((element: HTMLElement | null, options?: FocusOptions) => {
    if (element && typeof element.focus === 'function') {
      try {
        element.focus(options);
        focusedElementRef.current = element;
        logger.debug('Focus set successfully', {
          elementTag: element.tagName,
          elementId: element.id,
          elementClass: element.className,
        });
      } catch (error) {
        logger.warn('Failed to set focus', {
          error: error instanceof Error ? error.message : 'Unknown error',
          elementTag: element?.tagName,
        });
      }
    }
  }, []);

  /**
   * Remove focus from current element
   */
  const removeFocus = useCallback(() => {
    if (focusedElementRef.current && typeof focusedElementRef.current.blur === 'function') {
      try {
        focusedElementRef.current.blur();
        focusedElementRef.current = null;
        logger.debug('Focus removed successfully');
      } catch (error) {
        logger.warn('Failed to remove focus', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }, []);

  /**
   * Check if an element is focusable
   */
  const isFocusable = useCallback((element: HTMLElement): boolean => {
    if (!element) return false;

    // Check if element is disabled or hidden
    if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    // Check if element has tabindex
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex !== null) {
      return parseInt(tabIndex, 10) >= 0;
    }

    // Check if element is naturally focusable
    const focusableElements = [
      'button',
      'input',
      'select',
      'textarea',
      'a',
      'area',
      'object',
      'embed',
      'iframe',
    ];

    return focusableElements.includes(element.tagName.toLowerCase());
  }, []);

  /**
   * Get all focusable elements within a container
   */
  const getFocusableElements = useCallback(
    (container: HTMLElement): HTMLElement[] => {
      if (!container) return [];

      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        'area[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ];

      const elements = container.querySelectorAll(focusableSelectors.join(', '));
      return Array.from(elements).filter(el => isFocusable(el as HTMLElement)) as HTMLElement[];
    },
    [isFocusable]
  );

  return {
    setFocus,
    removeFocus,
    isFocusable,
    getFocusableElements,
    focusedElementRef,
    focusTrapActiveRef,
  };
};
