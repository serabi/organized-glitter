import React, { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatsProvider, useStats } from '../StatsContext';

// Mock dependencies
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

const mockUseDashboardStats = vi.fn();

vi.mock('@/hooks/queries/useDashboardStatsStable', () => ({
  useDashboardStatsStable: () => mockUseDashboardStats(),
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

// Mock auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    isLoading: false,
    error: null,
  }),
}));

// Mock navigator for mobile detection
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
    connection: {
      effectiveType: '4g',
      saveData: false,
    },
  },
  writable: true,
});

// Test component to consume context
const TestStatsConsumer = () => {
  const { stats, isLoading, error, getBadgeContent } = useStats();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{error ? 'error' : 'no-error'}</div>
      <div data-testid="wishlist-count">{stats?.status_breakdown?.wishlist || 0}</div>
      <div data-testid="purchased-count">{stats?.status_breakdown?.purchased || 0}</div>
      <div data-testid="badge-content">{getBadgeContent(5)}</div>
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
      <StatsProvider>{children}</StatsProvider>
    </QueryClientProvider>
  );
};

describe('StatsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockUseDashboardStats.mockReturnValue({
      stats: mockDashboardStats,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Initialization', () => {
    it('should render children with stats data', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStatsConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('error')).toHaveTextContent('no-error');
        expect(screen.getByTestId('wishlist-count')).toHaveTextContent('2');
        expect(screen.getByTestId('purchased-count')).toHaveTextContent('3');
      });
    });

    it('should handle loading state', async () => {
      mockUseDashboardStats.mockReturnValue({
        stats: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStatsConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      });
    });

    it('should handle error state', async () => {
      mockUseDashboardStats.mockReturnValue({
        stats: null,
        isLoading: false,
        error: new Error('Failed to load stats'),
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStatsConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('error')).toHaveTextContent('error');
      });
    });
  });

  describe('Badge Content Function', () => {
    it('should return spinner for loading state', async () => {
      mockUseDashboardStats.mockReturnValue({
        stats: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStatsConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        const badge = screen.getByTestId('badge-content');
        expect(badge.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should return spinner for error state', async () => {
      mockUseDashboardStats.mockReturnValue({
        stats: null,
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStatsConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        const badge = screen.getByTestId('badge-content');
        expect(badge.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should return count for loaded state', async () => {
      mockUseDashboardStats.mockReturnValue({
        stats: mockDashboardStats,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStatsConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('badge-content')).toHaveTextContent('5');
      });
    });
  });

  describe('Mobile Network Detection', () => {
    it('should detect mobile device', async () => {
      // Mobile user agent is already set in beforeEach
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStatsConsumer />
        </Wrapper>
      );

      // Context should initialize without errors on mobile
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });
    });

    it('should detect desktop device', async () => {
      // Override with desktop user agent
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connection: {
            effectiveType: '4g',
            saveData: false,
          },
        },
        writable: true,
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStatsConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing stats gracefully', async () => {
      mockUseDashboardStats.mockReturnValue({
        stats: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStatsConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('wishlist-count')).toHaveTextContent('0');
        expect(screen.getByTestId('purchased-count')).toHaveTextContent('0');
      });
    });

    it('should handle malformed stats data', async () => {
      mockUseDashboardStats.mockReturnValue({
        stats: { status_breakdown: null },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStatsConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('wishlist-count')).toHaveTextContent('0');
        expect(screen.getByTestId('purchased-count')).toHaveTextContent('0');
      });
    });
  });
});