import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../useAuth';
import { AuthContext } from '@/contexts/AuthContext/context';
import { PocketBaseUser } from '@/contexts/AuthContext.types';

// Create mock context value
const createMockContextValue = (overrides = {}) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  initialCheckComplete: true,
  signOut: vi.fn().mockResolvedValue({ success: true, error: null }),
  ...overrides,
});

const renderWithAuthContext = (contextValue: ReturnType<typeof createMockContextValue>) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
  return renderHook(() => useAuth(), { wrapper });
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial unauthenticated state', () => {
    const mockContextValue = createMockContextValue();
    const { result } = renderWithAuthContext(mockContextValue);

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.initialCheckComplete).toBe(true);
  });

  it('should return authenticated state when user is logged in', () => {
    const mockUser: PocketBaseUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    };

    const mockContextValue = createMockContextValue({
      user: mockUser,
      isAuthenticated: true,
    });

    const { result } = renderWithAuthContext(mockContextValue);

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should return loading state when auth is loading', () => {
    const mockContextValue = createMockContextValue({
      isLoading: true,
      initialCheckComplete: false,
    });

    const { result } = renderWithAuthContext(mockContextValue);

    expect(result.current.isLoading).toBe(true);
    expect(result.current.initialCheckComplete).toBe(false);
  });

  it('should provide signOut function', () => {
    const mockSignOut = vi.fn().mockResolvedValue({ success: true, error: null });
    const mockContextValue = createMockContextValue({
      signOut: mockSignOut,
    });

    const { result } = renderWithAuthContext(mockContextValue);

    expect(result.current.signOut).toBe(mockSignOut);
  });

  it('should handle user with optional fields', () => {
    const mockUser: PocketBaseUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      avatar: 'avatar.jpg',
      beta_tester: true,
      verified: true,
      created: '2025-01-01T00:00:00Z',
      updated: '2025-01-01T00:00:00Z',
    };

    const mockContextValue = createMockContextValue({
      user: mockUser,
      isAuthenticated: true,
    });

    const { result } = renderWithAuthContext(mockContextValue);

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.user?.avatar).toBe('avatar.jpg');
    expect(result.current.user?.beta_tester).toBe(true);
    expect(result.current.user?.verified).toBe(true);
  });

  it('should handle signOut properly', async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ success: true, error: null });
    const mockContextValue = createMockContextValue({
      signOut: mockSignOut,
      user: { id: 'user123', email: 'test@example.com' } as PocketBaseUser,
      isAuthenticated: true,
    });

    const { result } = renderWithAuthContext(mockContextValue);

    const signOutResult = await result.current.signOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(signOutResult.success).toBe(true);
    expect(signOutResult.error).toBe(null);
  });

  it('should handle signOut error', async () => {
    const mockError = new Error('Logout failed');
    const mockSignOut = vi.fn().mockResolvedValue({ success: false, error: mockError });
    const mockContextValue = createMockContextValue({
      signOut: mockSignOut,
    });

    const { result } = renderWithAuthContext(mockContextValue);

    const signOutResult = await result.current.signOut();

    expect(signOutResult.success).toBe(false);
    expect(signOutResult.error).toBe(mockError);
  });
});
