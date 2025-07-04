import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock all dependencies first
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}));
vi.mock('@/hooks/usePostHogPageTracking', () => ({
  usePostHogPageTracking: () => {},
}));

// Mock all auth components
vi.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/auth/RootRoute', () => ({
  RootRoute: () => <div data-testid="root-route">Root Route</div>,
}));

// Mock context providers
vi.mock('@/contexts/MetadataContext', () => ({
  MetadataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock UI components
vi.mock('@/components/ui/page-loading', () => ({
  PageLoading: () => <div data-testid="page-loading">Loading...</div>,
}));

// Mock all page components - both direct imports and lazy-loaded
vi.mock('@/pages/Login', () => ({
  default: () => <div data-testid="login">Login</div>,
}));
vi.mock('@/pages/Register', () => ({
  default: () => <div data-testid="register">Register</div>,
}));
vi.mock('@/pages/NotFound', () => ({
  default: () => <div data-testid="not-found">Not Found</div>,
}));
vi.mock('@/pages/ForgotPassword.tsx', () => ({
  default: () => <div data-testid="forgot-password">Forgot Password</div>,
}));
vi.mock('@/pages/ResetPassword.tsx', () => ({
  default: () => <div data-testid="reset-password">Reset Password</div>,
}));
vi.mock('@/pages/ConfirmPasswordReset.tsx', () => ({
  default: () => <div data-testid="confirm-password-reset">Confirm Password Reset</div>,
}));
vi.mock('@/pages/VerifyEmail', () => ({
  default: () => <div data-testid="verify-email">Verify Email</div>,
}));
vi.mock('@/pages/EmailConfirmation', () => ({
  default: () => <div data-testid="email-confirmation">Email Confirmation</div>,
}));
vi.mock('@/pages/About', () => ({
  default: () => <div data-testid="about">About</div>,
}));
vi.mock('@/pages/Privacy', () => ({
  default: () => <div data-testid="privacy">Privacy</div>,
}));
vi.mock('@/pages/Terms', () => ({
  default: () => <div data-testid="terms">Terms</div>,
}));

// Mock lazy-loaded pages
vi.mock('@/pages/ChangePassword.tsx', () => ({
  default: () => <div data-testid="change-password">Change Password</div>,
}));
vi.mock('@/pages/ChangeEmail', () => ({
  default: () => <div data-testid="change-email">Change Email</div>,
}));
vi.mock('@/pages/ConfirmEmailChange', () => ({
  default: () => <div data-testid="confirm-email-change">Confirm Email Change</div>,
}));
vi.mock('@/pages/Overview', () => ({
  default: () => <div data-testid="overview">Overview</div>,
}));
vi.mock('@/pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard">Dashboard</div>,
}));
vi.mock('@/pages/Profile', () => ({
  default: () => <div data-testid="profile">Profile</div>,
}));
vi.mock('@/pages/AdvancedView', () => ({
  default: () => <div data-testid="advanced-view">Advanced View</div>,
}));
vi.mock('@/pages/AdvancedEdit', () => ({
  default: () => <div data-testid="advanced-edit">Advanced Edit</div>,
}));
vi.mock('@/pages/NewProject', () => ({
  default: () => <div data-testid="new-project">New Project</div>,
}));
vi.mock('@/pages/ProjectDetail', () => ({
  default: () => <div data-testid="project-detail">Project Detail</div>,
}));
vi.mock('@/pages/EditProject', () => ({
  default: () => <div data-testid="edit-project">Edit Project</div>,
}));
vi.mock('@/pages/CompanyList', () => ({
  default: () => <div data-testid="company-list">Company List</div>,
}));
vi.mock('@/pages/ArtistList', () => ({
  default: () => <div data-testid="artist-list">Artist List</div>,
}));
vi.mock('@/pages/TagList', () => ({
  default: () => <div data-testid="tag-list">Tag List</div>,
}));
vi.mock('@/pages/Import', () => ({
  default: () => <div data-testid="import">Import</div>,
}));
vi.mock('@/pages/DeleteAccount', () => ({
  default: () => <div data-testid="delete-account">Delete Account</div>,
}));
vi.mock('@/pages/SupportSuccess', () => ({
  default: () => <div data-testid="support-success">Support Success</div>,
}));

// Import the component under test AFTER mocking all dependencies
import { AppRoutes } from '../AppRoutes';

// Helper to render routes within a router
const renderWithRouter = (initialEntries: string[] = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>
  );
};

describe('AppRoutes - Authenticated User Routes', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('should render dashboard route for authenticated users', async () => {
    renderWithRouter(['/dashboard']);
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('should render profile route for authenticated users', async () => {
    renderWithRouter(['/profile']);
    await waitFor(() => {
      expect(screen.getByTestId('profile')).toBeInTheDocument();
    });
  });

  it('should render RootRoute component when accessing root path', async () => {
    renderWithRouter(['/']);
    // Root route should show RootRoute component
    expect(screen.getByTestId('root-route')).toBeInTheDocument();
  });
});

describe('AppRoutes - Unauthenticated User Routes', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('should render login route for unauthenticated users', () => {
    renderWithRouter(['/login']);
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('should render register route for unauthenticated users', () => {
    renderWithRouter(['/register']);
    expect(screen.getByTestId('register')).toBeInTheDocument();
  });

  it('should render public routes', () => {
    renderWithRouter(['/about']);
    expect(screen.getByTestId('about')).toBeInTheDocument();
  });

  it('should render RootRoute component when unauthenticated user accesses root path', () => {
    renderWithRouter(['/']);
    // Unauthenticated users should see RootRoute component at root path
    expect(screen.getByTestId('root-route')).toBeInTheDocument();
  });
});

describe('AppRoutes - Error Handling', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('should handle invalid routes gracefully', () => {
    renderWithRouter(['/invalid-route']);
    expect(screen.getByTestId('not-found')).toBeInTheDocument();
  });

  it('should render NotFound for profile route with parameters', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
    });
    renderWithRouter(['/profile/123']);
    expect(screen.getByTestId('not-found')).toBeInTheDocument();
  });
});

describe('AppRoutes - Project Routes', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('should render new project route', async () => {
    renderWithRouter(['/projects/new']);
    await waitFor(() => {
      expect(screen.getByTestId('new-project')).toBeInTheDocument();
    });
  });

  it('should render project detail route', async () => {
    renderWithRouter(['/projects/123']);
    await waitFor(() => {
      expect(screen.getByTestId('project-detail')).toBeInTheDocument();
    });
  });

  it('should render edit project route', async () => {
    renderWithRouter(['/projects/123/edit']);
    await waitFor(() => {
      expect(screen.getByTestId('edit-project')).toBeInTheDocument();
    });
  });
});

describe('AppRoutes - Data Management Routes', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('should render companies route', async () => {
    renderWithRouter(['/companies']);
    await waitFor(() => {
      expect(screen.getByTestId('company-list')).toBeInTheDocument();
    });
  });

  it('should render artists route', async () => {
    renderWithRouter(['/artists']);
    await waitFor(() => {
      expect(screen.getByTestId('artist-list')).toBeInTheDocument();
    });
  });

  it('should render import route', async () => {
    renderWithRouter(['/import']);
    await waitFor(() => {
      expect(screen.getByTestId('import')).toBeInTheDocument();
    });
  });
});
