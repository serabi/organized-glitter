import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LocationSyncProviderProps {
  children: React.ReactNode;
}

/**
 * LocationSyncProvider monitors for React Router location context desynchronization
 * and performs corrective navigation when URL and location state become mismatched.
 * 
 * This fixes the production issue where navigate() updates the browser URL but
 * useLocation() returns stale location data due to React reconciliation race conditions.
 * 
 * Uses React Router best practices by working within Router context.
 */
export const LocationSyncProvider: React.FC<LocationSyncProviderProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastSyncRef = useRef<string>('');
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const periodicCheckRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any pending sync timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Check for location mismatch
    const currentBrowserPath = window.location.pathname;
    const currentRouterPath = location.pathname;

    if (import.meta.env.DEV) {
      console.log('[LocationSync] Status check:', {
        browserPath: currentBrowserPath,
        routerPath: currentRouterPath,
        isMatched: currentBrowserPath === currentRouterPath,
        timestamp: new Date().toISOString(),
      });
    }

    if (currentBrowserPath !== currentRouterPath) {
      // Prevent infinite sync loops by tracking last sync
      const syncKey = `${currentBrowserPath}-${currentRouterPath}`;
      if (lastSyncRef.current !== syncKey) {
        lastSyncRef.current = syncKey;

        console.warn('[LocationSync] Detected location mismatch, performing corrective navigation:', {
          browserPath: currentBrowserPath,
          routerPath: currentRouterPath,
          timestamp: new Date().toISOString(),
        });

        // Immediate corrective navigation - don't wait for setTimeout
        console.warn('[LocationSync] 🔄 Executing immediate corrective navigation to:', currentBrowserPath);
        
        try {
          // Use replace navigation with location state to force Router context refresh
          navigate(currentBrowserPath, { 
            replace: true,
            state: { locationSync: true, timestamp: Date.now() }
          });
          
          console.log('[LocationSync] ✅ Corrective navigation executed successfully');
        } catch (error) {
          console.error('[LocationSync] ❌ Navigate failed, trying fallback:', error);
          
          // Fallback: Use direct history manipulation if navigate() fails
          try {
            window.history.replaceState({}, '', currentBrowserPath);
            // Force a location change event
            window.dispatchEvent(new PopStateEvent('popstate'));
            console.log('[LocationSync] ✅ Fallback history manipulation completed');
          } catch (fallbackError) {
            console.error('[LocationSync] ❌ Fallback also failed:', fallbackError);
          }
        }
      }
    } else {
      // Reset sync tracking when paths match
      lastSyncRef.current = '';
    }

    // Cleanup function
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [location.pathname, navigate]);

  // Additional periodic check to catch missed navigation events
  // This runs independently of location changes to catch cases where
  // the useEffect dependency array doesn't trigger but mismatch exists
  useEffect(() => {
    const performPeriodicCheck = () => {
      const currentBrowserPath = window.location.pathname;
      const currentRouterPath = location.pathname;

      if (currentBrowserPath !== currentRouterPath) {
        console.warn('[LocationSync] 🔍 Periodic check detected mismatch:', {
          browserPath: currentBrowserPath,
          routerPath: currentRouterPath,
          timestamp: new Date().toISOString(),
        });

        // Force immediate corrective navigation
        try {
          navigate(currentBrowserPath, { 
            replace: true,
            state: { locationSync: true, periodicCheck: true, timestamp: Date.now() }
          });
          console.log('[LocationSync] ✅ Periodic corrective navigation executed');
        } catch (error) {
          console.error('[LocationSync] ❌ Periodic navigation failed:', error);
        }
      }
    };

    // Check every 100ms for the first 2 seconds after any location change
    // This catches navigation that should have happened but didn't
    periodicCheckRef.current = setTimeout(() => {
      performPeriodicCheck();
      
      // Additional check after a short delay
      setTimeout(performPeriodicCheck, 100);
    }, 50);

    return () => {
      if (periodicCheckRef.current) {
        clearTimeout(periodicCheckRef.current);
      }
    };
  }, [location.pathname, navigate]);

  return <>{children}</>;
};