/**
 * Base testing utilities for PocketBase service layer tests
 * @author @serabi
 * @created 2025-07-16
 */

import { vi, type MockedFunction } from 'vitest';
import type { MockPocketBaseCollection, MockLogger } from '@/types/test-utils';

/**
 * Extended mock PocketBase collection with additional service methods
 */
export interface ServiceMockCollection extends MockPocketBaseCollection {
  getFullList: MockedFunction<(options?: Record<string, unknown>) => Promise<unknown[]>>;
  getFirstListItem: MockedFunction<
    (filter: string, options?: Record<string, unknown>) => Promise<unknown>
  >;
  subscribe: MockedFunction<
    (topic: string, callback: (data: unknown) => void, options?: Record<string, unknown>) => void
  >;
  unsubscribe: MockedFunction<(topic?: string) => void>;
}

/**
 * Mock PocketBase instance with enhanced service methods
 */
export interface ServiceMockPocketBase {
  collection: MockedFunction<(name: string) => ServiceMockCollection>;
  filter: MockedFunction<(query: string, params: Record<string, unknown>) => string>;
  files: {
    getURL: MockedFunction<
      (
        record: Record<string, unknown>,
        filename: string,
        options?: Record<string, unknown>
      ) => string
    >;
    getToken: MockedFunction<(options?: Record<string, unknown>) => Promise<string>>;
  };
  authStore: {
    isValid: boolean;
    model: {
      id: string;
      email: string;
      username: string;
      verified: boolean;
    } | null;
    token: string;
    onChange: MockedFunction<(callback: (token: string, model: unknown) => void) => () => void>;
    clear: MockedFunction<() => void>;
    save: MockedFunction<(token: string, model: unknown) => void>;
  };
  send: MockedFunction<(path: string, options?: Record<string, unknown>) => Promise<unknown>>;
  realtime: {
    subscribe: MockedFunction<
      (topic: string, callback: (data: unknown) => void, options?: Record<string, unknown>) => void
    >;
    unsubscribe: MockedFunction<(topic?: string) => void>;
    isConnected: boolean;
  };
}

/**
 * Base class for service testing with common utilities
 */
export class ServiceTestBase {
  protected mockCollection: ServiceMockCollection;
  protected mockPb: ServiceMockPocketBase;
  protected mockLogger: MockLogger;

  constructor() {
    this.mockCollection = this.createMockCollection();
    this.mockPb = this.createMockPocketBase();
    this.mockLogger = this.createMockLogger();
  }

  /**
   * Creates a comprehensive mock collection with all common methods
   */
  protected createMockCollection(): ServiceMockCollection {
    return {
      getOne: vi.fn(),
      getList: vi.fn(),
      getFullList: vi.fn(),
      getFirstListItem: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getURL: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
  }

  /**
   * Creates a comprehensive mock PocketBase instance
   */
  protected createMockPocketBase(): ServiceMockPocketBase {
    return {
      collection: vi.fn((_name: string) => this.mockCollection),
      filter: vi.fn((query, params) =>
        query.replace(/\{:(\w+)\}/g, (_, key) => `"${params[key]}"`)
      ),
      files: {
        getURL: vi.fn((record, filename, options) => {
          const baseUrl = `https://data.organizedglitter.app/api/files/${record.collectionName || 'projects'}/${record.id}/${filename}`;
          if (options?.thumb) {
            return `${baseUrl}?thumb=${options.thumb}`;
          }
          return baseUrl;
        }),
        getToken: vi.fn().mockResolvedValue('mock-file-token'),
      },
      authStore: {
        isValid: true,
        model: {
          id: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          verified: true,
        },
        token: 'mock-auth-token',
        onChange: vi.fn().mockReturnValue(() => {}),
        clear: vi.fn(),
        save: vi.fn(),
      },
      send: vi.fn(),
      realtime: {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        isConnected: true,
      },
    };
  }

  /**
   * Creates a mock logger for secure logging
   */
  protected createMockLogger(): MockLogger {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      criticalError: vi.fn(),
    };
  }

  /**
   * Resets all mocks to their initial state
   */
  public resetAllMocks(): void {
    vi.clearAllMocks();

    // Reset collection methods
    Object.values(this.mockCollection).forEach(mockFn => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        (mockFn as { mockReset: () => void }).mockReset();
      }
    });

    // Reset PocketBase methods
    this.mockPb.collection.mockReturnValue(this.mockCollection);
    this.mockPb.filter.mockImplementation((query, params) =>
      query.replace(/\{:(\w+)\}/g, (_, key) => `"${params[key]}"`)
    );

    // Reset file methods
    this.mockPb.files.getURL.mockImplementation((record, filename, options) => {
      const baseUrl = `https://data.organizedglitter.app/api/files/${record.collectionName || 'projects'}/${record.id}/${filename}`;
      if (options?.thumb) {
        return `${baseUrl}?thumb=${options.thumb}`;
      }
      return baseUrl;
    });
    this.mockPb.files.getToken.mockResolvedValue('mock-file-token');

    // Reset auth store
    this.mockPb.authStore.isValid = true;
    this.mockPb.authStore.model = {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      verified: true,
    };
    this.mockPb.authStore.token = 'mock-auth-token';
  }

  /**
   * Creates a mock error for testing error scenarios
   */
  public createMockError(message: string, status?: number): Error {
    const error = new Error(message);
    if (status) {
      (error as Error & { status: number }).status = status;
    }
    return error;
  }

  /**
   * Creates a mock PocketBase response with pagination
   */
  public createMockListResponse<T>(items: T[], page = 1, perPage = 30, totalItems?: number) {
    const total = totalItems ?? items.length;
    return {
      page,
      perPage,
      totalItems: total,
      totalPages: Math.ceil(total / perPage),
      items,
    };
  }

  /**
   * Simulates network delay for async operations
   */
  public async simulateNetworkDelay(ms = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates a mock authenticated user context
   */
  public setMockUser(
    userData?: Partial<{ id: string; email: string; username: string; verified: boolean }>
  ): void {
    this.mockPb.authStore.model = {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      verified: true,
      ...userData,
    };
    this.mockPb.authStore.isValid = true;
    this.mockPb.authStore.token = 'mock-auth-token';
  }

  /**
   * Sets the mock to simulate an unauthenticated state
   */
  public setUnauthenticatedUser(): void {
    this.mockPb.authStore.model = null;
    this.mockPb.authStore.isValid = false;
    this.mockPb.authStore.token = '';
  }

  /**
   * Mocks field mapping for camelCase to snake_case conversion
   */
  public mockFieldMapping(camelCaseData: Record<string, unknown>): Record<string, unknown> {
    const snakeCaseData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(camelCaseData)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeCaseData[snakeKey] = value;
    }

    return snakeCaseData;
  }

  /**
   * Creates a mock subscription for real-time testing
   */
  public createMockSubscription(callback: (data: unknown) => void): () => void {
    const unsubscribe = vi.fn();
    this.mockCollection.subscribe.mockImplementation((_topic, cb) => {
      // Store callback for later triggering
      (cb as typeof callback)(callback);
      return unsubscribe;
    });
    return unsubscribe;
  }

  /**
   * Triggers a mock real-time event
   */
  public triggerRealtimeEvent(data: unknown): void {
    // This would typically be called to simulate a real-time update
    const subscriptions = this.mockCollection.subscribe.mock.calls;
    subscriptions.forEach(([, callback]) => {
      if (typeof callback === 'function') {
        callback(data);
      }
    });
  }
}

/**
 * Common test data patterns for services
 */
export const TestPatterns = {
  /**
   * Standard date strings for testing
   */
  dates: {
    past: '2024-01-01T00:00:00Z',
    present: '2024-07-16T12:00:00Z',
    future: '2024-12-31T23:59:59Z',
  },

  /**
   * Common filter patterns
   */
  filters: {
    user: (userId: string) => `user = "${userId}"`,
    status: (status: string) => `status = "${status}"`,
    dateRange: (start: string, end: string) => `created >= "${start}" && created <= "${end}"`,
    search: (term: string) => `title ~ "%${term}%" || description ~ "%${term}%"`,
  },

  /**
   * Common sort patterns
   */
  sorts: {
    newest: '-created',
    oldest: 'created',
    updated: '-updated',
    alphabetical: 'title',
  },

  /**
   * Standard pagination settings
   */
  pagination: {
    small: { page: 1, perPage: 10 },
    medium: { page: 1, perPage: 30 },
    large: { page: 1, perPage: 100 },
  },
} as const;
