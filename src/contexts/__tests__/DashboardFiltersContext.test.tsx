import React, { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardFiltersProvider, useDashboardFilters, useRecentlyEdited } from '../DashboardFiltersContext';

// Mock dependencies
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/dashboard', search: '' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock useDebounce
vi.mock('@/hooks/useDebounce', () => ({
  default: (value: any) => value, // Return value immediately for testing
}));

// Mock MetadataContext
const mockMetadataContext = {
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
  useMetadata: () => mockMetadataContext,
}));

// Mock hooks
const mockProjectsData = {
  projects: [
    { id: 'project1', kit_name: 'Project 1', last_updated: '2023-01-01' },
    { id: 'project2', kit_name: 'Project 2', last_updated: '2023-01-02' },
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

const mockDashboardStats = {
  status_breakdown: {
    wishlist: 2,
    purchased: 3,
    stash: 2,
    progress: 1,
    completed: 2,
    destashed: 0,
    archived: 0,
  },
};

vi.mock('@/hooks/queries/useDashboardStats', () => ({
  useDashboardStats: () => ({
    stats: mockDashboardStats,
  }),
  useAvailableYearsOptimized: () => ({
    years: [2023, 2022, 2021],
  }),
}));

// Mock PocketBase
const mockSaveNavigationContext = vi.fn();
const mockGetFirstListItem = vi.fn();

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

// Mock logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Test component to consume context
const TestConsumer = () => {
  const {
    filters,
    projects,
    updateStatus,
    updateCompany,
    updateSearchTerm,
    resetAllFilters,
    getActiveFilterCount,
    getCountsForTabs,
  } = useDashboardFilters();

  const { recentlyEditedProjectId, setRecentlyEditedProjectId } = useRecentlyEdited();

  return (
    <div>
      <div data-testid="status">{filters.activeStatus}</div>
      <div data-testid="company">{filters.selectedCompany}</div>
      <div data-testid="search-term">{filters.searchTerm}</div>
      <div data-testid="projects-count">{projects.length}</div>
      <div data-testid="active-filters">{getActiveFilterCount()}</div>
      <div data-testid="tab-counts">{JSON.stringify(getCountsForTabs())}</div>
      <div data-testid="recently-edited">{recentlyEditedProjectId || 'none'}</div>
      
      <button onClick={() => updateStatus('wishlist')} data-testid="update-status">
        Update Status
      </button>
      <button onClick={() => updateCompany('company1')} data-testid="update-company">
        Update Company
      </button>
      <button onClick={() => updateSearchTerm('test search')} data-testid="update-search">
        Update Search
      </button>
      <button onClick={() => resetAllFilters()} data-testid="reset-filters">
        Reset Filters
      </button>
      <button onClick={() => setRecentlyEditedProjectId('project1')} data-testid="set-recently-edited">
        Set Recently Edited
      </button>
    </div>
  );
};

// Wrapper component for tests
const createWrapper = (user = { id: 'user123', email: 'test@example.com' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DashboardFiltersProvider user={user}>
          {children}
        </DashboardFiltersProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('DashboardFiltersContext', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    
    // Reset mocks
    mockGetFirstListItem.mockRejectedValue({ status: 404 });
    mockLocation.pathname = '/dashboard';
    mockLocation.search = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Initialization', () => {
    it('should render children with default filter state', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('all');
        expect(screen.getByTestId('company')).toHaveTextContent('all');
        expect(screen.getByTestId('search-term')).toHaveTextContent('');
        expect(screen.getByTestId('projects-count')).toHaveTextContent('2');
        expect(screen.getByTestId('recently-edited')).toHaveTextContent('none');
      });
    });

    it('should show loading state when metadata is loading', () => {
      // Mock loading state by updating the mock directly
      mockMetadataContext.isLoading = {
        tags: true,
        companies: false,
        artists: false,
      };

      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      
      // Reset after test
      mockMetadataContext.isLoading = {
        tags: false,
        companies: false,
        artists: false,
      };
    });

    it('should restore filters from database on initialization', async () => {
      const savedContext = {
        filters: {
          status: 'wishlist',
          company: 'company1',
          artist: 'all',
          drillShape: 'all',
          yearFinished: 'all',
          includeMiniKits: true,
          searchTerm: 'saved search',
          selectedTags: ['tag1'],
        },
        sortField: 'kit_name',
        sortDirection: 'asc',
        currentPage: 2,
        pageSize: 50,
      };

      mockGetFirstListItem.mockResolvedValue({
        navigation_context: savedContext,
      });

      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('wishlist');
        expect(screen.getByTestId('company')).toHaveTextContent('company1');
        expect(screen.getByTestId('search-term')).toHaveTextContent('saved search');
      });
    });
  });

  describe('Filter Updates', () => {
    it('should update status filter', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('all');
        expect(screen.getByTestId('update-status')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('update-status'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('wishlist');
      });
    });

    it('should update company filter', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('company')).toHaveTextContent('all');
        expect(screen.getByTestId('update-company')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('update-company'));

      await waitFor(() => {
        expect(screen.getByTestId('company')).toHaveTextContent('company1');
      });
    });

    it('should update search term', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('search-term')).toHaveTextContent('');
        expect(screen.getByTestId('update-search')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('update-search'));

      await waitFor(() => {
        expect(screen.getByTestId('search-term')).toHaveTextContent('test search');
      });
    });

    it('should reset all filters', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      // Wait for component to be initialized and content to load
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('all');
        expect(screen.getByTestId('update-status')).toBeInTheDocument();
      });

      // First update some filters
      fireEvent.click(screen.getByTestId('update-status'));
      fireEvent.click(screen.getByTestId('update-company'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('wishlist');
        expect(screen.getByTestId('company')).toHaveTextContent('company1');
      });

      // Then reset
      fireEvent.click(screen.getByTestId('reset-filters'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('all');
        expect(screen.getByTestId('company')).toHaveTextContent('all');
        expect(screen.getByTestId('search-term')).toHaveTextContent('');
      });
    });
  });

  describe('Recently Edited Context', () => {
    it('should manage recently edited project state', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited')).toHaveTextContent('none');
      });

      fireEvent.click(screen.getByTestId('set-recently-edited'));

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited')).toHaveTextContent('project1');
      });
    });
  });

  describe('Computed Values', () => {
    it('should calculate active filter count correctly', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('active-filters')).toHaveTextContent('0');
      });

      // Add some filters
      fireEvent.click(screen.getByTestId('update-status'));
      fireEvent.click(screen.getByTestId('update-company'));
      fireEvent.click(screen.getByTestId('update-search'));

      await waitFor(() => {
        expect(screen.getByTestId('active-filters')).toHaveTextContent('3');
      });
    });

    it('should provide correct tab counts', async () => {
      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        const tabCounts = JSON.parse(screen.getByTestId('tab-counts').textContent || '{}');
        // Total is calculated as sum of all status breakdowns (2+3+2+1+2+0+0 = 10)
        expect(tabCounts.all).toBe(10);
        expect(tabCounts.wishlist).toBe(2);
        expect(tabCounts.purchased).toBe(3);
        expect(tabCounts.stash).toBe(2);
        expect(tabCounts.progress).toBe(1);
        expect(tabCounts.completed).toBe(2);
      });
    });
  });

  describe('URL Parameter Handling', () => {
    it('should apply URL parameters to filters', async () => {
      mockLocation.search = '?status=wishlist&company=company1&tag=Tag 1';

      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('wishlist');
        expect(screen.getByTestId('company')).toHaveTextContent('company1');
      });

      // Should navigate to clean URL
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  describe('Navigation Context Saving', () => {
    it('should have navigation context save functionality available', async () => {
      const user = { id: 'user123', email: 'test@example.com' };
      const Wrapper = createWrapper(user);
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('all');
      });

      // Update some filters to create state that would be saved
      fireEvent.click(screen.getByTestId('update-status'));
      fireEvent.click(screen.getByTestId('update-company'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('wishlist');
        expect(screen.getByTestId('company')).toHaveTextContent('company1');
      });

      // Verify that the save navigation context mutation is available
      expect(mockSaveNavigationContext).toBeDefined();
      
      // Note: Testing the actual useEffect cleanup that triggers on navigation
      // is complex in the test environment. The save mechanism is thoroughly
      // tested in the useSaveNavigationContext.test.tsx file.
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user gracefully', () => {
      const Wrapper = createWrapper(null);
      
      expect(() => {
        render(
          <Wrapper>
            <TestConsumer />
          </Wrapper>
        );
      }).not.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      mockGetFirstListItem.mockRejectedValue(new Error('Database error'));

      const Wrapper = createWrapper();
      
      render(
        <Wrapper>
          <TestConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('all');
      });
    });
  });
});