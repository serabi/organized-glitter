import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { createLogger } from '@/utils/secureLogger';
import Home from '@/pages/Home';

const logger = createLogger('RootRoute');

/**
 * Root route component that handles initial authentication redirect
 * Redirects authenticated users to overview, shows home page for guests
 */
export const RootRoute: React.FC = () => {
  const { user, isLoading, isAuthenticated, initialCheckComplete } = useAuth();

  // Debug logging to help diagnose loading issues
  logger.debug('Auth state:', {
    isLoading,
    hasUser: !!user,
    isAuthenticated,
    initialCheckComplete,
    userId: user?.id,
    timestamp: new Date().toISOString(),
  });

  // IMPORTANT: Wait for both loading to complete AND initial check to complete
  if (isLoading || !initialCheckComplete) {
    logger.debug('Still loading or initial check not complete, showing loading...', {
      isLoading,
      initialCheckComplete,
    });

    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
        <p className="ml-3 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Check if user is authenticated (either user OR session is sufficient for redirect)
  if (isAuthenticated) {
    logger.info('User authenticated, redirecting to overview...', {
      hasUser: !!user,
      isAuthenticated,
      userId: user?.id,
      currentUrl: window.location.href,
      currentPath: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
    logger.info('🔄 NAVIGATION: Rendering <Navigate to="/overview" replace />');
    return <Navigate to="/overview" replace />;
  }

  logger.debug('No authentication found, showing Home page...');

  return <Home />;
};
