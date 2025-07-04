import React, { ComponentType, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import DashboardLoadingState from '@/components/dashboard/DashboardLoadingState';
import { PocketBaseUser } from '@/contexts/AuthContext.types';

const withAuthentication = <P extends object>(
  WrappedComponent: ComponentType<P & { user: PocketBaseUser | null }> // Ensure WrappedComponent expects user prop
): React.FC<P> => {
  // The external props for the HOC-wrapped component should not include `user`
  const AuthenticatedComponent: React.FC<P> = props => {
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    logger.log('🔐 withAuthentication: Auth state:', {
      hasUser: !!user,
      userId: user?.id,
      authLoading,
      componentName: WrappedComponent.displayName || WrappedComponent.name,
    });

    useEffect(() => {
      if (!authLoading && !user) {
        logger.log('withAuthentication: No authenticated user found, redirecting to login');
        toast({
          title: 'Authentication required',
          description: 'Please sign in to continue.',
          variant: 'destructive',
        });
        navigate('/login');
      }
    }, [user, authLoading, navigate, toast]);

    if (authLoading) {
      logger.log('withAuthentication: Showing loading state while checking authentication');
      return <DashboardLoadingState />; // Or a more generic loading component
    }

    if (!user && !authLoading) {
      logger.log(
        'withAuthentication: No authenticated user after auth check complete, navigation initiated.'
      );
      // Navigation is handled by the useEffect, so return null to prevent rendering the wrapped component.
      return null;
    }

    // If authenticated, render the wrapped component with its props and the user object
    return <WrappedComponent {...(props as P)} user={user} />;
  };

  // Set a display name for easier debugging
  AuthenticatedComponent.displayName = `WithAuthentication(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AuthenticatedComponent;
};

export default withAuthentication;
