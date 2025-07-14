import React, { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FiltersProvider, useFilters } from '../FiltersContext';

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
  default: (value: unknown) => value,
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
  performanceLogger: {
    start: vi.fn(() => 'perf-id'),
    end: vi.fn(),
  },
}));

// Mock auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    isLoading: false,
    error: null,
  }),
}));

// Test component to consume context
const TestFiltersConsumer = () => {
  const {
    filters,
    updateStatus,
    updateCompany,
    updateArtist,
    updateSearchTerm,
    updateTags,
    resetAllFilters,
    getActiveFilterCount,
    updateSort,
    updatePage,
    updatePageSize,
  } = useFilters();

  return (
    <div>
      <div data-testid="status">{filters.activeStatus}</div>
      <div data-testid="company">{filters.selectedCompany}</div>
      <div data-testid="artist">{filters.selectedArtist}</div>
      <div data-testid="search-term">{filters.searchTerm}</div>
      <div data-testid="selected-tags">{filters.selectedTags.join(',')}</div>
      <div data-testid="drill-shape">{filters.selectedDrillShape}</div>
      <div data-testid="year-finished">{filters.selectedYearFinished}</div>
      <div data-testid="include-mini-kits">{filters.includeMiniKits.toString()}</div>
      <div data-testid="active-filters">{getActiveFilterCount()}</div>
      <div data-testid="sort-field">{filters.sortField}</div>
      <div data-testid="sort-direction">{filters.sortDirection}</div>
      <div data-testid="current-page">{filters.currentPage}</div>
      <div data-testid="page-size">{filters.pageSize}</div>

      <button onClick={() => updateStatus('wishlist')} data-testid="update-status">
        Update Status
      </button>
      <button onClick={() => updateCompany('company1')} data-testid="update-company">
        Update Company
      </button>
      <button onClick={() => updateArtist('artist1')} data-testid="update-artist">
        Update Artist
      </button>
      <button onClick={() => updateSearchTerm('test search')} data-testid="update-search">
        Update Search
      </button>
      <button onClick={() => updateTags(['tag1', 'tag2'])} data-testid="update-tags">
        Update Tags
      </button>
      <button onClick={() => resetAllFilters()} data-testid="reset-filters">
        Reset Filters
      </button>
      <button onClick={() => updateSort('kit_name', 'desc')} data-testid="update-sort">
        Update Sort
      </button>
      <button onClick={() => updatePage(2)} data-testid="update-page">
        Update Page
      </button>
      <button onClick={() => updatePageSize(50)} data-testid="update-page-size">
        Update Page Size
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
        <FiltersProvider user={user}>{children}</FiltersProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FiltersContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('all');
        expect(screen.getByTestId('company')).toHaveTextContent('all');
        expect(screen.getByTestId('artist')).toHaveTextContent('all');
        expect(screen.getByTestId('search-term')).toHaveTextContent('');
        expect(screen.getByTestId('selected-tags')).toHaveTextContent('');
        expect(screen.getByTestId('drill-shape')).toHaveTextContent('all');
        expect(screen.getByTestId('year-finished')).toHaveTextContent('all');
        expect(screen.getByTestId('include-mini-kits')).toHaveTextContent('true');
        expect(screen.getByTestId('active-filters')).toHaveTextContent('0');
        expect(screen.getByTestId('sort-field')).toHaveTextContent('last_updated');
        expect(screen.getByTestId('sort-direction')).toHaveTextContent('desc');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1');
        expect(screen.getByTestId('page-size')).toHaveTextContent('25');
      });
    });

    it('should restore filters from database on initialization', async () => {
      console.log('DEBUG: Starting database restoration test');

      const savedContext = {
        filters: {
          status: 'wishlist',
          company: 'company1',
          artist: 'artist1',
          drillShape: 'round',
          yearFinished: '2023',
          includeMiniKits: false,
          searchTerm: 'saved search',
          selectedTags: ['tag1'],
        },
        sortField: 'kit_name',
        sortDirection: 'asc',
        currentPage: 2,
        pageSize: 50,
      };

      console.log('DEBUG: Mock data prepared:', savedContext);
      mockGetFirstListItem.mockResolvedValue({
        navigation_context: savedContext,
      });
      console.log('DEBUG: mockGetFirstListItem configured to resolve with savedContext');

      const Wrapper = createWrapper();
      console.log('DEBUG: Wrapper created');

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );
      console.log('DEBUG: Component rendered, waiting for data...');

      // Wait for restoration with extended timeout
      console.log('DEBUG: Starting waitFor with 15 second timeout...');
      await waitFor(
        () => {
          console.log('DEBUG: Checking elements...');
          const statusElement = screen.getByTestId('status');
          const companyElement = screen.getByTestId('company');
          console.log('DEBUG: Status content:', statusElement.textContent);
          console.log('DEBUG: Company content:', companyElement.textContent);

          expect(statusElement).toHaveTextContent('wishlist');
          expect(companyElement).toHaveTextContent('company1');
          expect(screen.getByTestId('artist')).toHaveTextContent('artist1');
          expect(screen.getByTestId('search-term')).toHaveTextContent('saved search');
          expect(screen.getByTestId('selected-tags')).toHaveTextContent('tag1');
          expect(screen.getByTestId('drill-shape')).toHaveTextContent('round');
          expect(screen.getByTestId('year-finished')).toHaveTextContent('2023');
          expect(screen.getByTestId('include-mini-kits')).toHaveTextContent('false');
          expect(screen.getByTestId('sort-field')).toHaveTextContent('kit_name');
          expect(screen.getByTestId('sort-direction')).toHaveTextContent('asc');
          expect(screen.getByTestId('current-page')).toHaveTextContent('2');
          expect(screen.getByTestId('page-size')).toHaveTextContent('50');
        },
        { timeout: 15000 }
      ); // Increased timeout to 15 seconds

      console.log('DEBUG: Database restoration test completed successfully');
    });
  });

  describe('Filter Updates', () => {
    it('should update status filter', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('all');
      });

      fireEvent.click(screen.getByTestId('update-status'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('wishlist');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1'); // Should reset page
      });
    });

    it('should update company filter', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('company')).toHaveTextContent('all');
      });

      fireEvent.click(screen.getByTestId('update-company'));

      await waitFor(() => {
        expect(screen.getByTestId('company')).toHaveTextContent('company1');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1'); // Should reset page
      });
    });

    it('should update artist filter', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('artist')).toHaveTextContent('all');
      });

      fireEvent.click(screen.getByTestId('update-artist'));

      await waitFor(() => {
        expect(screen.getByTestId('artist')).toHaveTextContent('artist1');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1'); // Should reset page
      });
    });

    it('should update search term', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('search-term')).toHaveTextContent('');
      });

      fireEvent.click(screen.getByTestId('update-search'));

      await waitFor(() => {
        expect(screen.getByTestId('search-term')).toHaveTextContent('test search');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1'); // Should reset page
      });
    });

    it('should update selected tags', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('selected-tags')).toHaveTextContent('');
      });

      fireEvent.click(screen.getByTestId('update-tags'));

      await waitFor(() => {
        expect(screen.getByTestId('selected-tags')).toHaveTextContent('tag1,tag2');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1'); // Should reset page
      });
    });

    it('should reset all filters', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      // First update some filters
      fireEvent.click(screen.getByTestId('update-status'));
      fireEvent.click(screen.getByTestId('update-company'));
      fireEvent.click(screen.getByTestId('update-search'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('wishlist');
        expect(screen.getByTestId('company')).toHaveTextContent('company1');
        expect(screen.getByTestId('search-term')).toHaveTextContent('test search');
      });

      // Then reset
      fireEvent.click(screen.getByTestId('reset-filters'));

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('all');
        expect(screen.getByTestId('company')).toHaveTextContent('all');
        expect(screen.getByTestId('artist')).toHaveTextContent('all');
        expect(screen.getByTestId('search-term')).toHaveTextContent('');
        expect(screen.getByTestId('selected-tags')).toHaveTextContent('');
        expect(screen.getByTestId('drill-shape')).toHaveTextContent('all');
        expect(screen.getByTestId('year-finished')).toHaveTextContent('all');
        expect(screen.getByTestId('include-mini-kits')).toHaveTextContent('true');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1');
      });
    });
  });

  describe('Pagination and Sorting', () => {
    it('should update sort field and direction', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('sort-field')).toHaveTextContent('last_updated');
        expect(screen.getByTestId('sort-direction')).toHaveTextContent('desc');
      });

      fireEvent.click(screen.getByTestId('update-sort'));

      await waitFor(() => {
        expect(screen.getByTestId('sort-field')).toHaveTextContent('kit_name');
        expect(screen.getByTestId('sort-direction')).toHaveTextContent('desc');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1'); // Should reset page
      });
    });

    it('should update current page', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('1');
      });

      fireEvent.click(screen.getByTestId('update-page'));

      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('2');
      });
    });

    it('should update page size', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('page-size')).toHaveTextContent('25');
      });

      fireEvent.click(screen.getByTestId('update-page-size'));

      await waitFor(() => {
        expect(screen.getByTestId('page-size')).toHaveTextContent('50');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1'); // Should reset page
      });
    });
  });

  describe('Active Filter Count', () => {
    it('should calculate active filter count correctly', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('active-filters')).toHaveTextContent('0');
      });

      // Add some filters
      fireEvent.click(screen.getByTestId('update-status'));
      fireEvent.click(screen.getByTestId('update-company'));
      fireEvent.click(screen.getByTestId('update-search'));
      fireEvent.click(screen.getByTestId('update-tags'));

      await waitFor(() => {
        expect(screen.getByTestId('active-filters')).toHaveTextContent('4');
      });
    });
  });

  describe('URL Parameter Handling', () => {
    it('should apply URL parameters to filters', async () => {
      mockLocation.search = '?status=wishlist&company=company1&tag=Tag 1';

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
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

  describe('Error Handling', () => {
    it('should handle missing user gracefully', () => {
      const Wrapper = createWrapper(undefined);

      expect(() => {
        render(
          <Wrapper>
            <TestFiltersConsumer />
          </Wrapper>
        );
      }).not.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      mockGetFirstListItem.mockRejectedValue(new Error('Database error'));

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestFiltersConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('all');
      });
    });
  });
});
