import React, { ErrorInfo } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';

/**
 * Error boundary specifically for project content sections
 * Isolates errors in project displays from affecting the rest of the UI
 */
interface ProjectContentErrorBoundaryProps {
  children: React.ReactNode;
  projectId?: string;
}

export const ProjectContentErrorBoundary: React.FC<ProjectContentErrorBoundaryProps> = ({
  children,
  projectId,
}) => {
  const handleProjectError = (error: Error, errorInfo: ErrorInfo) => {
    logger.error('Error in project content component', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo?.componentStack,
      projectId,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
    });
  };

  const handleReportIssue = () => {
    const subject = encodeURIComponent('Error in Project Content');
    const body = encodeURIComponent(
      `Project ID: ${projectId || 'N/A'}\n` +
        `URL: ${window.location.href}\n` +
        `Error: Please describe what you were doing when the error occurred.`
    );
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  return (
    <ErrorBoundary
      onError={handleProjectError}
      errorContext={{
        component: 'ProjectContent',
        projectId,
        location: window.location.pathname,
      }}
      fallback={({ resetErrorBoundary }) => (
        <div className="mx-auto max-w-2xl rounded-lg border border-border bg-muted/50 p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                Unable to display project content
              </h3>
              <p className="text-muted-foreground">
                We encountered an issue while trying to display this project's content. Our team has
                been notified.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => resetErrorBoundary()}
                className="flex-1 sm:flex-none"
              >
                Try again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1 sm:flex-none"
              >
                Go back
              </Button>
              <Button variant="outline" onClick={handleReportIssue} className="flex-1 sm:flex-none">
                Report issue
              </Button>
            </div>

            <details className="border-t border-border pt-2">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Technical details
              </summary>
              <div className="mt-2 overflow-auto rounded-md bg-background p-3 font-mono text-xs">
                <div>Project ID: {projectId || 'Not available'}</div>
                <div className="mt-1">Path: {window.location.pathname}</div>
                <div className="mt-1 text-xs opacity-70">
                  Error ID: {Math.random().toString(36).substring(2, 10)}
                </div>
              </div>
            </details>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Error boundary for forms to prevent form errors from crashing the application
 * Provides a user-friendly way to recover from form errors
 */
interface FormErrorBoundaryProps {
  children: React.ReactNode;
  formName?: string;
  formId?: string;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const FormErrorBoundary: React.FC<FormErrorBoundaryProps> = ({
  children,
  formName = 'Form',
  formId,
  onReset,
  onError,
}) => {
  const handleFormError = (error: Error, errorInfo: ErrorInfo) => {
    const errorContext = {
      form: formName,
      formId,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo?.componentStack,
    };

    logger.error(`Error in ${formName}`, errorContext);

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (e) {
        logger.error('Error in form error handler', e as Error);
      }
    }
  };

  const handleReset = (resetBoundary: () => void) => {
    try {
      if (onReset) onReset();
    } catch (e) {
      logger.error('Error during form reset', e as Error);
    } finally {
      resetBoundary();
    }
  };

  const handleReportIssue = () => {
    const subject = encodeURIComponent(`Form Error - ${formName}`);
    const body = encodeURIComponent(
      `Form: ${formName}\n` +
        `Form ID: ${formId || 'N/A'}\n` +
        `URL: ${window.location.href}\n` +
        `Error: Please describe what you were doing when the error occurred.`
    );
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  return (
    <ErrorBoundary
      onError={handleFormError}
      errorContext={{
        component: 'Form',
        form: formName,
        formId,
        location: window.location.pathname,
      }}
      fallback={({ resetErrorBoundary }) => (
        <div className="mx-auto max-w-2xl rounded-lg border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-destructive">Form Error</h3>
              <p className="text-destructive-foreground">
                Something went wrong with this form. Your input has not been lost.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => handleReset(resetErrorBoundary)}
                className="flex-1 sm:flex-none"
              >
                Reset Form
              </Button>
              <Button variant="outline" onClick={handleReportIssue} className="flex-1 sm:flex-none">
                Report Issue
              </Button>
            </div>

            <details className="border-t border-border pt-2">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Technical details
              </summary>
              <div className="mt-2 overflow-auto rounded-md bg-background p-3 font-mono text-xs">
                <div>Form: {formName}</div>
                {formId && <div className="mt-1">Form ID: {formId}</div>}
                <div className="mt-1">Path: {window.location.pathname}</div>
                <div className="mt-1 text-xs opacity-70">
                  Error ID: {Math.random().toString(36).substring(2, 10)}
                </div>
              </div>
            </details>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Error boundary for dashboard components
 * Prevents dashboard widget failures from breaking the entire dashboard
 */
interface DashboardItemErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  widgetId?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const DashboardItemErrorBoundary: React.FC<DashboardItemErrorBoundaryProps> = ({
  children,
  title = 'Dashboard item',
  widgetId,
  onError,
}) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    const errorContext = {
      component: 'DashboardItem',
      title,
      widgetId,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo?.componentStack,
    };

    logger.error(`Error in dashboard item: ${title}`, errorContext);

    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (e) {
        logger.error('Error in dashboard item error handler', e as Error);
      }
    }
  };

  const handleReportIssue = () => {
    const subject = encodeURIComponent(`Dashboard Widget Error - ${title}`);
    const body = encodeURIComponent(
      `Widget: ${title}\n` +
        `Widget ID: ${widgetId || 'N/A'}\n` +
        `URL: ${window.location.href}\n` +
        `Error: Please describe what you were doing when the error occurred.`
    );
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  return (
    <ErrorBoundary
      onError={handleError}
      errorContext={{
        component: 'DashboardItem',
        title,
        widgetId,
        location: window.location.pathname,
      }}
      fallback={({ resetErrorBoundary }) => (
        <div className="flex h-full flex-col items-center justify-center p-4 text-center">
          <div className="max-w-xs space-y-3">
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-foreground">{title} Unavailable</h3>
              <p className="text-sm text-muted-foreground">
                This widget couldn't be loaded. We've been notified about the issue.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetErrorBoundary()}
                className="text-xs"
              >
                Reload Widget
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReportIssue} className="text-xs">
                Report Issue
              </Button>
            </div>

            <details className="pt-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Technical Details
              </summary>
              <div className="mt-1 overflow-auto rounded bg-background p-2 font-mono text-xs">
                <div>Widget: {title}</div>
                {widgetId && <div>ID: {widgetId}</div>}
                <div className="mt-1 text-xs opacity-70">
                  Error ID: {Math.random().toString(36).substring(2, 8)}
                </div>
              </div>
            </details>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Error boundary for image components
 * Handles image loading failures gracefully
 */
import FallbackImage from '@/components/projects/FallbackImage';

interface ImageErrorBoundaryProps {
  children: React.ReactNode;
  alt?: string;
  originalUrl?: string;
  className?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const ImageErrorBoundary: React.FC<ImageErrorBoundaryProps> = ({
  children,
  alt = 'Image',
  originalUrl,
  className = '',
  onError,
}) => {
  const handleImageError = (error: Error, errorInfo: ErrorInfo) => {
    const errorContext = {
      component: 'Image',
      alt,
      originalUrl,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo?.componentStack,
    };

    logger.error('Error loading image', errorContext);

    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (e) {
        logger.error('Error in image error handler', e as Error);
      }
    }
  };

  return (
    <ErrorBoundary
      onError={handleImageError}
      errorContext={{
        component: 'Image',
        alt,
        originalUrl,
        location: window.location.pathname,
      }}
      fallback={({ resetErrorBoundary }) => (
        <div className={`group relative ${className}`}>
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 p-4 text-center">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Couldn't load image</div>
              {originalUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    resetErrorBoundary();
                    // Force a cache-busting reload
                    if (originalUrl) {
                      const img = new Image();
                      img.src = originalUrl.includes('?')
                        ? `${originalUrl}&_t=${Date.now()}`
                        : `${originalUrl}?_t=${Date.now()}`;
                    }
                  }}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
          <FallbackImage alt={alt} originalUrl={originalUrl} className={className} />
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * OG-91 Phase 3: Overview-specific error boundary with cache refresh capability
 * Provides graceful degradation for overview page component errors
 */
interface OverviewErrorBoundaryProps {
  children: React.ReactNode;
  onCacheRefresh?: () => void;
  hasInfrastructureError?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const OverviewErrorBoundary: React.FC<OverviewErrorBoundaryProps> = ({
  children,
  onCacheRefresh,
  hasInfrastructureError = false,
  onError,
}) => {
  const handleOverviewError = (error: Error, errorInfo: ErrorInfo) => {
    const errorContext = {
      component: 'Overview',
      hasInfrastructureError,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo?.componentStack,
    };

    logger.error('Error in overview component', errorContext);

    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (e) {
        logger.error('Error in overview error handler', e as Error);
      }
    }
  };

  const handleReportIssue = () => {
    const subject = encodeURIComponent('Overview Page Error');
    const body = encodeURIComponent(
      `URL: ${window.location.href}\n` +
        `Infrastructure Error: ${hasInfrastructureError ? 'Yes' : 'No'}\n` +
        `Timestamp: ${new Date().toISOString()}\n` +
        `Error: Please describe what you were doing when the error occurred.`
    );
    window.open(`mailto:support@organizedglitter.app?subject=${subject}&body=${body}`);
  };

  return (
    <ErrorBoundary
      onError={handleOverviewError}
      errorContext={{
        component: 'Overview',
        hasInfrastructureError,
        location: window.location.pathname,
      }}
      fallback={({ resetErrorBoundary }) => (
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <svg
                className="h-8 w-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Something went wrong
              </h2>
              <p className="mx-auto max-w-md text-gray-600 dark:text-gray-400">
                {hasInfrastructureError
                  ? "We're experiencing server issues. Your data is safe and we're working to restore normal service."
                  : 'There was an unexpected error loading your overview. Please try again.'}
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => resetErrorBoundary()} className="px-6 py-2">
                Try Again
              </Button>
              {onCacheRefresh && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onCacheRefresh();
                    resetErrorBoundary();
                  }}
                  className="px-6 py-2"
                >
                  Clear Cache & Retry
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/dashboard')}
                className="px-6 py-2"
              >
                Go to Dashboard
              </Button>
            </div>
            <div className="flex flex-col justify-center gap-3 text-sm sm:flex-row">
              <button
                onClick={handleReportIssue}
                className="text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Report this issue
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Refresh page
              </button>
            </div>
            {hasInfrastructureError && (
              <div className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Server Status:</strong> We're aware of the issue and working to resolve
                  it. You can check status updates at our support channels.
                </p>
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Error ID: {Date.now().toString(36)} • Time: {new Date().toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};
