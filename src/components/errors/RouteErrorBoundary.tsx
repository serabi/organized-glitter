import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Route error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 px-4">
          <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-lg font-medium">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              The page couldn't be loaded. Please try again.
            </p>
          </div>
          <Button onClick={() => (window.location.href = '/dashboard')}>
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
