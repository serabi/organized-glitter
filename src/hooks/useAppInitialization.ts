import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { setupErrorHandler } from '@/utils/errorHandler';
import { setupGlobalAuthClear } from '@/utils/auth';

type ToastType = 'error' | 'warning' | 'success' | 'info';

/**
 * Application initialization hook that sets up global services
 * Handles error handlers, auth helpers, and emergency failsafes
 */
export const useAppInitialization = (): void => {
  const { toast } = useToast();

  // Emergency failsafe for app-loaded event
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      console.warn('🚨 Emergency timeout: Dispatching app-loaded event after 20 seconds');
      window.dispatchEvent(new CustomEvent('app-loaded'));
    }, 20000);

    const handleAppLoaded = () => {
      clearTimeout(emergencyTimeout);
    };

    window.addEventListener('app-loaded', handleAppLoaded);

    return () => {
      clearTimeout(emergencyTimeout);
      window.removeEventListener('app-loaded', handleAppLoaded);
    };
  }, []);

  // Setup global services
  useEffect(() => {
    // Setup global auth clear function for debugging
    setupGlobalAuthClear();

    // Setup global error handler with toast notifications
    setupErrorHandler((message: string, type: ToastType) => {
      switch (type) {
        case 'error':
          toast({
            variant: 'destructive',
            title: 'Error',
            description: message,
          });
          break;
        case 'warning':
          toast({
            title: 'Warning',
            description: message,
          });
          break;
        case 'success':
          toast({
            title: 'Success',
            description: message,
          });
          break;
        case 'info':
        default:
          toast({
            title: 'Info',
            description: message,
          });
      }
    });

    // Handle unhandled promise rejections (chunk loading errors)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (import.meta.env.DEV) {
        console.error('Unhandled rejection:', event.reason);
      }

      // For chunk loading errors, reload the page
      const reason = event.reason?.message || '';
      if (reason.includes('text/html') || reason.includes('MIME type')) {
        if (import.meta.env.DEV) {
          console.log('Chunk loading error detected, reloading page...');
        }
        setTimeout(() => window.location.reload(), 1000);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [toast]);
};
