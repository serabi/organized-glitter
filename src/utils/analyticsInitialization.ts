/**
 * Analytics initialization utilities for application startup
 */

import { inject } from '@vercel/analytics';
import { initializePostHog } from './posthog';
import { logger } from './logger';

/**
 * Initialize all analytics services based on environment
 */
export const initializeAnalytics = (): void => {
  // Initialize Vercel Analytics (production only)
  if (import.meta.env.PROD) {
    inject();
  }

  // Initialize PostHog Analytics (dev + prod)
  initializePostHog();
};

/**
 * Log application startup information
 */
export const logStartupInfo = (): void => {
  if (import.meta.env.DEV) {
    logger.info(`Organized Glitter - Build Version: ${import.meta.env.__BUILD_VERSION__}`);
    logger.log('Image upload limits: Project images up to 50MB (auto-compressed)');
    logger.info('Rate limiting is active. Default limits: 500 requests/5s per IP');
  } else {
    // Production environment debugging
    logger.log('🚀 Organized Glitter Production Build');
    logger.log('Environment check:', {
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD,
      hasPocketbaseUrl: !!import.meta.env.VITE_POCKETBASE_URL,
      buildVersion: import.meta.env.__BUILD_VERSION__,
    });
  }
};
