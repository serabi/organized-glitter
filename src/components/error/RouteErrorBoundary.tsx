import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface RouteErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

interface RouteErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  routeName?: string;
}

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[RouteErrorBoundary] Error in ${this.props.routeName || 'route'}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;

    if (newRetryCount <= this.maxRetries) {
      console.log(
        `[RouteErrorBoundary] Retrying ${this.props.routeName || 'route'} (attempt ${newRetryCount}/${this.maxRetries})`
      );
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: newRetryCount,
      });
    }
  };

  handleReload = () => {
    console.log(`[RouteErrorBoundary] Reloading page for ${this.props.routeName || 'route'}`);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const isChunkError =
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch');

      return (
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-2xl font-bold">
              {isChunkError ? 'Loading Error' : 'Something went wrong'}
            </h1>

            <div className="mb-6 rounded-lg bg-muted p-4">
              <p className="mb-2 text-muted-foreground">
                {isChunkError
                  ? 'Failed to load the page resources. This may be due to a network issue or recent deployment.'
                  : `There was an error loading the ${this.props.routeName || 'page'}.`}
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm font-medium">
                    Error Details (Dev Mode)
                  </summary>
                  <pre className="mt-2 overflow-auto rounded bg-background p-2 text-xs">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-x-4">
              {canRetry && (
                <Button onClick={this.handleRetry} variant="default">
                  Try Again{' '}
                  {this.state.retryCount > 0 &&
                    `(${this.maxRetries - this.state.retryCount} attempts left)`}
                </Button>
              )}

              <Button onClick={this.handleReload} variant="outline">
                Reload Page
              </Button>

              <Button onClick={() => window.history.back()} variant="ghost">
                Go Back
              </Button>
            </div>

            {this.state.retryCount >= this.maxRetries && (
              <p className="mt-4 text-sm text-muted-foreground">
                Maximum retry attempts reached. Please try reloading the page or contact support if
                the issue persists.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
