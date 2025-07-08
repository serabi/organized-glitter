import React, { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider, useUI } from '../UIContext';

// Mock logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock MediaQueryList
const mockMediaQueryList = {
  matches: false,
  media: '(max-width: 768px)',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockMediaQueryList),
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: mockLocalStorage,
});

// Test component to consume context
const TestUIConsumer = () => {
  const {
    viewType,
    setViewType,
    loadingStates,
    setLoadingState,
    setLoadingStates,
    skeletonConfig,
    setSkeletonConfig,
    isMobileView,
    isTabletView,
    screenWidth,
    utils,
  } = useUI();

  return (
    <div>
      <div data-testid="view-type">{viewType}</div>
      <div data-testid="mobile">{isMobileView.toString()}</div>
      <div data-testid="tablet">{isTabletView.toString()}</div>
      <div data-testid="screen-width">{screenWidth}</div>
      <div data-testid="skeleton-loading">{loadingStates.isSkeletonLoading.toString()}</div>
      <div data-testid="main-content-loading">{loadingStates.isMainContentLoading.toString()}</div>
      <div data-testid="search-loading">{loadingStates.isSearchLoading.toString()}</div>
      <div data-testid="filter-options-loading">{loadingStates.isFilterOptionsLoading.toString()}</div>
      <div data-testid="page-transition-loading">{loadingStates.isPageTransitionLoading.toString()}</div>
      <div data-testid="skeleton-count">{skeletonConfig.count}</div>
      <div data-testid="skeleton-animation-speed">{skeletonConfig.animationSpeed}</div>
      <div data-testid="skeleton-shimmer">{skeletonConfig.enableShimmer.toString()}</div>
      <div data-testid="skeleton-height">{skeletonConfig.heightVariant}</div>
      <div data-testid="optimal-skeleton-count">{utils.getOptimalSkeletonCount()}</div>
      <div data-testid="is-any-loading">{utils.isAnyLoading().toString()}</div>

      <button onClick={() => setViewType('list')} data-testid="set-view-type">
        Set View Type
      </button>
      <button onClick={() => setLoadingState('isSkeletonLoading', true)} data-testid="set-skeleton-loading">
        Set Skeleton Loading
      </button>
      <button onClick={() => setLoadingStates({ isMainContentLoading: true, isSearchLoading: true })} data-testid="set-multiple-loading">
        Set Multiple Loading
      </button>
      <button onClick={() => setSkeletonConfig({ count: 18, animationSpeed: 2000 })} data-testid="set-skeleton-config">
        Set Skeleton Config
      </button>
      <button onClick={utils.resetLoadingStates} data-testid="reset-loading">
        Reset Loading
      </button>
      <button onClick={() => utils.enableSkeletonLoading({ count: 24 })} data-testid="enable-skeleton">
        Enable Skeleton
      </button>
      <button onClick={utils.disableSkeletonLoading} data-testid="disable-skeleton">
        Disable Skeleton
      </button>
    </div>
  );
};

// Wrapper component for tests
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <UIProvider>{children}</UIProvider>
    </QueryClientProvider>
  );
};

describe('UIContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    
    // Reset media query
    mockMediaQueryList.matches = false;
    
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Initialization', () => {
    it('should render children with default UI state', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-type')).toHaveTextContent('grid');
        expect(screen.getByTestId('mobile')).toHaveTextContent('false');
        expect(screen.getByTestId('tablet')).toHaveTextContent('false');
        expect(screen.getByTestId('screen-width')).toHaveTextContent('1024');
        expect(screen.getByTestId('skeleton-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('main-content-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('search-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('filter-options-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('page-transition-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('skeleton-count')).toHaveTextContent('12');
        expect(screen.getByTestId('skeleton-animation-speed')).toHaveTextContent('1500');
        expect(screen.getByTestId('skeleton-shimmer')).toHaveTextContent('true');
        expect(screen.getByTestId('skeleton-height')).toHaveTextContent('medium');
        expect(screen.getByTestId('is-any-loading')).toHaveTextContent('false');
      });
    });

    it('should load view type from localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('list');
      
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-type')).toHaveTextContent('list');
      });
    });

    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-type')).toHaveTextContent('grid');
      });
    });

    it('should detect mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      
      mockMediaQueryList.matches = true;

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mobile')).toHaveTextContent('true');
        expect(screen.getByTestId('tablet')).toHaveTextContent('false');
        expect(screen.getByTestId('screen-width')).toHaveTextContent('500');
        expect(screen.getByTestId('optimal-skeleton-count')).toHaveTextContent('6'); // Mobile grid view
      });
    });

    it('should detect tablet viewport', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tablet')).toHaveTextContent('true');
        expect(screen.getByTestId('mobile')).toHaveTextContent('false');
        expect(screen.getByTestId('screen-width')).toHaveTextContent('800');
        expect(screen.getByTestId('optimal-skeleton-count')).toHaveTextContent('9'); // Tablet grid view
      });
    });
  });

  describe('View Type Management', () => {
    it('should update view type', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('view-type')).toHaveTextContent('grid');
      });

      fireEvent.click(screen.getByTestId('set-view-type'));

      await waitFor(() => {
        expect(screen.getByTestId('view-type')).toHaveTextContent('list');
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('dashboard-view-type', 'list');
      });
    });

    it('should handle localStorage save errors', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('set-view-type'));

      await waitFor(() => {
        expect(screen.getByTestId('view-type')).toHaveTextContent('list');
      });
    });

    it('should calculate optimal skeleton count based on view type', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('optimal-skeleton-count')).toHaveTextContent('12'); // Desktop grid
      });

      fireEvent.click(screen.getByTestId('set-view-type'));

      await waitFor(() => {
        expect(screen.getByTestId('optimal-skeleton-count')).toHaveTextContent('15'); // Desktop list
      });
    });
  });

  describe('Loading State Management', () => {
    it('should set individual loading state', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('is-any-loading')).toHaveTextContent('false');
      });

      fireEvent.click(screen.getByTestId('set-skeleton-loading'));

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-loading')).toHaveTextContent('true');
        expect(screen.getByTestId('is-any-loading')).toHaveTextContent('true');
      });
    });

    it('should set multiple loading states', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('main-content-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('search-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('is-any-loading')).toHaveTextContent('false');
      });

      fireEvent.click(screen.getByTestId('set-multiple-loading'));

      await waitFor(() => {
        expect(screen.getByTestId('main-content-loading')).toHaveTextContent('true');
        expect(screen.getByTestId('search-loading')).toHaveTextContent('true');
        expect(screen.getByTestId('is-any-loading')).toHaveTextContent('true');
      });
    });

    it('should reset loading states', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      // First set some loading states
      fireEvent.click(screen.getByTestId('set-skeleton-loading'));
      fireEvent.click(screen.getByTestId('set-multiple-loading'));

      await waitFor(() => {
        expect(screen.getByTestId('is-any-loading')).toHaveTextContent('true');
      });

      // Then reset them
      fireEvent.click(screen.getByTestId('reset-loading'));

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('main-content-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('search-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('filter-options-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('page-transition-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('is-any-loading')).toHaveTextContent('false');
      });
    });
  });

  describe('Skeleton Configuration', () => {
    it('should update skeleton configuration', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-count')).toHaveTextContent('12');
        expect(screen.getByTestId('skeleton-animation-speed')).toHaveTextContent('1500');
      });

      fireEvent.click(screen.getByTestId('set-skeleton-config'));

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-count')).toHaveTextContent('18');
        expect(screen.getByTestId('skeleton-animation-speed')).toHaveTextContent('2000');
      });
    });

    it('should enable skeleton loading with configuration', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('skeleton-count')).toHaveTextContent('12');
      });

      fireEvent.click(screen.getByTestId('enable-skeleton'));

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-loading')).toHaveTextContent('true');
        expect(screen.getByTestId('skeleton-count')).toHaveTextContent('24');
      });
    });

    it('should disable skeleton loading', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      // First enable skeleton loading
      fireEvent.click(screen.getByTestId('enable-skeleton'));

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-loading')).toHaveTextContent('true');
      });

      // Then disable it
      fireEvent.click(screen.getByTestId('disable-skeleton'));

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-loading')).toHaveTextContent('false');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust skeleton count for mobile grid view', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      
      mockMediaQueryList.matches = true;

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('optimal-skeleton-count')).toHaveTextContent('6');
      });
    });

    it('should adjust skeleton count for mobile list view', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      
      mockMediaQueryList.matches = true;

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('set-view-type'));

      await waitFor(() => {
        expect(screen.getByTestId('optimal-skeleton-count')).toHaveTextContent('8');
      });
    });

    it('should adjust skeleton count for tablet grid view', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('optimal-skeleton-count')).toHaveTextContent('9');
      });
    });

    it('should adjust skeleton count for tablet list view', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('set-view-type'));

      await waitFor(() => {
        expect(screen.getByTestId('optimal-skeleton-count')).toHaveTextContent('12');
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useUI is used outside provider', () => {
      const TestComponent = () => {
        useUI();
        return null;
      };

      expect(() => render(<TestComponent />)).toThrow('useUI must be used within a UIProvider');
    });
  });

  describe('Window Resize Handling', () => {
    it('should update screen width on window resize', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestUIConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('screen-width')).toHaveTextContent('1024');
      });

      // Simulate window resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(screen.getByTestId('screen-width')).toHaveTextContent('768');
      });
    });
  });
});