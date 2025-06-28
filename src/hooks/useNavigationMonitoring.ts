import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { createLogger } from '@/utils/secureLogger';
import { useAuth } from '@/hooks/useAuth';

const logger = createLogger('NavigationMonitoring');

/**
 * Hook to monitor navigation events and log potential issues
 * Helps diagnose routing problems like Settings -> Dashboard 404 errors
 */
export const useNavigationMonitoring = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Log every navigation event with comprehensive context
    logger.info('🧭 Navigation Event', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      navigationType,
      browserPathname: window.location.pathname,
      browserHref: window.location.href,
      isAuthenticated,
      hasUser: !!user,
      isAuthLoading: isLoading,
      userId: user?.id,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100),
      referrer: document.referrer || 'direct',
    });

    // Check for router/browser location mismatches
    if (location.pathname !== window.location.pathname) {
      logger.warn('🚨 ROUTER/BROWSER LOCATION MISMATCH DETECTED!', {
        routerPathname: location.pathname,
        browserPathname: window.location.pathname,
        routerSearch: location.search,
        browserSearch: window.location.search,
        navigationType,
        timestamp: new Date().toISOString(),
      });
    }

    // Detect potential problematic navigation patterns
    const fromState = location.state as { from?: { pathname: string } } | null;
    if (fromState?.from?.pathname === '/profile' && location.pathname === '/dashboard') {
      logger.info('🎯 DETECTED: Settings -> Dashboard navigation pattern', {
        from: fromState.from.pathname,
        to: location.pathname,
        navigationType,
        authState: {
          isAuthenticated,
          hasUser: !!user,
          isLoading,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Monitor for common problematic routes
    const problematicRoutes = ['/settings', '/config', '/admin'];
    if (problematicRoutes.some(route => location.pathname.includes(route))) {
      logger.warn('⚠️ Navigation to potentially problematic route detected', {
        pathname: location.pathname,
        timestamp: new Date().toISOString(),
      });
    }

    // Check network status during navigation
    if (!navigator.onLine) {
      logger.warn('🌐 Navigation attempted while offline', {
        pathname: location.pathname,
        timestamp: new Date().toISOString(),
      });
    }

  }, [location, navigationType, user, isAuthenticated, isLoading]);

  // Monitor performance issues
  useEffect(() => {
    const navigationStart = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationStart) {
      const loadTime = navigationStart.loadEventEnd - navigationStart.loadEventStart;
      if (loadTime > 3000) { // > 3 seconds
        logger.warn('🐌 Slow navigation detected', {
          loadTime: `${loadTime}ms`,
          pathname: location.pathname,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [location]);

  return {
    currentLocation: location,
    navigationType,
  };
};