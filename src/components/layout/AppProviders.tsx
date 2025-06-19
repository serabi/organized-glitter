import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';

import { AuthProvider } from '@/contexts/AuthContext/AuthProvider';
import { MetadataProvider } from '@/contexts/MetadataContext';
import FeedbackDialogProvider from '@/components/FeedbackDialogProvider';
import PerformancePrefetcher from '@/components/PerformancePrefetcher';

import { queryClient } from '@/lib/queryClient';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Centralized provider wrapper for the entire application
 * Handles all context providers and global configurations
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MetadataProvider>
            <FeedbackDialogProvider />
            <TooltipProvider>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                {children}
                <Toaster />
                <PerformancePrefetcher />
              </BrowserRouter>
            </TooltipProvider>
          </MetadataProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};
