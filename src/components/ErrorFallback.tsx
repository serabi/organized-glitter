import { useToast } from '@/hooks/use-toast';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const { toast } = useToast();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
        <div className="mb-4 border-l-4 border-red-500 bg-red-50 p-4">
          <p className="font-medium">
            {error.name}: {error.message}
          </p>
          {import.meta.env.DEV && error.stack && (
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">{error.stack}</pre>
          )}
        </div>
        <p className="text-gray-700">
          Please try refreshing the page. If the problem persists, contact support with the error
          details below.
        </p>
        <div className="flex space-x-3 pt-4">
          <button
            onClick={resetErrorBoundary}
            className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Reload Page
          </button>
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(
                  `Error: ${error.name}: ${error.message}\n\n${error.stack}\n\nUser Agent: ${navigator.userAgent}\nURL: ${window.location.href}`
                );
                toast({ description: 'Error details copied to clipboard' });
              }
            }}
            className="rounded border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50"
          >
            Copy Error Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
