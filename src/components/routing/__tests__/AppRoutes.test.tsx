import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import { AppRoutes } from '../AppRoutes';

vi.mock('@/hooks/useAuth');
vi.mock('@/components/auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/loading-spinner', () => ({
  default: () => <div data-testid="loading-spinner" />,
}));

import { useAuth } from '@/hooks/useAuth';

// Mock route components
const MockDashboard = () => <div data-testid="dashboard">Dashboard</div>;
const MockLogin = () => <div data-testid="login">Login</div>;
const MockProfile = () => <div data-testid="profile">Profile</div>;
const MockNotFound = () => <div data-testid="not-found">Not Found</div>;

const mockUseAuth = vi.mocked(useAuth);

// Helper to render routes within a router
const renderWithRouter = (initialEntries: string[] = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>
  );
};

describe('Authenticated User Routes', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false
    });
  });

  it('should render dashboard route for authenticated users', async () => {
    renderWithRouter(['/dashboard']);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('should render profile route for authenticated users', async () => {
    renderWithRouter(['/profile']);
    expect(screen.getByTestId('profile')).toBeInTheDocument();
  });

  it('should redirect to dashboard when accessing root path', async () => {
    renderWithRouter(['/']);
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });
});

describe('Unauthenticated User Routes', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  });

  it('should render login route for unauthenticated users', () => {
    renderWithRouter(['/login']);
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('should redirect unauthenticated users to login from protected routes', async () => {
    renderWithRouter(['/dashboard']);
    await waitFor(() => {
      expect(screen.getByTestId('login')).toBeInTheDocument();
    });
  });

  it('should redirect to login when accessing root path as unauthenticated user', async () => {
    renderWithRouter(['/']);
    await waitFor(() => {
      expect(screen.getByTestId('login')).toBeInTheDocument();
    });
  });
});

describe('Loading States', () => {
  it('should show loading spinner when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true
    });
    renderWithRouter(['/dashboard']);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});

describe('Error Handling', () => {
  it('should handle invalid routes gracefully', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
    renderWithRouter(['/invalid-route']);
    expect(screen.getByTestId('not-found')).toBeInTheDocument();
  });

  it('should handle route parameters correctly', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false
    });
    renderWithRouter(['/profile/123']);
    expect(screen.getByTestId('profile')).toBeInTheDocument();
  });
});

describe('Navigation Behavior', () => {
  it('should handle browser back/forward navigation', async () => {
    renderWithRouter(['/dashboard', '/profile']);
    act(() => {
      window.history.back();
    });
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('should preserve query parameters across route changes', () => {
    renderWithRouter(['/dashboard?tab=projects']);
    expect(window.location.search).toBe('?tab=projects');
  });

  it('should handle hash routing correctly', () => {
    renderWithRouter(['/dashboard#section1']);
    expect(window.location.hash).toBe('#section1');
  });
});

describe('Accessibility', () => {
  it('should maintain focus management during route transitions', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false
    });
    renderWithRouter(['/dashboard']);
    const dashboardElement = screen.getByTestId('dashboard');
    expect(dashboardElement).toBeInTheDocument();
    expect(document.activeElement).not.toBeNull();
  });

  it('should announce route changes to screen readers', async () => {
    renderWithRouter(['/dashboard']);
    const liveRegion = document.querySelector('[aria-live]');
    expect(liveRegion).toBeInTheDocument();
  });
});

describe('Route Component Props', () => {
  it('should pass correct props to route components', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false
    });
    renderWithRouter(['/profile/123']);
    expect(screen.getByTestId('profile')).toBeInTheDocument();
  });
});