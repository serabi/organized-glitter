import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, isPostHogAvailable } from '@/utils/posthog';
import { logger } from '@/utils/logger';

/**
 * Custom hook to track pageviews with PostHog
 * Automatically tracks route changes in React Router
 */
export function usePostHogPageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Only track if PostHog is available and initialized
    if (!isPostHogAvailable()) {
      return;
    }

    // Get the current path and search params
    const currentPath = location.pathname + location.search;

    // Track the pageview with PostHog
    trackEvent('$pageview', {
      $current_url: window.location.href,
      $pathname: location.pathname,
      $search: location.search,
      $hash: location.hash,
      timestamp: new Date().toISOString(),
    });

    // Log in development for debugging
    if (import.meta.env.DEV) {
      logger.log('[PostHog] Pageview tracked:', {
        path: currentPath,
        href: window.location.href,
      });
    }
  }, [location.pathname, location.search, location.hash]);
}
