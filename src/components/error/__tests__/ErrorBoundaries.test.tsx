import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useState, Component } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the logger module at the top level for proper hoisting
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { ErrorBoundary } from '../../ErrorBoundary';
import {
  ProjectContentErrorBoundary,
  FormErrorBoundary,
  DashboardItemErrorBoundary,
  ImageErrorBoundary,
} from '../ComponentErrorBoundaries';

// A component that throws an error
const ErrorComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test Error');
  }
  return <div>Test Component</div>;
};

// A component that throws an error after an effect
class AsyncErrorComponent extends Component<{ shouldThrow: boolean }> {
  componentDidUpdate() {
    if (this.props.shouldThrow) {
      throw new Error('Async Error');
    }
  }

  render() {
    return <div>Async Test Component</div>;
  }
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Mock console.error to avoid error logs in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('catches errors and renders fallback UI', async () => {
    const { logger } = await import('@/utils/logger');

    render(
      <ErrorBoundary
        fallback={({
          error,
          resetErrorBoundary,
        }: {
          error: Error;
          resetErrorBoundary: () => void;
        }) => (
          <div>
            <div>Error: {error.message}</div>
            <button onClick={resetErrorBoundary}>Try Again</button>
          </div>
        )}
      >
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error: Test Error')).toBeInTheDocument();
    // The error might be logged multiple times due to React's error handling
    expect(logger.error).toHaveBeenCalled();
  });

  it('calls onError when an error occurs', () => {
    const mockOnError = vi.fn();

    render(
      <ErrorBoundary onError={mockOnError}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledTimes(1);
    expect(mockOnError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mockOnError.mock.calls[0][0].message).toBe('Test Error');
  });

  it('provides resetErrorBoundary function to fallback', () => {
    let resetFn: (() => void) | null = null;

    render(
      <ErrorBoundary
        fallback={({ resetErrorBoundary }: { resetErrorBoundary: () => void }) => {
          // Store the reset function for testing
          resetFn = resetErrorBoundary;
          return <div>Error UI</div>;
        }}
      >
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Verify the reset function was provided
    expect(resetFn).toBeInstanceOf(Function);

    // Test that calling the reset function doesn't throw
    expect(() => resetFn && resetFn()).not.toThrow();
  });

  it('renders default fallback UI when no custom fallback is provided', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('logs error with context when provided', async () => {
    const { logger } = await import('@/utils/logger');
    const errorContext = { component: 'TestComponent', userId: '123' };

    render(
      <ErrorBoundary errorContext={errorContext}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check that error was logged with the correct context
    expect(logger.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error',
      expect.any(Error),
      expect.objectContaining({
        errorDetails: expect.objectContaining({
          context: errorContext,
          componentStack: expect.any(String),
        }),
      })
    );
  });

  it('catches errors in componentDidUpdate', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <AsyncErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should render without error initially
    expect(screen.getByText('Async Test Component')).toBeInTheDocument();

    // Trigger error in componentDidUpdate
    rerender(
      <ErrorBoundary>
        <AsyncErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should now show error boundary
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('resets error state when resetErrorBoundary is called', () => {
    // Create a controlled component that can toggle error state
    const TestApp = () => {
      const [hasError, setHasError] = useState(true);

      return (
        <ErrorBoundary
          fallback={({ resetErrorBoundary }: { resetErrorBoundary: () => void }) => (
            <div>
              <div>Error Boundary Active</div>
              <button
                onClick={() => {
                  setHasError(false);
                  resetErrorBoundary();
                }}
                data-testid="reset-button"
              >
                Reset
              </button>
            </div>
          )}
        >
          {hasError ? (
            <ErrorComponent shouldThrow={true} />
          ) : (
            <div data-testid="success-message">Test Component</div>
          )}
        </ErrorBoundary>
      );
    };

    render(<TestApp />);

    // Verify error boundary is active
    expect(screen.getByText('Error Boundary Active')).toBeInTheDocument();

    // Click reset
    const resetButton = screen.getByTestId('reset-button');
    fireEvent.click(resetButton);

    // Should now show the component content
    expect(screen.getByTestId('success-message')).toHaveTextContent('Test Component');
  });

  it('does not show reload button when showReloadButton is false', () => {
    render(
      <ErrorBoundary showReloadButton={false}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});

describe('ProjectContentErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ProjectContentErrorBoundary projectId="test-123">
        <div>Project Content</div>
      </ProjectContentErrorBoundary>
    );

    expect(screen.getByText('Project Content')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    render(
      <ProjectContentErrorBoundary projectId="test-123">
        <ErrorComponent shouldThrow={true} />
      </ProjectContentErrorBoundary>
    );

    expect(screen.getByText('Unable to display project content')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Go back')).toBeInTheDocument();
    expect(screen.getByText('Report issue')).toBeInTheDocument();
  });
});

describe('FormErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <FormErrorBoundary formName="Test Form">
        <div>Form Content</div>
      </FormErrorBoundary>
    );

    expect(screen.getByText('Form Content')).toBeInTheDocument();
  });

  it('calls onReset when reset button is clicked', () => {
    const mockOnReset = vi.fn();

    render(
      <FormErrorBoundary formName="Test Form" onReset={mockOnReset}>
        <ErrorComponent shouldThrow={true} />
      </FormErrorBoundary>
    );

    const resetButton = screen.getByText('Reset Form');
    fireEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });
});

describe('DashboardItemErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <DashboardItemErrorBoundary title="Test Widget">
        <div>Widget Content</div>
      </DashboardItemErrorBoundary>
    );

    expect(screen.getByText('Widget Content')).toBeInTheDocument();
  });

  it('renders widget-specific error UI', () => {
    render(
      <DashboardItemErrorBoundary title="Test Widget" widgetId="widget-123">
        <ErrorComponent shouldThrow={true} />
      </DashboardItemErrorBoundary>
    );

    expect(screen.getByText('Test Widget Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Reload Widget')).toBeInTheDocument();
  });
});

describe('ImageErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ImageErrorBoundary alt="Test Image" originalUrl="test.jpg">
        <img src="test.jpg" alt="Test" />
      </ImageErrorBoundary>
    );

    expect(screen.getByAltText('Test')).toBeInTheDocument();
  });

  it('renders fallback UI when image fails to load', () => {
    // Mocking the FallbackImage component
    vi.mock('@/components/projects/FallbackImage', () => ({
      __esModule: true,
      default: () => <div>Fallback Image</div>,
    }));

    render(
      <ImageErrorBoundary alt="Test Image" originalUrl="test.jpg">
        <ErrorComponent shouldThrow={true} />
      </ImageErrorBoundary>
    );

    expect(screen.getByText("Couldn't load image")).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
