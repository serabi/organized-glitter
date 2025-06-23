import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
  
  // Check if we're in development mode (Vite HMR can interfere with navigation)
  const isDevelopment = useMemo(() => {
    return import.meta.env.DEV;
  }, []);
  
  // Track navigation target and timeouts
  const navigationTarget = useRef<string | null>(null);
  const navigationTimeout = useRef<NodeJS.Timeout | null>(null);
  const verificationTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Helper functions for navigation matching
  const isValidProjectRouteTransition = useCallback((target: string, current: string): boolean => {
    if (!target || !current) return false;
    const isProjectRoute = target.startsWith('/projects/') && current.startsWith('/projects/');
    if (!isProjectRoute) return false;
    
    const targetParts = target.split('/');
    const currentParts = current.split('/');
    
    // Check if it's a valid project route transition (same project ID)
    return targetParts[2] === currentParts[2] && current === target;
  }, []);

  const isValidDynamicRouteMatch = useCallback((target: string, current: string): boolean => {
    // Pattern match for other dynamic routes (but not projects to avoid conflicts)
    if (!target || !current) return false;
    if (target.startsWith('/projects/') || current.startsWith('/projects/')) {
      return false;
    }
    
    // Only match if current contains the parent path of target
    const targetParentPath = target.split('/').slice(0, -1).join('/');
    return targetParentPath.length > 0 && current.includes(targetParentPath);
  }, []);

  const checkNavigationMatch = useCallback((target: string, current: string): boolean => {
    // Exact match is always valid
    const exactMatch = current === target;
    if (exactMatch) return true;
    
    // Check for valid project route transitions
    const projectMatch = isValidProjectRouteTransition(target, current);
    if (projectMatch) return true;
    
    // Check for valid dynamic route matches
    const dynamicMatch = isValidDynamicRouteMatch(target, current);
    return dynamicMatch;
  }, [isValidProjectRouteTransition, isValidDynamicRouteMatch]);

  // Cleanup function to clear all pending timeouts
  const clearAllNavigationTimeouts = useCallback(() => {
    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
      navigationTimeout.current = null;
    }
    verificationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    verificationTimeouts.current = [];
  }, []);

  // Reset navigation state and cleanup
  const resetNavigationState = useCallback(() => {
    if (isMounted.current) {
      setNavigationState({ isNavigating: false, error: null });
    }
    navigationTarget.current = null;
    clearAllNavigationTimeouts();
  }, [clearAllNavigationTimeouts]);

  // Consolidated navigation verification with sequential checks
  const startNavigationVerification = useCallback((targetPath: string) => {
    // Clear any existing verification timeouts
    verificationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    verificationTimeouts.current = [];

    // First check: Basic navigation completion (100ms)
    const firstCheck = setTimeout(() => {
      if (!isMounted.current || navigationTarget.current !== targetPath) return;

      if (isDevelopment) {
        console.log('[Navigation] Post-navigation check - Current location:', window.location.pathname);
        console.log('[Navigation] Post-navigation check - Target was:', targetPath);
        console.log('[Navigation] Post-navigation check - Match?', window.location.pathname === targetPath);
      }
      
      // If location hasn't changed after 100ms, navigation might have failed silently
      if (window.location.pathname !== targetPath) {
        if (isDevelopment) {
          console.warn('[Navigation] ⚠️ React Router navigation may have failed - location unchanged after 100ms');
          console.log('[Navigation] Attempting fallback navigation with window.location...');
        }
        
        // Fallback to window.location
        try {
          window.location.href = targetPath;
        } catch (fallbackError) {
          console.error('[Navigation] Fallback navigation also failed:', fallbackError);
          if (isMounted.current) {
            setNavigationState({
              isNavigating: false,
              error: 'Navigation failed - please try again or refresh the page',
            });
          }
        }
      }
    }, 100);

    // Second check: Render verification (500ms)
    const secondCheck = setTimeout(() => {
      if (!isMounted.current || navigationTarget.current !== targetPath) return;

      if (isDevelopment) {
        console.log('[Navigation] Render verification check - Current location:', window.location.pathname);
        console.log('[Navigation] Render verification check - Target was:', targetPath);
      }
      
      if (window.location.pathname === targetPath && navigationTarget.current === targetPath) {
        if (isDevelopment) {
          console.log('[Navigation] ✅ Navigation and render verification passed');
        }
        // Double-check that navigation state was properly reset
        if (isMounted.current && navigationTarget.current === targetPath) {
          if (isDevelopment) {
            console.log('[Navigation] Force-clearing navigation state after render verification');
          }
          resetNavigationState();
        }
      } else if (window.location.pathname !== targetPath) {
        if (isDevelopment) {
          console.warn('[Navigation] ⚠️ Render verification failed - attempting hard navigation fallback');
        }
        try {
          window.location.href = targetPath;
        } catch (fallbackError) {
          console.error('[Navigation] Hard navigation fallback failed:', fallbackError);
        }
      }
    }, 500);

    // Store timeouts for cleanup
    verificationTimeouts.current = [firstCheck, secondCheck];
  }, [isDevelopment, resetNavigationState]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Clear all navigation timeouts on unmount
      clearAllNavigationTimeouts();
    };
  }, [clearAllNavigationTimeouts]);

  // Listen for location changes to reset navigation state
  useEffect(() => {
    // Use actual browser location instead of React Router location for better accuracy
    const actualLocation = window.location.pathname;
    const reactRouterLocation = location.pathname;
    
    if (isDevelopment) {
      console.log('[Navigation] Location change detected');
      console.log('[Navigation] React Router location:', reactRouterLocation);
      console.log('[Navigation] Actual browser location:', actualLocation);
      console.log('[Navigation] Locations match:', reactRouterLocation === actualLocation);
      console.log('[Navigation] Current navigation target:', navigationTarget.current);
      console.log('[Navigation] Navigation state:', navigationState);
      console.log('[Navigation] Current timeout:', navigationTimeout.current ? 'Active' : 'None');
    }
    
    if (navigationTarget.current) {
      // Use actual browser location for navigation completion detection
      // This fixes the issue where React Router location.pathname can be stale
      const targetMatches = checkNavigationMatch(navigationTarget.current, actualLocation);
      
      if (isDevelopment) {
        console.log('[Navigation] Route matching analysis:', { 
          target: navigationTarget.current, 
          current: actualLocation,
          reactRouterCurrent: reactRouterLocation,
          targetParts: navigationTarget.current.split('/'),
          currentParts: actualLocation.split('/'),
          matches: targetMatches
        });
      }
      
      if (targetMatches) {
        if (isDevelopment) {
          console.log('[Navigation] ✅ Target matches! Resetting navigation state');
          console.log('[Navigation] Clearing timeout and resetting state');
        }
        // Navigation completed successfully
        resetNavigationState();
      } else {
        if (isDevelopment) {
          console.log('[Navigation] ❌ No target match, keeping navigation state');
          console.log('[Navigation] Will timeout in:', navigationTimeout.current ? 'some time' : 'no timeout set');
        }
      }
    } else {
      if (isDevelopment) {
        console.log('[Navigation] No navigation target set, ignoring location change');
      }
    }
  }, [location.pathname, navigationState, isDevelopment, checkNavigationMatch, resetNavigationState]);

  // Helper function to start navigation timeout
  const startNavigationTimeout = useCallback((targetPath: string) => {
    navigationTarget.current = targetPath;
    
    // Clear any existing timeout
    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
    }
    
    if (isDevelopment) {
      console.log('[Navigation] Setting timeout for navigation to:', targetPath);
    }
    
    // Set timeout to reset navigation state if it takes too long (fallback)
    navigationTimeout.current = setTimeout(() => {
      if (isDevelopment) {
        console.log('[Navigation] Navigation timeout reached for:', targetPath);
        console.log('[Navigation] Current location:', window.location.pathname);
      }
      
      if (isMounted.current) {
        // Check one more time if we actually reached the target
        const actuallyAtTarget = window.location.pathname === targetPath;
        if (actuallyAtTarget) {
          if (isDevelopment) {
            console.log('[Navigation] Actually at target, resetting navigation state (timeout fallback)');
          }
          setNavigationState({ isNavigating: false, error: null });
        } else {
          if (isDevelopment) {
            console.log('[Navigation] Navigation timeout - still not at target, setting error state');
          }
          setNavigationState({ 
            isNavigating: false, 
            error: `Navigation to ${targetPath} timed out. Current location: ${window.location.pathname}` 
          });
        }
      }
      navigationTarget.current = null;
      navigationTimeout.current = null;
    }, 5000); // 5 second timeout
  }, [isDevelopment, resetNavigationState]);
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

  // Smart navigation that avoids full page reload when possible
  const smartNavigate = useCallback(
    (to: string, options?: { replace?: boolean; forceReload?: boolean; forceHardNavInDev?: boolean }) => {
      setNavigationState({ isNavigating: true, error: null });

      try {
        // Destructure to separate standard React Router options from custom ones
        const { forceReload, forceHardNavInDev, ...navigateOptions } = options || {};

        // In development, Vite HMR can interfere with React Router navigation
        // Force hard navigation for critical flows to avoid HMR conflicts
        const shouldUseHardNav = forceReload || (isDevelopment && forceHardNavInDev);

        if (shouldUseHardNav) {
          if (isDevelopment) {
            console.log('[Navigation] Using hard navigation due to:', {
              forceReload,
              forceHardNavInDev,
              isDevelopment,
              reason: forceReload ? 'forceReload requested' : 'HMR interference prevention'
            });
          }
          
          // For hard navigation, don't track with timeout since we're doing a hard refresh
          setTimeout(() => {
            window.location.href = to;
          }, 100); // Small delay to let React Router attempt first
        } else {
          if (isDevelopment) {
            console.log('[Navigation] Using SPA navigation in production mode');
          }
          // Track navigation for SPA navigation
          startNavigationTimeout(to);
          // Always try React Router first with only standard options
          navigate(to, navigateOptions);
          // Note: Navigation state will be reset when location changes or timeout occurs
        }
      } catch (error) {
        // Clear navigation tracking on immediate error
        clearAllNavigationTimeouts();
        navigationTarget.current = null;
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
    [navigate, startNavigationTimeout, isDevelopment, clearAllNavigationTimeouts]
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
    unsafeNavigate: (to: string, options?: { replace?: boolean; forceHardNavInDev?: boolean }) => {
      if (isDevelopment) {
        console.log('[Navigation] unsafeNavigate called with:', to, options);
        console.log('[Navigation] navigate function:', navigate);
        console.log('[Navigation] Current location:', location.pathname);
        console.log('[Navigation] Development mode:', isDevelopment);
      }
      
      // In development mode, force hard navigation for critical project flows to avoid HMR conflicts
      const shouldForceHardNav = isDevelopment && (options?.forceHardNavInDev ?? false);
      
      if (shouldForceHardNav) {
        if (isDevelopment) {
          console.log('[Navigation] 🔄 Forcing hard navigation in development to avoid HMR conflicts');
          console.log('[Navigation] Redirecting to:', to);
        }
        
        // Use immediate hard navigation to bypass HMR interference
        window.location.href = to;
        return;
      }
      
      setNavigationState({ isNavigating: true, error: null });
      if (isDevelopment) {
        console.log('[Navigation] Navigation state set to isNavigating: true');
      }
      
      startNavigationTimeout(to);
      if (isDevelopment) {
        console.log('[Navigation] Navigation timeout started for:', to);
      }
      
      try {
        if (isDevelopment) {
          console.log('[Navigation] Calling React Router navigate...');
        }
        
        // Check if navigate function is available and active
        if (typeof navigate !== 'function') {
          throw new Error('Navigate function is not available');
        }
        
        // Track navigation success/failure more explicitly
        const startTime = Date.now();
        
        navigate(to, options);
        
        const endTime = Date.now();
        if (isDevelopment) {
          console.log('[Navigation] React Router navigate call completed in', endTime - startTime, 'ms');
        }
        
        // Start consolidated navigation verification
        startNavigationVerification(to);
        
        // Note: Navigation state will be reset when location changes or timeout occurs
      } catch (error) {
        console.error('[Navigation] Navigation error:', error);
        // Clear navigation tracking on immediate error
        clearAllNavigationTimeouts();
        navigationTarget.current = null;
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
