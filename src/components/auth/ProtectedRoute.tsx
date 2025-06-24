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

  // Debug logging for route protection decisions
  if (import.meta.env.DEV) {
    console.log('[ProtectedRoute] Route protection check:', {
      pathname: location.pathname,
      isLoading,
      initialCheckComplete,
      hasUser: !!user,
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });
  }


  // Wait for both loading to complete AND initial check to complete
  if (isLoading || !initialCheckComplete) {
    if (import.meta.env.DEV) {
      console.log('[ProtectedRoute] ⏳ Showing loading state for:', location.pathname);
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
        <p className="ml-3 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    if (import.meta.env.DEV) {
      console.log('[ProtectedRoute] 🚪 Redirecting to login from:', location.pathname);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (import.meta.env.DEV) {
    console.log('[ProtectedRoute] ✅ Allowing access to:', location.pathname, 'for user:', user.id);
  }

  return <>{children}</>;
};
