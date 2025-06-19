import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { MemoryRouter, Routes, Route, NavigateProps } from 'react-router-dom';

// Mocks
vi.mock('@/hooks/useAuth');
vi.mock('@/components/ui/loading-spinner', () => ({
  LoadingSpinner: ({ className }: { className: string }) => (
    <div data-testid="loading-spinner" className={className}>
      Loading...
    </div>
  ),
}));

// Mock Navigate specifically to check its props
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: (props: NavigateProps) => {
      mockNavigate(props);
      return <div data-testid="navigate-mock">Navigating...</div>;
    },
    useLocation: () => ({
      pathname: '/protected',
      search: '',
      hash: '',
      state: null,
      key: 'testKey',
    }),
  };
});

const mockUseAuth = useAuth as Mock;

describe('ProtectedRoute component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TestChildComponent = () => <div data-testid="child-component">Protected Content</div>;

  it('should render loading spinner when isLoading is true', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true, initialCheckComplete: false });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <TestChildComponent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('child-component')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should render loading spinner when initialCheckComplete is false', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, initialCheckComplete: false });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <TestChildComponent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('child-component')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should redirect to /login if user is not authenticated and not loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, initialCheckComplete: true });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <TestChildComponent />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('child-component')).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/login',
      state: {
        from: { pathname: '/protected', search: '', hash: '', state: null, key: 'testKey' },
      },
      replace: true,
    });
    // Check that the Navigate mock component is rendered
    expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
  });

  it('should render children if user is authenticated and not loading', () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    mockUseAuth.mockReturnValue({ user: mockUser, isLoading: false, initialCheckComplete: true });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <TestChildComponent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    expect(screen.getByTestId('child-component')).toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
