/**
 * Simplified test utilities for Organized Glitter
 * 
 * Provides minimal, focused testing infrastructure without complex abstractions.
 * Focuses on user-facing functionality and realistic test scenarios.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type { ProjectType, ProjectStatus } from '@/types/project';

// Re-export commonly used testing functions
export { 
  screen, 
  waitFor, 
  fireEvent, 
  cleanup, 
  act, 
  renderHook,
  within 
} from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Options for rendering components with providers
 */
interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  user?: Partial<{
    id: string;
    email: string;
    username: string;
    verified: boolean;
  }>;
  queryClient?: QueryClient;
}

/**
 * Create a simple test query client with fast, non-retrying queries
 */
export const createTestQueryClient = (): QueryClient => {
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
 * Simple test wrapper that provides essential contexts
 */
const TestWrapper: React.FC<{
  children: React.ReactNode;
  queryClient: QueryClient;
  initialRoute?: string;
}> = ({ children, queryClient, initialRoute = '/' }) => {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
};

/**
 * Render a component with all necessary providers
 * 
 * @param ui - React component to render
 * @param options - Render options including initial route and user state
 * @returns Render result with additional utilities
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult => {
  const { 
    queryClient = createTestQueryClient(), 
    initialRoute = '/',
    ...renderOptions 
  } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper queryClient={queryClient} initialRoute={initialRoute}>
      {children}
    </TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Create mock project data for testing
 */
export const createMockProject = (overrides: Partial<ProjectType> = {}): ProjectType => {
  return {
    id: `project-${Math.random().toString(36).substring(2, 11)}`,
    title: 'Test Diamond Painting',
    status: 'wishlist' as ProjectStatus,
    company: 'Test Company',
    artist: 'Test Artist',
    width: 30,
    height: 40,
    drillShape: 'round',
    totalDiamonds: 25000,
    sourceUrl: 'https://example.com/project',
    kit_category: 'full',
    generalNotes: 'Test notes',
    datePurchased: undefined,
    dateReceived: undefined,
    dateStarted: undefined,
    dateCompleted: undefined,
    imageUrl: undefined,
    userId: 'test-user-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tagNames: ['test'],
    ...overrides,
  };
};

/**
 * Create mock user data for testing
 */
export const createMockUser = (overrides: Partial<{
  id: string;
  email: string;
  username: string;
  verified: boolean;
  created: string;
  updated: string;
}> = {}) => {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    verified: true,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Simple PocketBase mock for testing
 */
export const createMockPocketBase = () => {
  const mockCollection = vi.fn(() => ({
    getOne: vi.fn(),
    getList: vi.fn(),
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }));

  const mockAuthStore = {
    isValid: true,
    model: createMockUser(),
    token: 'mock-token',
    onChange: vi.fn(() => vi.fn()),
    clear: vi.fn(),
    save: vi.fn(),
  };

  return {
    collection: mockCollection,
    authStore: mockAuthStore,
    files: {
      getURL: vi.fn((_record, filename) => `https://example.com/${filename}`),
      getToken: vi.fn().mockResolvedValue('mock-file-token'),
    },
  };
};

/**
 * Create multiple mock projects with different statuses
 */
export const createMockProjects = (count: number = 3): ProjectType[] => {
  const statuses: ProjectStatus[] = ['wishlist', 'purchased', 'stash', 'progress', 'completed'];
  
  return Array.from({ length: count }, (_, index) =>
    createMockProject({
      id: `project-${index + 1}`,
      title: `Test Project ${index + 1}`,
      status: statuses[index % statuses.length],
    })
  );
};

/**
 * Create a mock file for testing file uploads
 */
export const createMockFile = (
  name: string = 'test.jpg',
  type: string = 'image/jpeg',
  _size: number = 1024
): File => {
  return new File(['test content'], name, { type, lastModified: Date.now() });
};

/**
 * Render a hook with all necessary providers
 * 
 * @param hook - Hook function to test
 * @param options - Options including initial route and query client
 * @returns renderHook result with providers
 */
export const renderHookWithProviders = <T,>(
  hook: () => T,
  options: RenderWithProvidersOptions = {}
) => {
  const { 
    queryClient = createTestQueryClient(), 
    initialRoute = '/',
  } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper queryClient={queryClient} initialRoute={initialRoute}>
      {children}
    </TestWrapper>
  );

  return renderHook(hook, { wrapper: Wrapper });
};

/**
 * Wait for async operations to complete in tests
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));