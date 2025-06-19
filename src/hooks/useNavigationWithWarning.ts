import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const isMounted = useRef(true);
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isNavigating: false,
    error: null,
  });

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
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
          try {
            navigate(to, options);
            // Reset navigation state after successful navigation
            if (isMounted.current) {
              setNavigationState({ isNavigating: false, error: null });
            }
          } catch (error) {
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
        try {
          navigate(to, options);
          // Reset navigation state after successful navigation
          if (isMounted.current) {
            setNavigationState({ isNavigating: false, error: null });
          }
        } catch (error) {
          if (isMounted.current) {
            setNavigationState({
              isNavigating: false,
              error: error instanceof Error ? error.message : 'Navigation failed',
            });
          }
        }
      }
    },
    [isDirty, message, navigate, confirmationDialog]
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

        // Always try React Router first with only standard options
        navigate(to, navigateOptions);

        // Reset navigation state after successful navigation
        if (isMounted.current) {
          setNavigationState({ isNavigating: false, error: null });
        }

        // Only use window.location as fallback if explicitly requested
        if (forceReload) {
          setTimeout(() => {
            window.location.href = to;
          }, 100); // Small delay to let React Router attempt first
        }
      } catch (error) {
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
    [navigate]
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
      try {
        navigate(to, options);
        // Reset navigation state after successful navigation
        if (isMounted.current) {
          setNavigationState({ isNavigating: false, error: null });
        }
      } catch (error) {
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
