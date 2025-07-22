import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';

import { AuthProvider } from '@/contexts/AuthContext/AuthProvider';
import { MetadataProvider } from '@/contexts/MetadataContext';
import FeedbackDialogProvider from '@/components/FeedbackDialogProvider';

import { queryClient } from '@/lib/queryClient';
import { setupAutomaticCacheCleaning } from '@/utils/cacheValidation';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Cache cleaning component that sets up automatic cleanup on navigation
 */
const CacheCleanupHandler: React.FC = () => {
  useEffect(() => {
    const cleanup = setupAutomaticCacheCleaning(queryClient);
    return cleanup;
  }, []);

  return null;
};

/**
 * Centralized provider wrapper for the entire application
 * Router is isolated from provider re-renders to prevent reconciliation interruption
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
        key="main-router"
      >
        <QueryClientProvider client={queryClient}>
          <CacheCleanupHandler />
          <AuthProvider>
            <MetadataProvider>
              <FeedbackDialogProvider />
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </MetadataProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};
