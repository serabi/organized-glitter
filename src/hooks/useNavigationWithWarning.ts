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
  
  // Track navigation target and timeout
  const navigationTarget = useRef<string | null>(null);
  const navigationTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Clear navigation timeout on unmount
      if (navigationTimeout.current) {
        clearTimeout(navigationTimeout.current);
      }
    };
  }, []);

  // Listen for location changes to reset navigation state
  useEffect(() => {
    if (navigationTarget.current) {
      // Check if navigation completed successfully
      // Handle both exact matches and pattern matches for dynamic routes
      const targetMatches = 
        location.pathname === navigationTarget.current ||
        // Handle dynamic routes like /projects/[id] - if target starts with /projects/ and current does too
        (navigationTarget.current.startsWith('/projects/') && location.pathname.startsWith('/projects/')) ||
        // Handle other dynamic route patterns as needed
        location.pathname.includes(navigationTarget.current.split('/').slice(0, -1).join('/'));
      
      if (targetMatches) {
        // Navigation completed successfully
        if (isMounted.current) {
          setNavigationState({ isNavigating: false, error: null });
        }
        navigationTarget.current = null;
        if (navigationTimeout.current) {
          clearTimeout(navigationTimeout.current);
          navigationTimeout.current = null;
        }
      }
    }
  }, [location.pathname]);

  // Helper function to start navigation timeout
  const startNavigationTimeout = useCallback((targetPath: string) => {
    navigationTarget.current = targetPath;
    
    // Clear any existing timeout
    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
    }
    
    // Set timeout to reset navigation state if it takes too long (fallback)
    navigationTimeout.current = setTimeout(() => {
      if (isMounted.current) {
        setNavigationState({ isNavigating: false, error: null });
      }
      navigationTarget.current = null;
      navigationTimeout.current = null;
    }, 5000); // 5 second timeout
  }, []);
  // Safe navigation function that checks for unsaved changes
  const navigateWithWarning = useCallback(
    async (to: string, options?: { replace?: boolean }) => {
      if (isDirty) {
        let confirmed = false;

        if (confirmationDialog) {
          // Use ConfirmationDialog for consistent UX
          confirmed = await confirmationDialog.confirmUnsavedChanges('navigate');
        } else {
          // Fallback to window.confirm if no dialog provided
          confirmed = window.confirm(message);
        }

        if (confirmed) {
          setNavigationState({ isNavigating: true, error: null });
          startNavigationTimeout(to);
          try {
            navigate(to, options);
            // Note: Navigation state will be reset when location changes or timeout occurs
          } catch (error) {
            // Clear navigation tracking on immediate error
            navigationTarget.current = null;
            if (navigationTimeout.current) {
              clearTimeout(navigationTimeout.current);
              navigationTimeout.current = null;
            }
            if (isMounted.current) {
              setNavigationState({
                isNavigating: false,
                error: error instanceof Error ? error.message : 'Navigation failed',
              });
            }
          }
        }
      } else {
        setNavigationState({ isNavigating: true, error: null });
        startNavigationTimeout(to);
        try {
          navigate(to, options);
          // Note: Navigation state will be reset when location changes or timeout occurs
        } catch (error) {
          // Clear navigation tracking on immediate error
          navigationTarget.current = null;
          if (navigationTimeout.current) {
            clearTimeout(navigationTimeout.current);
            navigationTimeout.current = null;
          }
          if (isMounted.current) {
            setNavigationState({
              isNavigating: false,
              error: error instanceof Error ? error.message : 'Navigation failed',
            });
          }
        }
      }
    },
    [isDirty, message, navigate, confirmationDialog, startNavigationTimeout]
  );

  // Store reference to the beforeunload handler for proper cleanup
  const beforeUnloadHandlerRef = useRef<((e: BeforeUnloadEvent) => string | void) | null>(null);

  // Handle browser back/forward and refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
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

  // Smart navigation that avoids full page reload when possible
  const smartNavigate = useCallback(
    (to: string, options?: { replace?: boolean; forceReload?: boolean }) => {
      setNavigationState({ isNavigating: true, error: null });

      try {
        // Destructure to separate standard React Router options from custom ones
        const { forceReload, ...navigateOptions } = options || {};

        if (forceReload) {
          // For force reload, don't track with timeout since we're doing a hard refresh
          setTimeout(() => {
            window.location.href = to;
          }, 100); // Small delay to let React Router attempt first
        } else {
          // Track navigation for SPA navigation
          startNavigationTimeout(to);
          // Always try React Router first with only standard options
          navigate(to, navigateOptions);
          // Note: Navigation state will be reset when location changes or timeout occurs
        }
      } catch (error) {
        // Clear navigation tracking on immediate error
        navigationTarget.current = null;
        if (navigationTimeout.current) {
          clearTimeout(navigationTimeout.current);
          navigationTimeout.current = null;
        }
        if (isMounted.current) {
          setNavigationState({
            isNavigating: false,
            error: error instanceof Error ? error.message : 'Navigation failed',
          });
        }

        // Fallback to window.location on error
        window.location.href = to;
      }
    },
    [navigate, startNavigationTimeout]
  );

  // Force navigation bypasses unsaved changes warning
  const forceNavigate = useCallback(
    (to: string, options?: { replace?: boolean; smartNavigation?: boolean }) => {
      // Remove beforeunload listener to prevent navigation confirmation
      removeBeforeUnloadListener();

      if (options?.smartNavigation !== false) {
        // Destructure to separate custom smartNavigation from standard options
        const { smartNavigation, ...smartNavigateOptions } = options || {};

        // Use smart navigation by default (avoids unnecessary reloads)
        smartNavigate(to, smartNavigateOptions);
      } else {
        // Legacy behavior - immediate window.location redirect
        window.location.href = to;
      }
    },
    [smartNavigate, removeBeforeUnloadListener]
  );

  return {
    navigateWithWarning,
    navigate: navigateWithWarning, // Alias for convenience
    unsafeNavigate: (to: string, options?: { replace?: boolean }) => {
      setNavigationState({ isNavigating: true, error: null });
      startNavigationTimeout(to);
      try {
        navigate(to, options);
        // Note: Navigation state will be reset when location changes or timeout occurs
      } catch (error) {
        // Clear navigation tracking on immediate error
        navigationTarget.current = null;
        if (navigationTimeout.current) {
          clearTimeout(navigationTimeout.current);
          navigationTimeout.current = null;
        }
        if (isMounted.current) {
          setNavigationState({
            isNavigating: false,
            error: error instanceof Error ? error.message : 'Navigation failed',
          });
        }
      }
    }, // Original navigate for internal use
    forceNavigate,
    smartNavigate,
    navigationState,
    removeBeforeUnloadListener,
    clearNavigationError: () => {
      if (isMounted.current) {
        setNavigationState(prev => ({ ...prev, error: null }));
      }
    },
  };
};
