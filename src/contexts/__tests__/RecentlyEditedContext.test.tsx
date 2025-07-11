// DIAGNOSTIC: Adding console logs to track import loading
console.log('DEBUG: Starting RecentlyEditedContext test imports...');

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
console.log('DEBUG: Vitest imports loaded');

// Mock logger - MUST be defined before any imports that use it
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => mockLogger,
}));
console.log('DEBUG: secureLogger mock set up');

import React, { ReactNode } from 'react';
console.log('DEBUG: React imported successfully');

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
console.log('DEBUG: Testing library imports loaded');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
console.log('DEBUG: React Query imports loaded');

import { RecentlyEditedProvider, useRecentlyEdited } from '../RecentlyEditedContext';
console.log(
  'DEBUG: RecentlyEditedContext imports loaded - this should appear if secureLogger resolves'
);

// Test component to consume context
const TestRecentlyEditedConsumer = () => {
  const {
    recentlyEditedProjectId,
    setRecentlyEditedProjectId,
    clearRecentlyEdited,
    isRecentlyEdited,
  } = useRecentlyEdited();

  return (
    <div>
      <div data-testid="recently-edited-id">{recentlyEditedProjectId || 'null'}</div>
      <div data-testid="is-project-1-recently-edited">
        {isRecentlyEdited('project-1').toString()}
      </div>
      <div data-testid="is-project-2-recently-edited">
        {isRecentlyEdited('project-2').toString()}
      </div>

      <button onClick={() => setRecentlyEditedProjectId('project-1')} data-testid="set-project-1">
        Set Project 1
      </button>
      <button onClick={() => setRecentlyEditedProjectId('project-2')} data-testid="set-project-2">
        Set Project 2
      </button>
      <button onClick={() => setRecentlyEditedProjectId(null)} data-testid="set-null">
        Set Null
      </button>
      <button onClick={clearRecentlyEdited} data-testid="clear-recently-edited">
        Clear Recently Edited
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
      <RecentlyEditedProvider>{children}</RecentlyEditedProvider>
    </QueryClientProvider>
  );
};

describe('RecentlyEditedContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Initialization', () => {
    it('should render children with default state', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestRecentlyEditedConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('null');
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('false');
        expect(screen.getByTestId('is-project-2-recently-edited')).toHaveTextContent('false');
      });
    });
  });

  describe('Recently Edited Project Management', () => {
    it('should set recently edited project ID', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestRecentlyEditedConsumer />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('null');
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('false');
      });

      fireEvent.click(screen.getByTestId('set-project-1'));

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('project-1');
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('true');
        expect(screen.getByTestId('is-project-2-recently-edited')).toHaveTextContent('false');
      });
    });

    it('should update recently edited project ID', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestRecentlyEditedConsumer />
        </Wrapper>
      );

      // Set first project
      fireEvent.click(screen.getByTestId('set-project-1'));

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('project-1');
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('true');
        expect(screen.getByTestId('is-project-2-recently-edited')).toHaveTextContent('false');
      });

      // Set second project
      fireEvent.click(screen.getByTestId('set-project-2'));

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('project-2');
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('false');
        expect(screen.getByTestId('is-project-2-recently-edited')).toHaveTextContent('true');
      });
    });

    it('should clear recently edited project using setRecentlyEditedProjectId(null)', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestRecentlyEditedConsumer />
        </Wrapper>
      );

      // First set a project
      fireEvent.click(screen.getByTestId('set-project-1'));

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('project-1');
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('true');
      });

      // Clear using setRecentlyEditedProjectId(null)
      fireEvent.click(screen.getByTestId('set-null'));

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('null');
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('false');
        expect(screen.getByTestId('is-project-2-recently-edited')).toHaveTextContent('false');
      });
    });

    it('should clear recently edited project using clearRecentlyEdited method', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestRecentlyEditedConsumer />
        </Wrapper>
      );

      // First set a project
      fireEvent.click(screen.getByTestId('set-project-1'));

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('project-1');
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('true');
      });

      // Clear using clearRecentlyEdited method
      fireEvent.click(screen.getByTestId('clear-recently-edited'));

      await waitFor(() => {
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('null');
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('false');
        expect(screen.getByTestId('is-project-2-recently-edited')).toHaveTextContent('false');
      });
    });
  });

  describe('isRecentlyEdited Function', () => {
    it('should correctly identify recently edited project', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestRecentlyEditedConsumer />
        </Wrapper>
      );

      // Initially no project is recently edited
      await waitFor(() => {
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('false');
        expect(screen.getByTestId('is-project-2-recently-edited')).toHaveTextContent('false');
      });

      // Set project-1 as recently edited
      fireEvent.click(screen.getByTestId('set-project-1'));

      await waitFor(() => {
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('true');
        expect(screen.getByTestId('is-project-2-recently-edited')).toHaveTextContent('false');
      });

      // Set project-2 as recently edited
      fireEvent.click(screen.getByTestId('set-project-2'));

      await waitFor(() => {
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('false');
        expect(screen.getByTestId('is-project-2-recently-edited')).toHaveTextContent('true');
      });

      // Clear recently edited
      fireEvent.click(screen.getByTestId('clear-recently-edited'));

      await waitFor(() => {
        expect(screen.getByTestId('is-project-1-recently-edited')).toHaveTextContent('false');
        expect(screen.getByTestId('is-project-2-recently-edited')).toHaveTextContent('false');
      });
    });

    it('should handle edge cases for isRecentlyEdited', async () => {
      const TestEdgeCases = () => {
        const { setRecentlyEditedProjectId, isRecentlyEdited } = useRecentlyEdited();

        return (
          <div>
            <div data-testid="is-empty-string-recently-edited">
              {isRecentlyEdited('').toString()}
            </div>
            <div data-testid="is-undefined-recently-edited">
              {isRecentlyEdited(undefined as any).toString()}
            </div>
            <button onClick={() => setRecentlyEditedProjectId('')} data-testid="set-empty-string">
              Set Empty String
            </button>
          </div>
        );
      };

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestEdgeCases />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-empty-string-recently-edited')).toHaveTextContent('false');
        expect(screen.getByTestId('is-undefined-recently-edited')).toHaveTextContent('false');
      });

      fireEvent.click(screen.getByTestId('set-empty-string'));

      await waitFor(() => {
        expect(screen.getByTestId('is-empty-string-recently-edited')).toHaveTextContent('true');
        expect(screen.getByTestId('is-undefined-recently-edited')).toHaveTextContent('false');
      });
    });
  });

  describe('Logging', () => {
    it('should log when setting recently edited project', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestRecentlyEditedConsumer />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('set-project-1'));

      await waitFor(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith('Setting recently edited project', {
          previousId: null,
          newId: 'project-1',
        });
      });
    });

    it('should log when clearing recently edited project', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestRecentlyEditedConsumer />
        </Wrapper>
      );

      // First set a project
      fireEvent.click(screen.getByTestId('set-project-1'));

      await waitFor(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith('Setting recently edited project', {
          previousId: null,
          newId: 'project-1',
        });
      });

      // Clear the mock to focus on the clear operation
      mockLogger.debug.mockClear();

      fireEvent.click(screen.getByTestId('clear-recently-edited'));

      await waitFor(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith('Clearing recently edited project state');
        expect(mockLogger.debug).toHaveBeenCalledWith('Setting recently edited project', {
          previousId: 'project-1',
          newId: null,
        });
      });
    });

    it('should log when updating recently edited project', async () => {
      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestRecentlyEditedConsumer />
        </Wrapper>
      );

      // Set first project
      fireEvent.click(screen.getByTestId('set-project-1'));

      await waitFor(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith('Setting recently edited project', {
          previousId: null,
          newId: 'project-1',
        });
      });

      // Clear the mock to focus on the update operation
      mockLogger.debug.mockClear();

      // Set second project
      fireEvent.click(screen.getByTestId('set-project-2'));

      await waitFor(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith('Setting recently edited project', {
          previousId: 'project-1',
          newId: 'project-2',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useRecentlyEdited is used outside provider', () => {
      const TestComponent = () => {
        useRecentlyEdited();
        return null;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useRecentlyEdited must be used within a RecentlyEditedProvider'
      );
    });
  });

  describe('Context Value Stability', () => {
    it('should maintain context value stability to prevent unnecessary re-renders', async () => {
      const renderCount = { count: 0 };

      const TestStability = () => {
        const context = useRecentlyEdited();
        renderCount.count++;

        return (
          <div>
            <div data-testid="render-count">{renderCount.count}</div>
            <div data-testid="recently-edited-id">{context.recentlyEditedProjectId || 'null'}</div>
            <button
              onClick={() => context.setRecentlyEditedProjectId('project-1')}
              data-testid="set-project-1"
            >
              Set Project 1
            </button>
            <button
              onClick={() => context.setRecentlyEditedProjectId('project-1')}
              data-testid="set-project-1-again"
            >
              Set Project 1 Again
            </button>
          </div>
        );
      };

      const Wrapper = createWrapper();

      render(
        <Wrapper>
          <TestStability />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('render-count')).toHaveTextContent('1');
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('null');
      });

      // Set project-1
      fireEvent.click(screen.getByTestId('set-project-1'));

      await waitFor(() => {
        expect(screen.getByTestId('render-count')).toHaveTextContent('2');
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('project-1');
      });

      // Set project-1 again (should trigger re-render due to logging, but state doesn't change)
      fireEvent.click(screen.getByTestId('set-project-1-again'));

      await waitFor(() => {
        expect(screen.getByTestId('render-count')).toHaveTextContent('3');
        expect(screen.getByTestId('recently-edited-id')).toHaveTextContent('project-1');
      });
    });
  });
});
