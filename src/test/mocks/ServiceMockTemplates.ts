/**
 * Standardized mock templates for service testing
 * @author @serabi
 * @created 2025-07-16
 */

import { vi } from 'vitest';
import type { ServiceMockCollection, ServiceMockPocketBase } from '../ServiceTestBase';
import { ProjectFactory, TagFactory, ErrorScenarioFactory } from '../factories/ServiceDataFactory';
import type { ProjectType } from '@/types/project';
import type { Tag } from '@/types/tag';

/**
 * Template for creating standardized service mocks
 */
export class ServiceMockTemplates {
  /**
   * Creates a successful CRUD operation mock set
   */
  static createSuccessfulCrudMocks(collection: ServiceMockCollection) {
    // GET operations
    collection.getOne.mockImplementation(async (id: string) => {
      return ProjectFactory({ id });
    });

    collection.getList.mockImplementation(async (page = 1, perPage = 30, options = {}) => {
      const items = Array.from({ length: Math.min(perPage, 10) }, (_, index) =>
        ProjectFactory({ id: `item-${page}-${index + 1}` })
      );

      return {
        page,
        perPage,
        totalItems: 100,
        totalPages: Math.ceil(100 / perPage),
        items,
      };
    });

    collection.getFullList.mockImplementation(async () => {
      return Array.from({ length: 5 }, (_, index) =>
        ProjectFactory({ id: `full-item-${index + 1}` })
      );
    });

    collection.getFirstListItem.mockImplementation(async (filter: string) => {
      return ProjectFactory({ id: 'first-item' });
    });

    // CUD operations
    collection.create.mockImplementation(async (data: Record<string, unknown>) => {
      return ProjectFactory({
        id: 'new-item-id',
        ...data,
      });
    });

    collection.update.mockImplementation(async (id: string, data: Record<string, unknown>) => {
      return ProjectFactory({
        id,
        ...data,
        updatedAt: new Date().toISOString(),
      });
    });

    collection.delete.mockResolvedValue(true);

    // Utility operations
    collection.getURL.mockImplementation((record, filename) => {
      return `https://data.organizedglitter.app/api/files/projects/${record.id}/${filename}`;
    });

    // Real-time operations
    collection.subscribe.mockImplementation((topic, callback) => {
      return vi.fn(); // Return unsubscribe function
    });

    collection.unsubscribe.mockImplementation(() => {});
  }

  /**
   * Creates error scenario mocks
   */
  static createErrorScenarioMocks(collection: ServiceMockCollection) {
    collection.getOne.mockRejectedValue(ErrorScenarioFactory.notFoundError('Project'));
    collection.getList.mockRejectedValue(ErrorScenarioFactory.networkTimeout());
    collection.create.mockRejectedValue(
      ErrorScenarioFactory.validationError('title', 'Required field')
    );
    collection.update.mockRejectedValue(ErrorScenarioFactory.permissionError());
    collection.delete.mockRejectedValue(ErrorScenarioFactory.serverError());
  }

  /**
   * Creates partial failure mocks (some operations succeed, others fail)
   */
  static createPartialFailureMocks(collection: ServiceMockCollection) {
    // Successful reads
    collection.getOne.mockResolvedValue(ProjectFactory());
    collection.getList.mockResolvedValue({
      page: 1,
      perPage: 30,
      totalItems: 5,
      totalPages: 1,
      items: Array.from({ length: 5 }, (_, i) => ProjectFactory({ id: `item-${i + 1}` })),
    });

    // Failed writes
    collection.create.mockRejectedValue(
      ErrorScenarioFactory.validationError('title', 'Already exists')
    );
    collection.update.mockRejectedValue(ErrorScenarioFactory.permissionError());
    collection.delete.mockRejectedValue(ErrorScenarioFactory.notFoundError('Project'));
  }

  /**
   * Creates authentication-related mocks
   */
  static createAuthenticationMocks(pb: ServiceMockPocketBase, authenticated = true) {
    if (authenticated) {
      pb.authStore.isValid = true;
      pb.authStore.model = {
        id: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        verified: true,
      };
      pb.authStore.token = 'valid-auth-token';
    } else {
      pb.authStore.isValid = false;
      pb.authStore.model = null;
      pb.authStore.token = '';
    }
  }

  /**
   * Creates project-specific mocks
   */
  static createProjectServiceMocks(collection: ServiceMockCollection) {
    // Mock project filtering by status
    collection.getList.mockImplementation(
      async (page = 1, perPage = 30, options: Record<string, unknown> = {}) => {
        let items = Array.from({ length: 20 }, (_, index) =>
          ProjectFactory({ id: `project-${index + 1}` })
        );

        // Apply status filter if present
        if (options.filter?.includes('status =')) {
          const statusMatch = options.filter.match(/status = "([^"]+)"/);
          if (statusMatch) {
            const status = statusMatch[1];
            items = items.filter((item: Record<string, unknown>) => item.status === status);
          }
        }

        // Apply search filter if present
        if (options.filter?.includes('title ~')) {
          const titleMatch = options.filter.match(/title ~ "%([^"]+)%"/);
          if (titleMatch) {
            const searchTerm = titleMatch[1].toLowerCase();
            items = items.filter((item: Record<string, unknown>) =>
              (item.title as string).toLowerCase().includes(searchTerm)
            );
          }
        }

        // Apply pagination
        const startIndex = (page - 1) * perPage;
        const paginatedItems = items.slice(startIndex, startIndex + perPage);

        return {
          page,
          perPage,
          totalItems: items.length,
          totalPages: Math.ceil(items.length / perPage),
          items: paginatedItems,
        };
      }
    );

    // Mock project creation with field mapping
    collection.create.mockImplementation(async (data: Record<string, unknown>) => {
      const mappedData: Record<string, unknown> = {};

      // Convert camelCase to snake_case for PocketBase
      Object.entries(data).forEach(([key, value]) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        mappedData[snakeKey] = value;
      });

      return ProjectFactory({
        id: `new-project-${Date.now()}`,
        ...mappedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Creates tag-specific mocks
   */
  static createTagServiceMocks(collection: ServiceMockCollection) {
    const mockTags = [
      TagFactory({ name: 'Cute', color: '#FFC0CB' }),
      TagFactory({ name: 'Animals', color: '#8B4513' }),
      TagFactory({ name: 'Landscape', color: '#228B22' }),
      TagFactory({ name: 'Portrait', color: '#4B0082' }),
    ];

    collection.getFullList.mockImplementation(async (options: Record<string, unknown> = {}) => {
      let tags = [...mockTags];

      // Apply user filter if present
      if (options.filter?.includes('user =')) {
        const userMatch = options.filter.match(/user = "([^"]+)"/);
        if (userMatch) {
          const userId = userMatch[1];
          tags = tags.map(tag => ({ ...tag, userId }));
        }
      }

      return tags;
    });

    collection.create.mockImplementation(async (data: Record<string, unknown>) => {
      return TagFactory({
        id: `new-tag-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Creates file upload mocks
   */
  static createFileUploadMocks(pb: ServiceMockPocketBase) {
    pb.files.getURL.mockImplementation((record, filename, options) => {
      const baseUrl = `https://data.organizedglitter.app/api/files/projects/${record.id}/${filename}`;
      if (options?.thumb) {
        return `${baseUrl}?thumb=${options.thumb}`;
      }
      return baseUrl;
    });

    pb.files.getToken.mockResolvedValue('mock-file-access-token');
  }

  /**
   * Creates real-time subscription mocks
   */
  static createRealtimeMocks(pb: ServiceMockPocketBase) {
    const subscriptions = new Map();

    pb.realtime.subscribe.mockImplementation((topic, callback) => {
      subscriptions.set(topic, callback);
      return vi.fn(() => subscriptions.delete(topic));
    });

    pb.realtime.unsubscribe.mockImplementation(topic => {
      if (topic) {
        subscriptions.delete(topic);
      } else {
        subscriptions.clear();
      }
    });

    pb.realtime.isConnected = true;

    // Return subscription map for testing
    return subscriptions;
  }

  /**
   * Creates performance testing mocks with realistic delays
   */
  static createPerformanceMocks(collection: ServiceMockCollection, delayMs = 100) {
    const addDelay = async <T>(value: T): Promise<T> => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return value;
    };

    collection.getOne.mockImplementation(async (id: string) => {
      return addDelay(ProjectFactory({ id }));
    });

    collection.getList.mockImplementation(async (page = 1, perPage = 30) => {
      const items = Array.from({ length: perPage }, (_, index) =>
        ProjectFactory({ id: `perf-item-${page}-${index + 1}` })
      );

      return addDelay({
        page,
        perPage,
        totalItems: 1000,
        totalPages: Math.ceil(1000 / perPage),
        items,
      });
    });

    collection.create.mockImplementation(async (data: Record<string, unknown>) => {
      return addDelay(
        ProjectFactory({
          id: `perf-new-${Date.now()}`,
          ...data,
        })
      );
    });
  }

  /**
   * Creates edge case mocks for boundary testing
   */
  static createEdgeCaseMocks(collection: ServiceMockCollection) {
    // Empty results
    collection.getList.mockResolvedValue({
      page: 1,
      perPage: 30,
      totalItems: 0,
      totalPages: 0,
      items: [],
    });

    collection.getFullList.mockResolvedValue([]);
    collection.getFirstListItem.mockResolvedValue(null);

    // Large results
    collection.getFullList.mockImplementation(async () => {
      return Array.from({ length: 1000 }, (_, index) =>
        ProjectFactory({ id: `large-item-${index + 1}` })
      );
    });

    // Special characters in data
    collection.create.mockImplementation(async (data: Record<string, unknown>) => {
      return ProjectFactory({
        id: 'special-chars-project',
        title: 'Project with "quotes" & special chars 🌟',
        ...data,
      });
    });
  }

  /**
   * Creates concurrent operation mocks
   */
  static createConcurrencyMocks(collection: ServiceMockCollection) {
    let operationCount = 0;

    const trackOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
      operationCount++;
      const currentOp = operationCount;

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        return await operation();
      } finally {
        // Track completion order for testing
        (collection as ServiceMockCollection & { completionOrder?: number[] }).completionOrder =
          (collection as ServiceMockCollection & { completionOrder?: number[] }).completionOrder ||
          [];
        (
          collection as ServiceMockCollection & { completionOrder?: number[] }
        ).completionOrder!.push(currentOp);
      }
    };

    collection.getOne.mockImplementation(async (id: string) => {
      return trackOperation(() => Promise.resolve(ProjectFactory({ id })));
    });

    collection.create.mockImplementation(async (data: Record<string, unknown>) => {
      return trackOperation(() =>
        Promise.resolve(
          ProjectFactory({
            id: `concurrent-${Date.now()}-${Math.random()}`,
            ...data,
          })
        )
      );
    });

    collection.update.mockImplementation(async (id: string, data: Record<string, unknown>) => {
      return trackOperation(() =>
        Promise.resolve(
          ProjectFactory({
            id,
            ...data,
            updatedAt: new Date().toISOString(),
          })
        )
      );
    });
  }
}

/**
 * Pre-configured mock scenarios for common testing situations
 */
export const MockScenarios = {
  /**
   * Happy path - all operations succeed
   */
  happyPath: (collection: ServiceMockCollection) => {
    ServiceMockTemplates.createSuccessfulCrudMocks(collection);
  },

  /**
   * Error scenarios - all operations fail
   */
  allErrors: (collection: ServiceMockCollection) => {
    ServiceMockTemplates.createErrorScenarioMocks(collection);
  },

  /**
   * Mixed success/failure scenarios
   */
  partialFailure: (collection: ServiceMockCollection) => {
    ServiceMockTemplates.createPartialFailureMocks(collection);
  },

  /**
   * Performance testing with realistic delays
   */
  performance: (collection: ServiceMockCollection, delayMs = 100) => {
    ServiceMockTemplates.createPerformanceMocks(collection, delayMs);
  },

  /**
   * Edge cases with boundary conditions
   */
  edgeCases: (collection: ServiceMockCollection) => {
    ServiceMockTemplates.createEdgeCaseMocks(collection);
  },

  /**
   * Concurrent operations testing
   */
  concurrency: (collection: ServiceMockCollection) => {
    ServiceMockTemplates.createConcurrencyMocks(collection);
  },
} as const;
