import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/logger';

/**
 * Data provided to the fallback render function
 */
interface ErrorBoundaryStateData {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetErrorBoundary: () => void;
}

type FallbackRender = (props: ErrorBoundaryStateData) => ReactNode;

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** The child components to be wrapped by the error boundary */
  children: ReactNode;

  /**
   * A fallback UI to render when an error occurs.
   * Can be a React node or a render function that receives error info.
   * @default A basic error message with a retry button
   */
  fallback?: ReactNode | FallbackRender;

  /**
   * Callback function called when an error is caught
   * @param error - The error that was caught
   * @param errorInfo - Additional error information including component stack
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /**
   * Additional context to include in error logs
   * Useful for debugging and error tracking
   */
  errorContext?: Record<string, unknown>;

  /**
   * Whether to show a reload button in the default fallback UI
   * @default true
   */
  showReloadButton?: boolean;

  /**
   * Callback function called when the error boundary is reset
   */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Default fallback UI component for the error boundary
 */
const DefaultFallback = ({
  error,
  errorInfo,
  onReset,
  showReloadButton = true,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  showReloadButton?: boolean;
}) => (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
    <h2 className="text-lg font-medium text-red-800 dark:text-red-200">Something went wrong</h2>
    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
      {error?.message || 'An unexpected error occurred'}
    </p>
    {errorInfo?.componentStack && (
      <details className="mt-3 text-xs text-red-600 dark:text-red-400">
        <summary className="cursor-pointer">Error details</summary>
        <pre className="mt-1 max-h-40 overflow-auto rounded bg-white p-2 dark:bg-gray-900">
          {errorInfo.componentStack}
        </pre>
      </details>
    )}
    {showReloadButton && (
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Try again
      </button>
    )}
  </div>
);

/**
 * A reusable error boundary component that catches JavaScript errors in its child component tree.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={({ error, resetErrorBoundary }) => (
 *     <div>
 *       <p>Something went wrong: {error.message}</p>
 *       <button onClick={resetErrorBoundary}>Try again</button>
 *     </div>
 *   )}
 *   onError={(error, errorInfo) => {
 *     logger.error('Error caught by boundary', error, errorInfo);
 *   }}
 *   errorContext={{ component: 'MyComponent' }}
 *   showReloadButton={true}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    logger.error('ErrorBoundary caught an error', error, {
      componentStack: error.stack,
    });
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.errorContext || {},
      timestamp: new Date().toISOString(),
    };

    logger.error('ErrorBoundary caught an error', error, {
      errorDetails,
      location: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      timestamp: errorDetails.timestamp,
    });

    this.setState({ error, errorInfo });

    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (e) {
        logger.error('Error in onError callback', e as Error);
      }
    }
  }

  private handleReset = (): void => {
    logger.info('Resetting error boundary');
    const { onReset } = this.props;

    // Call the onReset callback if provided
    if (typeof onReset === 'function') {
      onReset();
    }

    // Reset the error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Renders the fallback UI when an error occurs
   */
  private renderFallback(): ReactNode {
    const { error, errorInfo } = this.state;
    const { fallback, showReloadButton = true } = this.props;

    // Handle render prop fallback
    if (typeof fallback === 'function') {
      return fallback({
        error: error!,
        errorInfo,
        resetErrorBoundary: this.handleReset,
      });
    }

    // Handle React element fallback
    if (fallback) return fallback;

    // Default fallback UI
    return (
      <DefaultFallback
        error={error}
        errorInfo={errorInfo}
        onReset={this.handleReset}
        showReloadButton={showReloadButton}
      />
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderFallback();
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
