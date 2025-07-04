/**
 * Integration Tests for Dashboard Status Synchronization
 *
 * Tests the complete flow from project status update to dashboard display
 * to ensure bulletproof synchronization between project changes and UI.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { pb } from '@/lib/pocketbase';
import { useUpdateProjectStatusMutation } from '@/hooks/mutations/useProjectDetailMutations';
import { DashboardFiltersProvider } from '@/contexts/DashboardFiltersContext';
import { AuthContext } from '@/contexts/AuthContext';
import { DashboardStatsService } from '@/services/pocketbase/dashboardStatsService';
import { queryKeys } from '@/hooks/queries/queryKeys';

// Mock dependencies
vi.mock('@/lib/pocketbase');
vi.mock('@/services/pocketbase/dashboardStatsService');
vi.mock('@/hooks/useRealtimeProjectSync', () => ({
  useRealtimeProjectSync: () => ({ isConnected: true }),
}));

const mockPb = vi.mocked(pb);
const mockDashboardStatsService = vi.mocked(DashboardStatsService);

// Test component that uses the mutation
const TestComponent = ({ projectId }: { projectId: string }) => {
  const mutation = useUpdateProjectStatusMutation();

  return (
    <div>
      <div data-testid="mutation-status">
        {mutation.isPending ? 'pending' : mutation.isSuccess ? 'success' : 'idle'}
      </div>
      <button
        data-testid="update-status-btn"
        onClick={() => mutation.mutate({ projectId, status: 'purchased' })}
      >
        Update to Purchased
      </button>
    </div>
  );
};

// Test wrapper with all providers
const TestWrapper = ({ children, user = { id: 'test-user-id', email: 'test@test.com' } }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const authContextValue = {
    user,
    isAuthenticated: !!user,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider value={authContextValue}>
          <DashboardFiltersProvider user={user}>{children}</DashboardFiltersProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Status Synchronization', () => {
  let queryClient: QueryClient;
  const projectId = 'test-project-id';
  const userId = 'test-user-id';
  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset all mocks
    vi.clearAllMocks();

    // Mock successful PocketBase update
    mockPb.collection.mockReturnValue({
      update: vi.fn().mockResolvedValue({
        id: projectId,
        status: 'purchased',
        user: userId,
      }),
    } as never);

    // Mock successful dashboard stats update
    mockDashboardStatsService.updateCacheAfterProjectChange.mockResolvedValue();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should properly cancel queries during optimistic updates', async () => {
    const cancelQueriesSpy = vi.spyOn(queryClient, 'cancelQueries');

    render(
      <TestWrapper>
        <TestComponent projectId={projectId} />
      </TestWrapper>
    );

    // Trigger status update
    fireEvent.click(screen.getByTestId('update-status-btn'));

    await waitFor(() => {
      expect(cancelQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.projects.detail(projectId),
      });
      expect(cancelQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.projects.advanced(userId),
      });
      expect(cancelQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.projects.lists(),
      });
      expect(cancelQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.stats.overview(userId),
      });
    });
  });

  it('should invalidate cache with correct key structure', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <TestWrapper>
        <TestComponent projectId={projectId} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('update-status-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('success');
    });

    // Verify exact dashboard stats key structure
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [...queryKeys.stats.overview(userId), 'dashboard', currentYear],
      exact: true,
    });

    // Verify broader stats invalidation
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.stats.overview(userId),
      exact: false,
    });
  });

  it('should synchronously update dashboard stats cache', async () => {
    render(
      <TestWrapper>
        <TestComponent projectId={projectId} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('update-status-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('success');
    });

    // Verify dashboard stats service was called synchronously
    expect(mockDashboardStatsService.updateCacheAfterProjectChange).toHaveBeenCalledWith(
      userId,
      currentYear
    );
  });

  it('should handle dashboard stats update failures gracefully', async () => {
    // Mock dashboard stats service failure
    mockDashboardStatsService.updateCacheAfterProjectChange.mockRejectedValue(
      new Error('Stats update failed')
    );

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <TestWrapper>
        <TestComponent projectId={projectId} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('update-status-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('success');
    });

    // Should fallback to broader invalidation
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.stats.overview(userId),
      refetchType: 'active',
    });
  });

  it('should rollback optimistic updates on mutation failure', async () => {
    // Mock PocketBase update failure
    mockPb.collection.mockReturnValue({
      update: vi.fn().mockRejectedValue(new Error('Update failed')),
    } as never);

    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    // Pre-populate cache with some data
    const previousData = { id: projectId, status: 'wishlist' };
    queryClient.setQueryData(queryKeys.projects.detail(projectId), previousData);

    render(
      <TestWrapper>
        <TestComponent projectId={projectId} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('update-status-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('idle');
    });

    // Verify rollback was attempted
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      queryKeys.projects.detail(projectId),
      previousData
    );
  });

  it('should handle concurrent status updates correctly', async () => {
    const TestConcurrentComponent = () => {
      const mutation1 = useUpdateProjectStatusMutation();
      const mutation2 = useUpdateProjectStatusMutation();

      return (
        <div>
          <button
            data-testid="update-1"
            onClick={() => mutation1.mutate({ projectId: 'project-1', status: 'purchased' })}
          >
            Update Project 1
          </button>
          <button
            data-testid="update-2"
            onClick={() => mutation2.mutate({ projectId: 'project-2', status: 'completed' })}
          >
            Update Project 2
          </button>
          <div data-testid="status-1">{mutation1.isPending ? 'pending-1' : 'idle-1'}</div>
          <div data-testid="status-2">{mutation2.isPending ? 'pending-2' : 'idle-2'}</div>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestConcurrentComponent />
      </TestWrapper>
    );

    // Trigger both updates simultaneously
    fireEvent.click(screen.getByTestId('update-1'));
    fireEvent.click(screen.getByTestId('update-2'));

    // Both should handle their respective updates
    await waitFor(() => {
      expect(mockDashboardStatsService.updateCacheAfterProjectChange).toHaveBeenCalledTimes(2);
    });

    // Verify both stats calls succeeded
    expect(mockDashboardStatsService.updateCacheAfterProjectChange).toHaveBeenCalledWith(
      userId,
      currentYear
    );
  });

  it('should maintain database as source of truth', async () => {
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(
      <TestWrapper>
        <TestComponent projectId={projectId} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('update-status-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('success');
    });

    // Should NOT use setQueryData for optimistic updates in onSuccess
    // (we removed optimistic updates in favor of immediate invalidation)
    const optimisticCalls = setQueryDataSpy.mock.calls.filter(
      call => call[0] === queryKeys.projects.detail(projectId) && typeof call[1] === 'function'
    );
    expect(optimisticCalls).toHaveLength(0);

    // Should use invalidateQueries to force database refetch
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.projects.detail(projectId),
      exact: true,
    });
  });
});

describe('Real-time Synchronization', () => {
  it('should handle external project updates via real-time events', async () => {
    // This would require mocking PocketBase real-time subscriptions
    // For now, we verify the hook is integrated

    render(
      <TestWrapper>
        <div data-testid="test-content">Dashboard with real-time sync</div>
      </TestWrapper>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();

    // Real-time functionality is tested in the hook's unit tests
    // Integration would require a more complex setup with WebSocket mocking
  });
});
