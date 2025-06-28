import posthog from 'posthog-js';
import { createLogger } from '@/utils/secureLogger';

const posthogLogger = createLogger('PostHog');

// PostHog configuration
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

let isInitialized = false;

/**
 * Initialize PostHog analytics
 */
export function initializePostHog() {
  if (typeof window === 'undefined') {
    posthogLogger.debug('Skipping initialization - no window object');
    return;
  }

  if (isInitialized) {
    posthogLogger.debug('Already initialized');
    return;
  }

  if (!POSTHOG_KEY) {
    posthogLogger.debug('No API key found - skipping initialization');
    posthogLogger.debug('Environment check:', {
      hasKey: !!POSTHOG_KEY,
      host: POSTHOG_HOST,
      nodeEnv: import.meta.env.NODE_ENV,
    });
    return;
  }

  try {
    posthogLogger.debug('Initializing with config:', {
      api_host: POSTHOG_HOST,
      hasKey: !!POSTHOG_KEY,
      keyPrefix: POSTHOG_KEY.substring(0, 8) + '...',
    });

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only', // Only create profiles for identified users
      loaded: posthogInstance => {
        posthogLogger.debug('Successfully loaded and ready');
        // Test that PostHog is working
        try {
          posthogInstance.capture('posthog_initialized', {
            timestamp: new Date().toISOString(),
            environment: import.meta.env.NODE_ENV || 'unknown',
          });
          posthogLogger.debug('Test event sent successfully');
        } catch (testError) {
          posthogLogger.error('Test event failed:', testError);
        }
      },
      bootstrap: {
        distinctID: undefined, // Let PostHog generate anonymous ID
      },
      // Privacy settings
      respect_dnt: true,
      opt_out_capturing_by_default: false,
      // Performance settings
      capture_pageview: false, // We handle pageviews manually with React Router
      capture_pageleave: true,
      // Exception capture settings
      capture_heatmaps: true,
      capture_performance: true,
      // Session recording configuration
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
          email: false,
        },
        maskInputFn: (text: string, element?: HTMLElement | undefined): string => {
          // Mask sensitive input types
          if (element?.getAttribute('type') === 'password') return text.replace(/./g, '*');
          if (element?.getAttribute('data-sensitive') === 'true') return text.replace(/./g, '*');
          return text;
        },
      },
      // Debug settings
      debug: import.meta.env.NODE_ENV === 'development',
    });

    // Make PostHog available globally for our analytics functions
    (window as unknown as Window & { posthog: typeof posthog }).posthog = posthog;
    isInitialized = true;

    posthogLogger.debug('Analytics initialized successfully');
  } catch (error) {
    posthogLogger.error('Failed to initialize:', error);
    posthogLogger.error('Configuration used:', {
      api_host: POSTHOG_HOST,
      hasKey: !!POSTHOG_KEY,
    });
  }
}

// Track last identified user to prevent duplicate calls
let lastIdentifiedUser: string | null = null;

/**
 * Identify a user in PostHog
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && isInitialized) {
    // Avoid duplicate identification for the same user
    if (lastIdentifiedUser === userId) {
      return;
    }

    posthog.identify(userId, properties);
    lastIdentifiedUser = userId;

    // Only log in dev mode to reduce console noise
    if (import.meta.env.DEV) {
      posthogLogger.debug('User identified:', userId);
    }
  }
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && isInitialized) {
    posthog.capture(eventName, properties);
    posthogLogger.debug('Event tracked:', eventName, properties);
  }
}

/**
 * Reset PostHog (for logout)
 */
export function resetPostHog() {
  if (typeof window !== 'undefined' && isInitialized) {
    posthog.reset();
    posthogLogger.debug('Analytics reset');
  }
}

/**
 * Capture an exception or error in PostHog
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && isInitialized) {
    posthog.capture('$exception', {
      $exception_type: error.name,
      $exception_message: error.message,
      $exception_stack: error.stack,
      $exception_source: 'javascript',
      timestamp: new Date().toISOString(),
      ...context,
    });
    posthogLogger.debug('Exception captured:', error.message);
  }
}

/**
 * Check if PostHog is available and initialized
 */
export function isPostHogAvailable(): boolean {
  return typeof window !== 'undefined' && isInitialized && !!POSTHOG_KEY;
}
