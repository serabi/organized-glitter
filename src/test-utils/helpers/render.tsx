import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext/AuthProvider';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  queryClient?: QueryClient;
}

/**
 * Create a test query client with sensible defaults for testing
 */
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

/**
 * Test wrapper component that provides all necessary contexts
 */
const TestProviders: React.FC<{
  children: React.ReactNode;
  initialRoute?: string;
  queryClient?: QueryClient;
}> = ({ children, queryClient = createTestQueryClient() }) => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <div data-testid="test-app">{children}</div>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

/**
 * Custom render function that wraps components with necessary providers
 */
const customRender = (ui: ReactElement, options: CustomRenderOptions = {}) => {
  const { initialRoute, queryClient, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders initialRoute={initialRoute} queryClient={queryClient}>
      {children}
    </TestProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Render a component with authentication context
 */
export const renderWithAuth = (
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'user'> = {}
) => {
  return customRender(ui, { ...options });
};

/**
 * Render a component without authentication (logged out state)
 */
export const renderWithoutAuth = (
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'user'> = {}
) => {
  return customRender(ui, { ...options });
};

/**
 * Render a component with a specific route
 */
export const renderWithRoute = (
  ui: ReactElement,
  route: string,
  options: Omit<CustomRenderOptions, 'initialRoute'> = {}
) => {
  return customRender(ui, { ...options, initialRoute: route });
};

/**
 * Render a component with a custom query client
 */
export const renderWithQueryClient = (
  ui: ReactElement,
  queryClient: QueryClient,
  options: Omit<CustomRenderOptions, 'queryClient'> = {}
) => {
  return customRender(ui, { ...options, queryClient });
};

// Re-export specific exports from testing library (avoiding default export conflicts)
export {
  render as originalRender,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
  renderHook,
  within,
  getByRole,
  getByText,
  getByTestId,
  queryByRole,
  queryByText,
  queryByTestId,
  findByRole,
  findByText,
  findByTestId,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';

// Export our custom render as the default
export { customRender as render };

// Export additional utilities
export { TestProviders, createTestQueryClient, type CustomRenderOptions };
