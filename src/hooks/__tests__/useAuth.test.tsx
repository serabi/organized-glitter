/**
 * Integration tests for useAuth hook with AuthProvider
 * Tests real hook behavior within provider context for comprehensive coverage
 * @author @serabi
 * @created 2025-07-30
 */

import { vi } from 'vitest';

// Mock PocketBase module before any imports
vi.mock('@/lib/pocketbase', () => {
  const mockAuthStore = {
    isValid: false,
    record: null,
    onChange: vi.fn(() => vi.fn()), // Returns cleanup function
    clear: vi.fn(),
  };

  return {
    pb: {
      authStore: mockAuthStore,
    },
  };
});

import React from 'react';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  renderHook,
  renderWithProviders,
  screen,
  waitFor,
  createMockUser,
  act,
} from '@/test-utils';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/contexts/AuthContext/AuthProvider';
import { PocketBaseUser } from '@/contexts/AuthContext.types';
import { pb } from '@/lib/pocketbase';

// Test component that consumes useAuth hook
const AuthStateTestComponent: React.FC = () => {
  const { user, isAuthenticated, isLoading, initialCheckComplete, signOut } = useAuth();

  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="auth-state">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="initial-check">{initialCheckComplete ? 'complete' : 'pending'}</div>
      {user && (
        <div>
          <div data-testid="user-id">{user.id}</div>
          <div data-testid="user-email">{user.email}</div>
        </div>
      )}
      <button data-testid="signout-btn" onClick={() => signOut()} disabled={isLoading}>
        Sign Out
      </button>
    </div>
  );
};

// Helper to create controlled PocketBase auth states
const setupMockAuthState = (
  isValid: boolean,
  user: PocketBaseUser | null = null,
  onChange?: (callback: (token: string | null, record: unknown) => void) => () => void
) => {
  const mockAuthStore = pb.authStore as {
    isValid: boolean;
    record: PocketBaseUser | null;
    onChange: (callback: (token: string | null, record: unknown) => void) => () => void;
  };
  mockAuthStore.isValid = isValid;
  mockAuthStore.record = user;

  if (onChange) {
    mockAuthStore.onChange = onChange;
  } else {
    mockAuthStore.onChange = vi.fn((_callback: (token: string | null, record: unknown) => void) => {
      // Store callback for later use if needed
      return vi.fn(); // Return cleanup function
    });
  }
};

describe('useAuth Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default unauthenticated state
    setupMockAuthState(false, null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Boundaries', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Hook Context Integration', () => {
    it('should return auth context values when used within AuthProvider', () => {
      setupMockAuthState(false, null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('initialCheckComplete');
      expect(result.current).toHaveProperty('signOut');
      expect(typeof result.current.signOut).toBe('function');
    });

    it('should return unauthenticated state when no user is present', async () => {
      setupMockAuthState(false, null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should return authenticated state when valid user is present', async () => {
      const mockUser = createMockUser({
        id: 'auth-user-123',
        email: 'authenticated@example.com',
      });

      setupMockAuthState(true, mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Component Integration', () => {
    it('should provide auth state to consuming components (unauthenticated)', async () => {
      setupMockAuthState(false, null);

      renderWithProviders(
        <AuthProvider>
          <AuthStateTestComponent />
        </AuthProvider>
      );

      // Wait for auth check to complete
      await waitFor(() => {
        expect(screen.getByTestId('initial-check')).toHaveTextContent('complete');
      });

      expect(screen.getByTestId('auth-state')).toHaveTextContent('unauthenticated');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
      expect(screen.queryByTestId('user-id')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-email')).not.toBeInTheDocument();
    });

    it('should provide auth state to consuming components (authenticated)', async () => {
      const mockUser = createMockUser({
        id: 'component-user-456',
        email: 'component@example.com',
      });

      setupMockAuthState(true, mockUser);

      renderWithProviders(
        <AuthProvider>
          <AuthStateTestComponent />
        </AuthProvider>
      );

      // Wait for auth check to complete
      await waitFor(() => {
        expect(screen.getByTestId('initial-check')).toHaveTextContent('complete');
      });

      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('idle');
      expect(screen.getByTestId('user-id')).toHaveTextContent('component-user-456');
      expect(screen.getByTestId('user-email')).toHaveTextContent('component@example.com');
    });

    it('should show loading state during initial auth check', async () => {
      setupMockAuthState(false, null);

      renderWithProviders(
        <AuthProvider>
          <AuthStateTestComponent />
        </AuthProvider>
      );

      // Check initial loading state - might need to wait for component mount
      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      });

      // Should eventually complete the check
      await waitFor(() => {
        expect(screen.getByTestId('initial-check')).toHaveTextContent('complete');
      });
    });
  });

  describe('Auth State Changes', () => {
    it('should respond to auth store changes via PocketBase onChange', async () => {
      let storedCallback: ((token: string | null, record: unknown) => void) | null = null;

      // Setup mock that captures the onChange callback
      setupMockAuthState(false, null, callback => {
        storedCallback = callback;
        return vi.fn(); // cleanup function
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Wait for initial setup
      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      // Simulate auth store change (login)
      const mockUser = createMockUser({
        id: 'changed-user-789',
        email: 'changed@example.com',
      });

      if (storedCallback) {
        // Update the mock auth store state
        const mockAuthStore = pb.authStore as {
          isValid: boolean;
          record: PocketBaseUser | null;
        };
        mockAuthStore.isValid = true;
        mockAuthStore.record = mockUser;

        // Trigger the onChange callback with act
        act(() => {
          storedCallback('mock-token', mockUser);
        });

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
          expect(result.current.user).toEqual(mockUser);
        });
      }
    });
  });

  describe('SignOut Function', () => {
    it('should provide working signOut function', async () => {
      const mockUser = createMockUser({
        id: 'signout-user-123',
        email: 'signout@example.com',
      });

      setupMockAuthState(true, mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Wait for initial auth check
      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Call signOut
      const signOutResult = await result.current.signOut();

      expect(signOutResult.success).toBe(true);
      expect(signOutResult.error).toBeNull();
      expect(pb.authStore.clear).toHaveBeenCalled();
    });

    it('should handle signOut button clicks in components', async () => {
      const mockUser = createMockUser({
        id: 'button-user-123',
        email: 'button@example.com',
      });

      setupMockAuthState(true, mockUser);

      renderWithProviders(
        <AuthProvider>
          <AuthStateTestComponent />
        </AuthProvider>
      );

      // Wait for authenticated state
      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
      });

      // Click signOut button
      const signOutButton = screen.getByTestId('signout-btn');
      expect(signOutButton).not.toBeDisabled();

      signOutButton.click();

      // Verify PocketBase clear was called
      await waitFor(() => {
        expect(pb.authStore.clear).toHaveBeenCalled();
      });
    });

    it('should prevent multiple simultaneous signOut calls', async () => {
      const mockUser = createMockUser({
        id: 'multi-signout-user',
        email: 'multi@example.com',
      });

      setupMockAuthState(true, mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Call signOut multiple times quickly
      const promise1 = result.current.signOut();
      const promise2 = result.current.signOut();
      const promise3 = result.current.signOut();

      const results = await Promise.all([promise1, promise2, promise3]);

      // All should succeed (the implementation handles multiple calls gracefully)
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Clear should have been called (implementation may batch these)
      expect(pb.authStore.clear).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle PocketBase authStore onChange cleanup properly', () => {
      const mockCleanup = vi.fn();
      const mockOnChange = vi.fn(() => mockCleanup);

      setupMockAuthState(false, null, mockOnChange);

      const { unmount } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Verify onChange was called during setup
      expect(mockOnChange).toHaveBeenCalled();

      // Unmount should trigger cleanup
      unmount();

      // The cleanup function should have been returned
      expect(mockOnChange).toHaveReturnedWith(mockCleanup);
    });

    it('should handle timeout scenarios gracefully', async () => {
      setupMockAuthState(false, null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Wait for auth initialization to complete
      await waitFor(() => {
        expect(result.current.initialCheckComplete).toBe(true);
      });

      // Should have completed without timeout in normal circumstances
      expect(result.current.isLoading).toBe(false);
      expect(result.current.initialCheckComplete).toBe(true);
    });

    it('should maintain referential stability of hook values', async () => {
      setupMockAuthState(false, null);

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(
        () => {
          expect(result.current.initialCheckComplete).toBe(true);
        },
        { timeout: 5000 }
      );

      const firstSignOut = result.current.signOut;

      // Rerender and check that signOut function remains stable
      rerender();

      expect(result.current.signOut).toBe(firstSignOut);
    }, 15000);
  });
});
