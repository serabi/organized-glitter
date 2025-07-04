import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';

interface LocationSyncProviderProps {
  children: React.ReactNode;
}

/**
 * LocationSyncProvider provides a lightweight location monitoring system.
 *
 * Since we've eliminated window.location.href usage throughout the app,
 * this component now serves as a safety net for any remaining edge cases
 * and provides helpful debugging information in development.
 */
export const LocationSyncProvider: React.FC<LocationSyncProviderProps> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // Development-only location monitoring for debugging
    if (import.meta.env.DEV) {
      const currentBrowserPath = window.location.pathname;
      const currentRouterPath = location.pathname;

      // Only log if there's a mismatch (should be rare now)
      if (currentBrowserPath !== currentRouterPath) {
        logger.warn('[LocationSync] Location mismatch detected:', {
          browserPath: currentBrowserPath,
          routerPath: currentRouterPath,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [location.pathname]);

  return <>{children}</>;
};
