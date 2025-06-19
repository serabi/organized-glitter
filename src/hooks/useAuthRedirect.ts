import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Created 2025-05-26 while refactoring Overview.tsx
 * Custom hook to handle authentication redirect logic
 * Redirects to login if user is not authenticated after loading completes
 */
export function useAuthRedirect() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Handle authentication redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  return {
    user,
    authLoading,
    isAuthenticated: !!user,
    isLoading: authLoading,
  };
}
