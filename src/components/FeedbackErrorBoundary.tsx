import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { captureException } from '@/utils/posthog';
import { showUserReportDialog } from './FeedbackDialogProvider';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * Data provided to the fallback render function
 */
interface ErrorBoundaryStateData {
  error: Error;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
  resetErrorBoundary: () => void;
  showReportDialog: () => void;
}

type FallbackRender = (props: ErrorBoundaryStateData) => ReactNode;

/**
 * Props for the FeedbackErrorBoundary component
 */
export interface FeedbackErrorBoundaryProps {
  /** The child components to be wrapped by the error boundary */
  children: ReactNode;

  /**
   * A fallback UI to render when an error occurs.
   * Can be a React node or a render function that receives error info.
   * @default A basic error message with retry and feedback buttons
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
   * Whether to show a report button in the default fallback UI
   * @default true
   */
  showReportButton?: boolean;

  /**
   * Whether to automatically show the report dialog when an error occurs
   * @default false
   */
  autoShowReportDialog?: boolean;

  /**
   * Custom title for the report dialog
   */
  reportDialogTitle?: string;

  /**
   * Custom subtitle for the report dialog
   */
  reportDialogSubtitle?: string;
}

interface FeedbackErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
}

/**
 * Default fallback UI component for the error boundary with user feedback option
 */
const DefaultFeedbackFallback = ({
  error,
  errorInfo,
  onReset,
  onReport,
  showReloadButton = true,
  showReportButton = true,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  onReport: () => void;
  showReloadButton?: boolean;
  showReportButton?: boolean;
}) => (
  <Alert variant="destructive" className="my-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Something went wrong</AlertTitle>
    <AlertDescription className="mt-2">
      <p className="text-sm">{error?.message || 'An unexpected error occurred'}</p>

      {errorInfo?.componentStack && (
        <details className="mt-3 text-xs opacity-90">
          <summary className="cursor-pointer">Error details</summary>
          <pre className="mt-1 max-h-40 overflow-auto rounded bg-white/10 p-2">
            {errorInfo.componentStack}
          </pre>
        </details>
      )}

      <div className="mt-4 flex gap-3">
        {showReloadButton && (
          <Button variant="outline" onClick={onReset} size="sm">
            Try again
          </Button>
        )}
        {showReportButton && (
          <Button variant="default" onClick={onReport} size="sm">
            Report this issue
          </Button>
        )}
      </div>
    </AlertDescription>
  </Alert>
);

/**
 * An error boundary component that includes user feedback capabilities.
 *
 * @example
 * ```tsx
 * <FeedbackErrorBoundary
 *   showReportButton={true}
 *   autoShowReportDialog={false}
 *   reportDialogTitle="We're sorry, something went wrong"
 * >
 *   <MyComponent />
 * </FeedbackErrorBoundary>
 * ```
 */
export class FeedbackErrorBoundary extends Component<
  FeedbackErrorBoundaryProps,
  FeedbackErrorBoundaryState
> {
  constructor(props: FeedbackErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<FeedbackErrorBoundaryState> {
    logger.error('FeedbackErrorBoundary caught an error', error, {
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

    logger.error('FeedbackErrorBoundary caught an error', error, {
      errorDetails,
      location: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      timestamp: errorDetails.timestamp,
    });

    // Capture exception in PostHog for analytics
    captureException(error, {
      type: 'feedback_error_boundary',
      componentStack: errorInfo.componentStack,
      location: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      context: this.props.errorContext || {},
    });

    // Report error and store the event ID
    console.error('FeedbackErrorBoundary caught an error:', error, {
      extra: { componentStack: errorInfo?.componentStack, ...this.props.errorContext },
    });
    const eventId = null;

    this.setState({ error, errorInfo, eventId });

    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (e) {
        logger.error('Error in onError callback', e as Error);
      }
    }

    // Show report dialog automatically if configured
    if (this.props.autoShowReportDialog && eventId) {
      this.showReportDialog();
    }
  }

  private handleReset = (): void => {
    logger.info('Resetting error boundary');

    // Reset the error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
    });
  };

  /**
   * Shows the user feedback/report dialog
   */
  private showReportDialog = (): void => {
    const { eventId } = this.state;

    showUserReportDialog({
      eventId: eventId || undefined,
      title: this.props.reportDialogTitle || 'Report this error',
      subtitle:
        this.props.reportDialogSubtitle ||
        "We'd like to gather more information about what happened to fix this issue.",
    });
  };

  /**
   * Renders the fallback UI when an error occurs
   */
  private renderFallback(): ReactNode {
    const { error, errorInfo, eventId } = this.state;
    const { fallback, showReloadButton = true, showReportButton = true } = this.props;

    // Handle render prop fallback
    if (typeof fallback === 'function') {
      return fallback({
        error: error!,
        errorInfo,
        eventId,
        resetErrorBoundary: this.handleReset,
        showReportDialog: this.showReportDialog,
      });
    }

    // Handle React element fallback
    if (fallback) return fallback;

    // Default fallback UI with report button
    return (
      <DefaultFeedbackFallback
        error={error}
        errorInfo={errorInfo}
        onReset={this.handleReset}
        onReport={this.showReportDialog}
        showReloadButton={showReloadButton}
        showReportButton={showReportButton}
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

export default FeedbackErrorBoundary;
