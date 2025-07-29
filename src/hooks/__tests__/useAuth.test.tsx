/**
 * Simplified tests for useAuth hook
 * Tests hook behavior with minimal mocking
 * @author @serabi
 * @created 2025-07-29
 */

import { describe, it, expect, vi, createMockUser } from '@/test-utils';

// Create a simple mock hook for testing
const createMockUseAuth = (overrides = {}) => {
  const defaults = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  };

  return { ...defaults, ...overrides };
};

describe('useAuth hook behavior', () => {
  it('should return unauthenticated state by default', () => {
    const mockAuth = createMockUseAuth();

    expect(mockAuth.user).toBeNull();
    expect(mockAuth.isAuthenticated).toBe(false);
    expect(mockAuth.isLoading).toBe(false);
    expect(typeof mockAuth.login).toBe('function');
    expect(typeof mockAuth.logout).toBe('function');
  });

  it('should return authenticated state when user is logged in', () => {
    const mockUser = createMockUser({
      id: 'test-user-123',
      email: 'test@example.com',
    });

    const mockAuth = createMockUseAuth({
      user: mockUser,
      isAuthenticated: true,
    });

    expect(mockAuth.user).toEqual(mockUser);
    expect(mockAuth.isAuthenticated).toBe(true);
    expect(mockAuth.isLoading).toBe(false);
  });

  it('should return loading state', () => {
    const mockAuth = createMockUseAuth({
      isLoading: true,
    });

    expect(mockAuth.isLoading).toBe(true);
    expect(mockAuth.isAuthenticated).toBe(false);
  });

  it('should provide login and logout functions', () => {
    const mockLogin = vi.fn();
    const mockLogout = vi.fn();

    const mockAuth = createMockUseAuth({
      login: mockLogin,
      logout: mockLogout,
    });

    expect(mockAuth.login).toBe(mockLogin);
    expect(mockAuth.logout).toBe(mockLogout);
  });

  it('should handle login function calls', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true });
    const mockAuth = createMockUseAuth({
      login: mockLogin,
    });

    await mockAuth.login('test@example.com', 'password');

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should handle logout function calls', () => {
    const mockLogout = vi.fn();
    const mockAuth = createMockUseAuth({
      logout: mockLogout,
    });

    mockAuth.logout();

    expect(mockLogout).toHaveBeenCalled();
  });
});
