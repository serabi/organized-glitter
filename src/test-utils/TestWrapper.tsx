/**
 * TestWrapper component - extracted for React Fast Refresh optimization
 * @author @serabi
 * @created 2025-08-02
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/**
 * Simple test wrapper that provides essential contexts
 */
const TestWrapper: React.FC<{
  children: React.ReactNode;
  queryClient: QueryClient;
  initialRoute?: string;
}> = ({ children, queryClient, initialRoute = '/' }) => {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

export default TestWrapper;
