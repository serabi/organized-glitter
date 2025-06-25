import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route wrapper that requires authentication
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, initialCheckComplete } = useAuth();
  const location = useLocation();

  // Debug logging for route protection decisions (both dev and prod for debugging)
  console.log('[ProtectedRoute] Route protection check:', {
    pathname: location.pathname,
    browserPathname: window.location.pathname, // Compare with actual browser URL
    isLoading,
    initialCheckComplete,
    hasUser: !!user,
    userId: user?.id,
    timestamp: new Date().toISOString(),
    environment: import.meta.env.MODE,
  });
  
  // Alert if there's a mismatch between React Router and browser location
  if (location.pathname !== window.location.pathname) {
    console.warn('[ProtectedRoute] ⚠️ LOCATION MISMATCH DETECTED!', {
      routerPath: location.pathname,
      browserPath: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  }


  // Wait for both loading to complete AND initial check to complete
  if (isLoading || !initialCheckComplete) {
    console.log('[ProtectedRoute] ⏳ Showing loading state for:', location.pathname, {
      isLoading,
      initialCheckComplete,
      timestamp: new Date().toISOString(),
    });
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
        <div className="ml-3">
          <p className="text-muted-foreground">Loading...</p>
          {import.meta.env.DEV && (
            <p className="text-xs text-muted-foreground mt-1">
              Route: {location.pathname} | Loading: {isLoading.toString()} | InitialCheck: {initialCheckComplete.toString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('[ProtectedRoute] 🚪 Redirecting to login from:', location.pathname, {
      isLoading,
      initialCheckComplete,
      timestamp: new Date().toISOString(),
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('[ProtectedRoute] ✅ Allowing access to:', location.pathname, 'for user:', user.id, {
    timestamp: new Date().toISOString(),
  });

  return <>{children}</>;
};
