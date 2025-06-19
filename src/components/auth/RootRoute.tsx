import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Home from '@/pages/Home';

/**
 * Root route component that handles initial authentication redirect
 * Redirects authenticated users to overview, shows home page for guests
 */
export const RootRoute: React.FC = () => {
  const { user, isLoading, isAuthenticated, initialCheckComplete } = useAuth();

  // Debug logging to help diagnose loading issues
  if (import.meta.env.DEV) {
    console.log('[RootRoute] Auth state:', {
      isLoading,
      hasUser: !!user,
      isAuthenticated,
      initialCheckComplete,
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });
  }

  // IMPORTANT: Wait for both loading to complete AND initial check to complete
  if (isLoading || !initialCheckComplete) {
    if (import.meta.env.DEV) {
      console.log('[RootRoute] Still loading or initial check not complete, showing loading...', {
        isLoading,
        initialCheckComplete,
      });
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
        <p className="ml-3 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Check if user is authenticated (either user OR session is sufficient for redirect)
  if (isAuthenticated) {
    if (import.meta.env.DEV) {
      console.log('[RootRoute] User authenticated, redirecting to overview...', {
        hasUser: !!user,
        isAuthenticated,
        userId: user?.id,
      });
    }
    return <Navigate to="/overview" replace />;
  }

  if (import.meta.env.DEV) {
    console.log('[RootRoute] No authentication found, showing Home page...');
  }

  return <Home />;
};
