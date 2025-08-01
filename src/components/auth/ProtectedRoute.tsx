import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { createLogger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const protectedRouteLogger = createLogger('ProtectedRoute');

/**
 * Inner component that handles the auth logic after hooks are called
 */
const ProtectedRouteInner: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, initialCheckComplete } = useAuth();
  const location = useLocation();

  // Debug logging for route protection decisions (dev only for security)
  protectedRouteLogger.debug('Route protection check:', {
    pathname: location.pathname,
    browserPathname: window.location.pathname,
    isLoading,
    initialCheckComplete,
    hasUser: !!user,
    userId: user?.id,
    timestamp: new Date().toISOString(),
    environment: import.meta.env.MODE,
  });

  // Alert if there's a mismatch between React Router and browser location
  if (location.pathname !== window.location.pathname) {
    protectedRouteLogger.warn('LOCATION MISMATCH DETECTED!', {
      routerPath: location.pathname,
      browserPath: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  }

  // Wait for both loading to complete AND initial check to complete
  // Also handle the case where user might be null during authentication
  if (isLoading || !initialCheckComplete || (user === null && initialCheckComplete && !isLoading)) {
    protectedRouteLogger.debug('Showing loading state for:', location.pathname, {
      isLoading,
      initialCheckComplete,
      hasUser: !!user,
      timestamp: new Date().toISOString(),
    });
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
        <div className="ml-3">
          <p className="text-muted-foreground">Loading...</p>
          {import.meta.env.DEV && (
            <p className="mt-1 text-xs text-muted-foreground">
              Route: {location.pathname} | Loading: {isLoading.toString()} | InitialCheck:{' '}
              {initialCheckComplete.toString()} | HasUser: {(!!user).toString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    protectedRouteLogger.debug('Redirecting to login from:', location.pathname, {
      isLoading,
      initialCheckComplete,
      timestamp: new Date().toISOString(),
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  protectedRouteLogger.debug('Allowing access to:', location.pathname, 'for user:', user.id, {
    timestamp: new Date().toISOString(),
  });

  return <>{children}</>;
};

/**
 * Protected route wrapper that requires authentication
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  try {
    return <ProtectedRouteInner>{children}</ProtectedRouteInner>;
  } catch (error) {
    protectedRouteLogger.error('Failed to render protected route:', error);
    // Fallback to loading state
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
        <div className="ml-3">
          <p className="text-muted-foreground">Initializing authentication...</p>
        </div>
      </div>
    );
  }
};
