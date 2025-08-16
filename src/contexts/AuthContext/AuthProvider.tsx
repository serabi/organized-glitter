/**
 * Authentication provider component that manages user authentication state
 * @author @serabi
 * @created 2025-01-01
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { pb } from '@/lib/pocketbase';
import { AuthContext } from './context';
import { AuthProviderProps, PocketBaseUser } from '../AuthContext.types';
import { createLogger } from '@/utils/logger';
import { queryClient } from '@/lib/queryClient';
import {
  allCompaniesOptions,
  artistsOptions,
  tagsOptions,
} from '@/hooks/queries/shared/queryOptionsFactory';

const authLogger = createLogger('AuthProvider');

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  authLogger.debug('AuthProvider component rendering/re-rendering...');
  const [user, setUser] = useState<PocketBaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const isSigningOut = useRef(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (isInitializedRef.current) {
      authLogger.debug('AuthProvider already initialized, skipping setup');
      return;
    }

    authLogger.debug(`AuthProvider useEffect running. Setting up fresh auth listeners.`);
    isInitializedRef.current = true;
    setIsLoading(true);

    // Create AbortController for proper cleanup
    const abortController = new AbortController();

    // Add timeout protection to prevent infinite loading
    // Extended timeout for production environments with slower networks
    const timeoutDuration = import.meta.env.PROD ? 30000 : 15000;
    const authTimeout = setTimeout(() => {
      authLogger.warn(`Auth initialization timed out after ${timeoutDuration / 1000} seconds`);
      authLogger.error(
        'Auth timeout - this may indicate network issues or slow PocketBase response'
      );
      if (!abortController.signal.aborted) {
        setIsLoading(false);
        setInitialCheckComplete(true);
      }
    }, timeoutDuration);

    // Initialize PocketBase auth state
    const initializeAuth = () => {
      try {
        // Check if already authenticated with PocketBase
        const isValid = pb.authStore.isValid;
        const currentUser = pb.authStore.record as unknown as PocketBaseUser | null;

        authLogger.debug('Initial auth check:', {
          isValid,
          hasUser: !!currentUser,
          userId: currentUser?.id,
        });

        if (!abortController.signal.aborted) {
          if (isValid && currentUser) {
            authLogger.debug('Setting initial user state:', currentUser.id);
            authLogger.debug('Initial auth check: User IS valid and present.', {
              id: currentUser.id,
              email: currentUser.email,
              username: currentUser.username,
            });
            setUser(currentUser);
            setIsAuthenticated(true);

            // 🔥 Fire-and-forget metadata prefetching for instant dashboard loading
            authLogger.debug('Starting metadata prefetch for user:', currentUser.id);
            queryClient.prefetchQuery(allCompaniesOptions(currentUser.id));
            queryClient.prefetchQuery(artistsOptions(currentUser.id));
            queryClient.prefetchQuery(tagsOptions(currentUser.id));
          } else {
            authLogger.debug('No valid session found');
            authLogger.debug('Initial auth check: User IS NOT valid or present.');
            setUser(null);
            setIsAuthenticated(false);
          }

          setIsLoading(false);
          setInitialCheckComplete(true);
        }

        // Set up auth store change listener - ALWAYS set this up fresh
        authLogger.debug('Setting up fresh PocketBase authStore onChange listener');
        const removeListener = pb.authStore.onChange((token, record) => {
          authLogger.debug('pb.authStore.onChange triggered.', {
            tokenExists: !!token,
            recordExists: !!record,
            recordId: record?.id,
          });
          authLogger.debug('PocketBase authStore onChange fired with:', {
            hasToken: !!token,
            hasRecord: !!record,
            userId: record?.id,
          });
          // Skip processing if we're in the middle of signing out or component is unmounted
          if (isSigningOut.current || abortController.signal.aborted) {
            authLogger.debug('Skipping auth change during signout or after unmount');
            return;
          }

          authLogger.debug('Auth state changed:', {
            hasToken: !!token,
            hasRecord: !!record,
            userId: record?.id,
          });

          if (token && record) {
            const userData = record as unknown as PocketBaseUser;
            setUser(userData);
            setIsAuthenticated(true);
            setIsLoading(false);
            setInitialCheckComplete(true);
          } else {
            authLogger.debug('Clearing user state');
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            setInitialCheckComplete(true);
          }
        });

        return removeListener;
      } catch (error) {
        authLogger.error('Error during auth initialization:', error);
        if (!abortController.signal.aborted) {
          setIsLoading(false);
          setInitialCheckComplete(true);
        }
        return () => {};
      } finally {
        clearTimeout(authTimeout);
      }
    };

    const removeListener = initializeAuth();

    // Cleanup function
    return () => {
      authLogger.debug('Cleaning up auth listeners - removing PocketBase onChange listener');
      clearTimeout(authTimeout);
      abortController.abort();
      isInitializedRef.current = false; // Reset initialization flag
      removeListener();
    };
  }, []);

  const signOut = useCallback(async () => {
    // Prevent multiple simultaneous logout attempts
    if (isSigningOut.current) {
      authLogger.debug('SignOut already in progress, skipping...');
      return { success: true, error: null };
    }

    isSigningOut.current = true;
    setIsLoading(true);

    try {
      authLogger.debug('Starting logout process...');

      // Clear local state first
      setUser(null);
      setIsAuthenticated(false);

      // Clear PocketBase auth store (this is all we need for logout)
      pb.authStore.clear();

      authLogger.debug('Logout completed successfully');
      return { success: true, error: null };
    } catch (err) {
      authLogger.error('Logout error:', err);

      // Even if something fails, ensure local state is cleared
      setUser(null);
      setIsAuthenticated(false);
      pb.authStore.clear();

      if (err instanceof Error) {
        return { success: false, error: new Error(err.message) };
      }

      return { success: false, error: new Error('An unexpected error occurred during logout') };
    } finally {
      setIsLoading(false);
      // Reset the signing out flag after a brief delay to prevent race conditions
      setTimeout(() => {
        isSigningOut.current = false;
      }, 100);
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      initialCheckComplete,
      signOut,
    }),
    [user, isAuthenticated, isLoading, initialCheckComplete, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
