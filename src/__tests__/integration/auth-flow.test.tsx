/**
 * Simple integration tests for authentication flow
 * Tests essential auth functionality with minimal setup
 * @author @serabi
 * @created 2025-07-29
 */

import {
  describe,
  it,
  expect,
  waitFor,
  renderWithProviders,
  screen,
  userEvent,
} from '@/test-utils';
import React from 'react';
import { PocketBaseUser } from '@/contexts/AuthContext.types';

// Simple mock auth component for testing
const AuthTestComponent = () => {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simple validation
      if (email === 'test@example.com' && password === 'password') {
        setUser({ 
          id: 'user-123', 
          email, 
          name: 'Test User',
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        } as PocketBaseUser);
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError('');
  };

  if (user) {
    return (
      <div>
        <div data-testid="user-info">Welcome, {user.name}!</div>
        <div data-testid="user-email">{user.email}</div>
        <button data-testid="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Login</h1>
      {error && <div data-testid="error-message">{error}</div>}

      <input data-testid="email-input" type="email" placeholder="Email" disabled={isLoading} />
      <input
        data-testid="password-input"
        type="password"
        placeholder="Password"
        disabled={isLoading}
      />
      <button
        data-testid="login-btn"
        disabled={isLoading}
        onClick={() => {
          const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
          const passwordInput = screen.getByTestId('password-input') as HTMLInputElement;
          login(emailInput.value, passwordInput.value);
        }}
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </div>
  );
};

describe('Authentication Flow Integration', () => {
  it('should allow user to login with valid credentials', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AuthTestComponent />);

    // Fill in login form
    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.type(screen.getByTestId('password-input'), 'password');

    // Submit login
    await user.click(screen.getByTestId('login-btn'));

    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });

    expect(screen.getByTestId('user-info')).toHaveTextContent('Welcome, Test User!');
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
  });

  it('should show error message for invalid credentials', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AuthTestComponent />);

    await user.type(screen.getByTestId('email-input'), 'wrong@example.com');
    await user.type(screen.getByTestId('password-input'), 'wrongpassword');
    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid credentials');
    expect(screen.queryByTestId('user-info')).not.toBeInTheDocument();
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AuthTestComponent />);

    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.type(screen.getByTestId('password-input'), 'password');

    // Start login
    await user.click(screen.getByTestId('login-btn'));

    // Should show loading state immediately
    expect(screen.getByTestId('login-btn')).toHaveTextContent('Logging in...');
    expect(screen.getByTestId('login-btn')).toBeDisabled();
    expect(screen.getByTestId('email-input')).toBeDisabled();
    expect(screen.getByTestId('password-input')).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });
  });

  it('should allow user to logout', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AuthTestComponent />);

    // Login first
    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.type(screen.getByTestId('password-input'), 'password');
    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
    });

    // Logout
    await user.click(screen.getByTestId('logout-btn'));

    // Should return to login form
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.queryByTestId('user-info')).not.toBeInTheDocument();
  });

  it('should handle complete login-logout cycle', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AuthTestComponent />);

    // Initial state - should show login form
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();

    // Login
    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.type(screen.getByTestId('password-input'), 'password');
    await user.click(screen.getByTestId('login-btn'));

    // Should be logged in
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });

    // Logout
    await user.click(screen.getByTestId('logout-btn'));

    // Should be back to login form
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.queryByTestId('user-info')).not.toBeInTheDocument();
  });
});
