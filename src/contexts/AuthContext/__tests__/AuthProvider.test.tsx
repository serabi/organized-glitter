import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthProvider } from '../AuthProvider';
import { AuthContext } from '../context';
import { pb } from '@/lib/pocketbase';

// Mock PocketBase
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    authStore: {
      isValid: false,
      record: null,
      onChange: vi.fn(() => vi.fn()), // Returns unsubscribe function
      clear: vi.fn(),
    },
    collection: vi.fn(() => ({
      authWithPassword: vi.fn(),
      authWithOAuth2: vi.fn(),
    })),
  },
}));

// Mock analytics
vi.mock('@/services/analytics', () => ({
  analytics: {
    identifyUserWithContext: vi.fn(),
    auth: {
      signedOut: vi.fn(),
    },
  },
}));

const mockPb = pb as typeof pb & {
  authStore: {
    isValid: boolean;
    record: unknown;
    onChange: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };
  collection: ReturnType<typeof vi.fn>;
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockPb.authStore.isValid = false;
    mockPb.authStore.record = null;
  });

  const TestComponent = () => {
    const { user, isLoading } = React.useContext(AuthContext);
    return (
      <div>
        <div data-testid="user">{user ? user.id : 'null'}</div>
        <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      </div>
    );
  };

  it('should provide initial state when no user is authenticated', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
  });

  it('should provide user when authenticated', () => {
    // Mock authenticated state
    mockPb.authStore.isValid = true;
    mockPb.authStore.record = {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      collectionId: 'users',
      collectionName: 'users',
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('test-user-id');
  });
});
