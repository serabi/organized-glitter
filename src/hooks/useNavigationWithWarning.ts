import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UseNavigationWithWarningProps {
  isDirty: boolean;
  message?: string;
  confirmationDialog?: {
    confirmUnsavedChanges: (action?: string) => Promise<boolean>;
  };
}

interface NavigationState {
  isNavigating: boolean;
  error: string | null;
}

/**
 * Hook to handle navigation with unsaved changes warning
 * Prevents navigation if there are unsaved changes and shows confirmation
 * Now supports both window.confirm and ConfirmationDialog patterns
 */
export const useNavigationWithWarning = ({
  isDirty,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  confirmationDialog,
}: UseNavigationWithWarningProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMounted = useRef(true);
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isNavigating: false,
    error: null,
  });

  // Simplified navigation tracking
  const isNavigating = useRef<boolean>(false);

  // Reset navigation state
  const resetNavigationState = useCallback(() => {
    if (isMounted.current) {
      setNavigationState({ isNavigating: false, error: null });
      isNavigating.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Listen for location changes to reset navigation state
  useEffect(() => {
    if (isNavigating.current) {
      resetNavigationState();
    }
  }, [location.pathname, resetNavigationState]);

  // Simple navigation with error handling
  const performNavigation = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      try {
        setNavigationState({ isNavigating: true, error: null });
        isNavigating.current = true;
        navigate(to, options);
      } catch (error) {
        if (isMounted.current) {
          setNavigationState({
            isNavigating: false,
            error: error instanceof Error ? error.message : 'Navigation failed',
          });
          isNavigating.current = false;
        }
      }
    },
    [navigate]
  );
  // Safe navigation function that checks for unsaved changes
  const navigateWithWarning = useCallback(
    async (to: string, options?: { replace?: boolean }) => {
      if (isDirty) {
        let confirmed = false;

        try {
          if (confirmationDialog) {
            // Use ConfirmationDialog for consistent UX
            confirmed = await confirmationDialog.confirmUnsavedChanges('navigate');
          } else {
            // Fallback to window.confirm if no dialog provided
            confirmed = window.confirm(message);
          }

          if (confirmed) {
            performNavigation(to, options);
          }
        } catch (error) {
          if (isMounted.current) {
            setNavigationState({
              isNavigating: false,
              error: error instanceof Error ? error.message : 'Confirmation failed',
            });
          }
        }
      } else {
        performNavigation(to, options);
      }
    },
    [isDirty, message, confirmationDialog, performNavigation]
  );

  // Store reference to the beforeunload handler for proper cleanup
  const beforeUnloadHandlerRef = useRef<((e: BeforeUnloadEvent) => string | void) | null>(null);

  // Handle browser back/forward and refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Modern browsers ignore the returnValue, but setting it is still required for compatibility
        e.returnValue = '';
        return message;
      }
    };

    // Store reference for manual removal
    beforeUnloadHandlerRef.current = handleBeforeUnload;

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      beforeUnloadHandlerRef.current = null;
    };
  }, [isDirty, message]);

  // Function to manually remove beforeunload listener for safe navigation
  const removeBeforeUnloadListener = useCallback(() => {
    if (beforeUnloadHandlerRef.current) {
      window.removeEventListener('beforeunload', beforeUnloadHandlerRef.current);
      beforeUnloadHandlerRef.current = null;
    }
  }, []);

  // Simple direct navigation without warnings
  const directNavigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      performNavigation(to, options);
    },
    [performNavigation]
  );

  // Force navigation bypasses unsaved changes warning
  const forceNavigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      // Remove beforeunload listener to prevent navigation confirmation
      removeBeforeUnloadListener();
      performNavigation(to, options);
    },
    [performNavigation, removeBeforeUnloadListener]
  );

  return {
    navigateWithWarning,
    navigate: navigateWithWarning, // Alias for convenience
    unsafeNavigate: directNavigate, // Simple direct navigation without warnings
    forceNavigate,
    navigationState,
    removeBeforeUnloadListener,
    clearNavigationError: () => {
      if (isMounted.current) {
        setNavigationState(prev => ({ ...prev, error: null }));
      }
    },
  };
};
