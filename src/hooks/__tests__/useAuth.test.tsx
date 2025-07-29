/**
 * Example hook test using simplified utilities
 * Demonstrates testing custom hooks with minimal setup
 */

import React, { act } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, createMockUser, createMockPocketBase } from '@/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useAuth hook for this example
const mockUseAuth = () => {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate login
      const mockUser = createMockUser({ email });
      setUser(mockUser);
      return { success: true, user: mockUser };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
};

describe('useAuth', () => {
  it('starts with no authenticated user', () => {
    const { result } = renderHook(() => mockUseAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles login successfully', async () => {
    const { result } = renderHook(() => mockUseAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@example.com');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles logout', async () => {
    const { result } = renderHook(() => mockUseAuth());

    // Login first
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Then logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});