import { vi } from 'vitest';

interface UserRecordModel {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  created: string;
  updated: string;
}

/**
 * Mock PocketBase client for testing
 */
export const createMockPocketBase = () => {
  const mockCollection = vi.fn(() => ({
    // CRUD operations
    getOne: vi.fn(),
    getList: vi.fn(),
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),

    // Realtime subscriptions
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),

    // Authentication
    authWithPassword: vi.fn(),
    authRefresh: vi.fn(),

    // File uploads
    getFileUrl: vi.fn(),

    // Filtering and sorting
    getFirstListItem: vi.fn(),
  }));

  const mockFiles = {
    getFileUrl: vi.fn((_record: any, filename: string) => `https://example.com/${filename}`),
    getToken: vi.fn(),
  };

  const mockAuthStore = {
    // Auth state
    isValid: true,
    token: 'mock-jwt-token',
    model: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      verified: true,
      created: '2024-01-01 10:00:00',
      updated: '2024-01-01 10:00:00',
    } as UserRecordModel,

    // Auth methods
    save: vi.fn(),
    clear: vi.fn(),
    onChange: vi.fn((callback: (token: string, model: any) => void, fireImmediately?: boolean) => {
      if (fireImmediately) {
        callback(mockAuthStore.token, mockAuthStore.model);
      }
      return vi.fn(); // unsubscribe function
    }),
  };

  const mockAuth = {
    // Auth state
    isValid: false,
    token: '',
    model: null as UserRecordModel | null,

    // Auth methods
    store: mockAuthStore,

    // Auth operations
    authWithPassword: vi.fn(),
    authWithOAuth2: vi.fn(),
    authRefresh: vi.fn(),
    logout: vi.fn(),

    // User management
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
    requestVerification: vi.fn(),
    confirmVerification: vi.fn(),
    requestEmailChange: vi.fn(),
    confirmEmailChange: vi.fn(),

    // Profile management
    listAuthMethods: vi.fn(),
    requestPasswordResetByEmail: vi.fn(),
  };

  const mockPocketBase = {
    files: mockFiles,
    authStore: mockAuthStore,

    // Auth collection shorthand
    collection: vi.fn((name: string) => {
      const baseCollection = mockCollection();
      if (name === 'users') {
        return {
          ...baseCollection,
          authWithPassword: mockAuth.authWithPassword,
          authRefresh: mockAuth.authRefresh,
          requestPasswordReset: mockAuth.requestPasswordReset,
          confirmPasswordReset: mockAuth.confirmPasswordReset,
        };
      }
      return baseCollection;
    }),

    // Settings
    beforeSend: vi.fn(),
    afterSend: vi.fn(),

    // Health check
    health: {
      check: vi.fn(),
    },

    // Admin authentication
    admins: {
      authWithPassword: vi.fn(),
      authRefresh: vi.fn(),
    },
  };

  return {
    mockPocketBase,
    mockCollection,
    mockFiles,
    mockAuth,
    mockAuthStore,
  };
};

/**
 * Mock successful responses for common operations
 */
export const mockSuccessfulResponses = () => {
  return {
    // Project responses
    projectList: {
      page: 1,
      perPage: 30,
      totalItems: 2,
      totalPages: 1,
      items: [
        {
          id: 'project-1',
          title: 'Test Project 1',
          status: 'wishlist',
          created: '2024-01-01 10:00:00',
          updated: '2024-01-01 10:00:00',
        },
        {
          id: 'project-2',
          title: 'Test Project 2',
          status: 'progress',
          created: '2024-01-02 10:00:00',
          updated: '2024-01-02 10:00:00',
        },
      ],
    },

    // Single project response
    project: {
      id: 'project-1',
      title: 'Test Project',
      status: 'wishlist',
      company: 'Test Company',
      artist: 'Test Artist',
      created: '2024-01-01 10:00:00',
      updated: '2024-01-01 10:00:00',
    },

    // User authentication response
    authResponse: {
      token: 'mock-jwt-token',
      record: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        verified: true,
        created: '2024-01-01 10:00:00',
        updated: '2024-01-01 10:00:00',
      },
    },

    // Tag responses
    tagList: {
      page: 1,
      perPage: 30,
      totalItems: 3,
      totalPages: 1,
      items: [
        { id: 'tag-1', name: 'fantasy', created: '2024-01-01 10:00:00' },
        { id: 'tag-2', name: 'nature', created: '2024-01-01 10:00:00' },
        { id: 'tag-3', name: 'abstract', created: '2024-01-01 10:00:00' },
      ],
    },
  };
};

/**
 * Mock error responses for testing error handling
 */
export const mockErrorResponses = () => {
  return {
    notFound: {
      status: 404,
      message: "The requested resource wasn't found.",
      data: {},
    },

    unauthorized: {
      status: 401,
      message: 'The request requires valid record authorization token to be set.',
      data: {},
    },

    validationError: {
      status: 400,
      message: 'Failed to create record.',
      data: {
        title: {
          code: 'validation_required',
          message: 'Missing required value.',
        },
      },
    },

    serverError: {
      status: 500,
      message: 'Something went wrong while processing your request.',
      data: {},
    },
  };
};

/**
 * Setup PocketBase mocks with common default behaviors
 */
export const setupPocketBaseMocks = () => {
  const { mockPocketBase, mockCollection, mockAuth, mockAuthStore } = createMockPocketBase();
  const successResponses = mockSuccessfulResponses();

  // Setup default successful responses
  const collectionInstance = mockCollection();
  collectionInstance.getList.mockResolvedValue(successResponses.projectList);
  collectionInstance.getOne.mockResolvedValue(successResponses.project);
  collectionInstance.create.mockResolvedValue(successResponses.project);
  collectionInstance.update.mockResolvedValue(successResponses.project);
  collectionInstance.delete.mockResolvedValue(true);
  collectionInstance.getFullList.mockResolvedValue(successResponses.projectList.items);

  // Setup auth defaults
  mockAuth.authWithPassword.mockResolvedValue(successResponses.authResponse);
  mockAuthStore.isValid = true;
  mockAuthStore.token = 'mock-jwt-token';
  mockAuthStore.model = successResponses.authResponse.record;

  return {
    mockPocketBase,
    mockCollection,
    mockAuth,
    mockAuthStore,
    successResponses,
    errorResponses: mockErrorResponses(),
  };
};

/**
 * Reset all PocketBase mocks
 */
export const resetPocketBaseMocks = (mocks: ReturnType<typeof createMockPocketBase>) => {
  Object.values(mocks).forEach(mock => {
    if (typeof mock === 'object' && mock !== null) {
      Object.values(mock).forEach(method => {
        if (vi.isMockFunction(method)) {
          method.mockReset();
        }
      });
    }
  });
};
