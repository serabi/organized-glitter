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

  // Reduce logging frequency - only log state changes, not every render
  const prevStateRef = React.useRef<string>('');

  if (import.meta.env.DEV) {
    const currentState = `loading:${isLoading},complete:${initialCheckComplete},user:${!!user}`;
    if (currentState !== prevStateRef.current) {
      console.log('[ProtectedRoute] Auth state changed:', {
        isLoading,
        initialCheckComplete,
        hasUser: !!user,
        userId: user?.id,
      });
      prevStateRef.current = currentState;
    }
  }

  // Wait for both loading to complete AND initial check to complete
  if (isLoading || !initialCheckComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
        <p className="ml-3 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
