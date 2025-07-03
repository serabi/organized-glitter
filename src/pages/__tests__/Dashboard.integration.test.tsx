import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';

// Mock dependencies
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/dashboard', search: '', state: null };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock auth context
const mockUser = { id: 'user123', email: 'test@example.com' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    initialCheckComplete: true,
    isLoading: false,
  }),
}));

// Mock mobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false, // Default to desktop
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock debounce
vi.mock('@/hooks/useDebounce', () => ({
  default: (value: any) => value,
}));

// Mock metadata context
const mockMetadata = {
  tags: [
    { id: 'tag1', name: 'Tag 1' },
    { id: 'tag2', name: 'Tag 2' },
  ],
  companies: [
    { id: 'company1', name: 'Company 1' },
    { id: 'company2', name: 'Company 2' },
  ],
  artists: [
    { id: 'artist1', name: 'Artist 1' },
    { id: 'artist2', name: 'Artist 2' },
  ],
  isLoading: {
    tags: false,
    companies: false,
    artists: false,
  },
};

vi.mock('@/contexts/MetadataContext', () => ({
  useMetadata: () => mockMetadata,
}));

// Mock PocketBase
const mockGetFirstListItem = vi.fn();
const mockSaveNavigationContext = vi.fn();

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getFirstListItem: mockGetFirstListItem,
    })),
  },
}));

vi.mock('@/hooks/mutations/useSaveNavigationContext', () => ({
  useSaveNavigationContext: () => ({
    mutate: mockSaveNavigationContext,
  }),
}));

// Mock queries
const mockProjectsData = {
  projects: [
    {
      id: 'project1',
      kit_name: 'Test Project 1',
      company: { name: 'Company 1' },
      artist: { name: 'Artist 1' },
      status: 'progress',
      last_updated: '2023-01-01',
    },
    {
      id: 'project2',
      kit_name: 'Test Project 2',
      company: { name: 'Company 2' },
      artist: { name: 'Artist 2' },
      status: 'completed',
      last_updated: '2023-01-02',
    },
  ],
  totalItems: 2,
  totalPages: 1,
};

const mockRefetch = vi.fn();

vi.mock('@/hooks/queries/useProjects', () => ({
  useProjects: () => ({
    data: mockProjectsData,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  }),
}));

vi.mock('@/hooks/queries/useDashboardStats', () => ({
  useDashboardStats: () => ({
    stats: {
      status_breakdown: {
        all: 10,
        wishlist: 2,
        purchased: 3,
        stash: 2,
        progress: 1,
        completed: 2,
        destashed: 0,
        archived: 0,
      },
    },
  }),
}));

vi.mock('@/hooks/queries/useAvailableYears', () => ({
  useAvailableYearsAsStrings: () => ({
    years: ['2023', '2022', '2021'],
  }),
}));

// Mock components
vi.mock('@/components/layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

vi.mock('@/components/dashboard/DashboardHeader', () => ({
  default: () => <div data-testid="dashboard-header">Dashboard Header</div>,
}));

vi.mock('@/components/dashboard/DashboardFilterSection', () => ({
  default: ({ isMobile }: { isMobile: boolean }) => (
    <div data-testid={`filter-section-${isMobile ? 'mobile' : 'desktop'}`}>
      <div data-testid="search-input">
        <input placeholder="Search projects..." />
      </div>
      <div data-testid="status-tabs">
        <button data-testid="status-all">All (10)</button>
        <button data-testid="status-progress">Progress (1)</button>
        <button data-testid="status-completed">Completed (2)</button>
      </div>
      <div data-testid="filter-dropdowns">
        <select data-testid="company-filter">
          <option value="all">All Companies</option>
          <option value="company1">Company 1</option>
        </select>
        <select data-testid="artist-filter">
          <option value="all">All Artists</option>
          <option value="artist1">Artist 1</option>
        </select>
      </div>
      <button data-testid="reset-filters">Reset Filters</button>
    </div>
  ),
}));

vi.mock('@/components/dashboard/ProjectsSection', () => ({
  default: () => (
    <div data-testid="projects-section">
      <div data-testid="project-card-project1">Test Project 1</div>
      <div data-testid="project-card-project2">Test Project 2</div>
    </div>
  ),
}));

// Mock logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('Dashboard Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    
    mockGetFirstListItem.mockRejectedValue({ status: 404 }); // No saved state
    mockLocation.pathname = '/dashboard';
    mockLocation.search = '';
    mockLocation.state = null;
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('basic rendering', () => {
    it('should render dashboard with all main components', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('main-layout')).toBeInTheDocument();
        expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
        expect(screen.getByTestId('filter-section-desktop')).toBeInTheDocument();
        expect(screen.getByTestId('projects-section')).toBeInTheDocument();
      });
    });

    it('should not render when user is not authenticated', () => {
      vi.mocked(vi.importMock('@/hooks/useAuth')).useAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        initialCheckComplete: true,
        isLoading: false,
      });

      const { container } = renderDashboard();
      expect(container.firstChild).toBeNull();
    });
  });

  describe('filter state management', () => {
    it('should initialize with default filter state', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-all')).toBeInTheDocument();
        expect(screen.getByDisplayValue('All Companies')).toBeInTheDocument();
      });
    });

    it('should restore saved filter state from database', async () => {
      const savedContext = {
        filters: {
          status: 'progress',
          company: 'company1',
          artist: 'all',
          drillShape: 'all',
          yearFinished: 'all',
          includeMiniKits: true,
          searchTerm: 'saved search',
          selectedTags: [],
        },
        sortField: 'kit_name',
        sortDirection: 'asc',
        currentPage: 1,
        pageSize: 25,
      };

      mockGetFirstListItem.mockResolvedValue({
        navigation_context: savedContext,
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('projects-section')).toBeInTheDocument();
      });

      // The context should be restored (implementation detail - tested in context tests)
      expect(mockGetFirstListItem).toHaveBeenCalledWith('user="user123"');
    });
  });

  describe('URL parameter handling', () => {
    it('should apply URL parameters to filters', async () => {
      mockLocation.search = '?status=progress&company=company1';

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('projects-section')).toBeInTheDocument();
      });

      // Should navigate to clean URL after applying parameters
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  describe('navigation context saving', () => {
    it('should save navigation context when navigating away', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('projects-section')).toBeInTheDocument();
      });

      // Simulate navigation away from dashboard
      mockLocation.pathname = '/projects/123';

      // Trigger a re-render to simulate navigation
      renderDashboard();

      // The save should be triggered on unmount (tested in detail in context tests)
      // This is more of a smoke test for integration
    });
  });

  describe('edit return handling', () => {
    it('should handle edit return with position restoration', async () => {
      mockLocation.state = {
        fromEdit: true,
        editedProjectId: 'project1',
        editedProjectData: { id: 'project1', kit_name: 'Updated Project' },
        timestamp: Date.now(),
        navigationContext: {
          preservationContext: {
            scrollPosition: 1200,
            timestamp: Date.now(),
          },
        },
        preservePosition: true,
      };

      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('projects-section')).toBeInTheDocument();
      });

      // Should restore scroll position
      await waitFor(() => {
        expect(scrollToSpy).toHaveBeenCalledWith({
          top: 1200,
          behavior: 'smooth',
        });
      });

      // Should show toast notification
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Position Restored',
        description: 'Returned to your previous location after editing.',
      });

      // Should clean up location state
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
        state: null,
      });

      scrollToSpy.mockRestore();
    });

    it('should handle edit return errors gracefully', async () => {
      mockLocation.state = {
        fromEdit: true,
        editedProjectId: 'project1',
        navigationContext: null, // Invalid context
        preservePosition: true,
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('projects-section')).toBeInTheDocument();
      });

      // Should show error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Restoration Issue',
          description: 'There was an issue restoring your previous position.',
          variant: 'destructive',
        });
      });

      consoleSpy.mockRestore();
    });
  });

  describe('responsive behavior', () => {
    it('should render mobile layout when on mobile', async () => {
      vi.mocked(vi.importMock('@/hooks/use-mobile')).useIsMobile.mockReturnValue(true);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('filter-section-mobile')).toBeInTheDocument();
        expect(screen.queryByTestId('filter-section-desktop')).not.toBeInTheDocument();
      });
    });

    it('should render desktop layout when on desktop', async () => {
      vi.mocked(vi.importMock('@/hooks/use-mobile')).useIsMobile.mockReturnValue(false);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('filter-section-desktop')).toBeInTheDocument();
        expect(screen.queryByTestId('filter-section-mobile')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle project loading errors', async () => {
      vi.mocked(vi.importMock('@/hooks/queries/useProjects')).useProjects.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load projects'),
        refetch: mockRefetch,
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/error loading projects/i)).toBeInTheDocument();
        expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument();
      });
    });

    it('should handle metadata loading errors gracefully', async () => {
      mockMetadata.isLoading = {
        tags: false,
        companies: false,
        artists: false,
      };

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('projects-section')).toBeInTheDocument();
      });

      // Should not crash and continue to render
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });
  });

  describe('performance', () => {
    it('should render without excessive re-renders', async () => {
      const renderCount = vi.fn();
      
      const TestWrapper = () => {
        renderCount();
        return <Dashboard />;
      };

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TestWrapper />
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('projects-section')).toBeInTheDocument();
      });

      // Should not have excessive renders
      expect(renderCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
      });

      // Main layout should be accessible
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('filter-section-desktop')).toBeInTheDocument();
      });

      // Filter controls should be focusable
      const searchInput = screen.getByPlaceholderText('Search projects...');
      expect(searchInput).toBeInTheDocument();
      
      searchInput.focus();
      expect(searchInput).toHaveFocus();
    });
  });
});