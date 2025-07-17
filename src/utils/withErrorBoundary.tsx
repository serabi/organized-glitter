import { ComponentType } from 'react';
import { ErrorBoundary, ErrorBoundaryProps } from '../components/ErrorBoundary';

export type WithErrorBoundaryOptions = Omit<ErrorBoundaryProps, 'children'>;

// This file exports a single component (the HOC) to maintain Fast Refresh support
// See: https://github.com/facebook/react/issues/20987#issuecomment-911512314

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 * @param Component - The component to wrap with error boundary
 * @param options - Error boundary configuration options
 * @returns A new component wrapped with ErrorBoundary
 *
 * @example
 * // Basic usage
 * const MyComponent = () => <div>My Component</div>;
 * export default withErrorBoundary(MyComponent);
 *
 * @example
 * // With custom fallback and error handler
 * const MyComponent = () => <div>My Component</div>;
 *
 * export default withErrorBoundary(MyComponent, {
 *   fallback: <div>Something went wrong!</div>,
 *   onError: (error, errorInfo) => {
 *     logger.error('Error caught by boundary:', error, errorInfo);
 *   },
 *   errorContext: { component: 'MyComponent' },
 *   showReloadButton: true
 * });
 */
function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }

  // Set a display name for better debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;

  return WrappedComponent;
}

export { withErrorBoundary };
