/**
 * Data factories for consistent mock data generation in service tests
 * @author @serabi
 * @created 2025-07-16
 */

import type { ProjectType, ProjectFilterStatus, ViewType } from '@/types/project';
import type { Tag } from '@/types/tag';
import type { TestDataFactory } from '@/types/test-utils';

/**
 * Factory for creating mock project data
 */
export const ProjectFactory: TestDataFactory<ProjectType> = (overrides = {}) => {
  const defaultProject: ProjectType = {
    id: `project-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Project',
    company: 'Test Company',
    artist: 'Test Artist',
    status: 'progress' as ProjectFilterStatus,
    kit_category: 'standard',
    drill_shape: 'round',
    drillShape: 'round',
    tags: [],
    size: '30x40cm',
    difficulty: 'medium',
    general_notes: 'Test notes',
    generalNotes: 'Test notes',
    price: '29.99',
    currency: 'USD',
    date_purchased: '2024-01-15',
    datePurchased: '2024-01-15',
    date_received: '2024-01-20',
    dateReceived: '2024-01-20',
    date_started: '2024-02-01',
    dateStarted: '2024-02-01',
    date_completed: null,
    dateCompleted: null,
    hours_spent: 0,
    hoursSpent: 0,
    image: 'test-image.jpg',
    imageUrl: 'https://example.com/test-image.jpg',
    userId: 'test-user-id',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    collectionId: 'projects',
    collectionName: 'projects',
    expand: undefined,
  };

  return { ...defaultProject, ...overrides };
};

/**
 * Factory for creating mock tag data
 */
export const TagFactory: TestDataFactory<Tag> = (overrides = {}) => {
  const defaultTag: Tag = {
    id: `tag-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Tag',
    color: '#3B82F6',
    userId: 'test-user-id',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    collectionId: 'tags',
    collectionName: 'tags',
  };

  return { ...defaultTag, ...overrides };
};

/**
 * Factory for creating mock user data
 */
export const UserFactory: TestDataFactory<{
  id: string;
  email: string;
  username: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}> = (overrides = {}) => {
  const defaultUser = {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: 'test@example.com',
    username: 'testuser',
    verified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  return { ...defaultUser, ...overrides };
};

/**
 * Factory for creating realistic project variations
 */
export class ProjectVariationFactory {
  /**
   * Creates a completed project
   */
  static completed(overrides: Partial<ProjectType> = {}): ProjectType {
    return ProjectFactory({
      status: 'completed',
      date_completed: '2024-06-01',
      dateCompleted: '2024-06-01',
      hours_spent: 120,
      hoursSpent: 120,
      ...overrides,
    });
  }

  /**
   * Creates a wishlist project
   */
  static wishlist(overrides: Partial<ProjectType> = {}): ProjectType {
    return ProjectFactory({
      status: 'wishlist',
      date_purchased: null,
      datePurchased: null,
      date_received: null,
      dateReceived: null,
      date_started: null,
      dateStarted: null,
      price: null,
      currency: null,
      ...overrides,
    });
  }

  /**
   * Creates a project with tags
   */
  static withTags(tagNames: string[], overrides: Partial<ProjectType> = {}): ProjectType {
    const tags = tagNames.map(name => TagFactory({ name }));
    return ProjectFactory({
      tags,
      ...overrides,
    });
  }

  /**
   * Creates a mini kit project
   */
  static miniKit(overrides: Partial<ProjectType> = {}): ProjectType {
    return ProjectFactory({
      kit_category: 'mini',
      size: '15x20cm',
      price: '9.99',
      ...overrides,
    });
  }

  /**
   * Creates a large project
   */
  static large(overrides: Partial<ProjectType> = {}): ProjectType {
    return ProjectFactory({
      size: '60x80cm',
      difficulty: 'hard',
      price: '89.99',
      hours_spent: 300,
      hoursSpent: 300,
      ...overrides,
    });
  }

  /**
   * Creates a project with missing data (edge case testing)
   */
  static withMissingData(overrides: Partial<ProjectType> = {}): ProjectType {
    return ProjectFactory({
      company: null,
      artist: null,
      size: null,
      difficulty: null,
      price: null,
      currency: null,
      image: null,
      imageUrl: null,
      general_notes: null,
      generalNotes: null,
      ...overrides,
    });
  }

  /**
   * Creates a project with very long text fields (edge case testing)
   */
  static withLongText(overrides: Partial<ProjectType> = {}): ProjectType {
    const longText = 'A'.repeat(1000);
    return ProjectFactory({
      title: longText,
      general_notes: longText,
      generalNotes: longText,
      ...overrides,
    });
  }
}

/**
 * Factory for creating tag variations
 */
export class TagVariationFactory {
  /**
   * Creates a set of common tags
   */
  static commonTags(): Tag[] {
    return [
      TagFactory({ name: 'Cute', color: '#FFC0CB' }),
      TagFactory({ name: 'Animals', color: '#8B4513' }),
      TagFactory({ name: 'Landscape', color: '#228B22' }),
      TagFactory({ name: 'Portrait', color: '#4B0082' }),
      TagFactory({ name: 'Abstract', color: '#FF6347' }),
      TagFactory({ name: 'Holiday', color: '#DC143C' }),
      TagFactory({ name: 'Fantasy', color: '#9370DB' }),
      TagFactory({ name: 'Floral', color: '#FF69B4' }),
    ];
  }

  /**
   * Creates tags with special characters (edge case testing)
   */
  static withSpecialCharacters(): Tag[] {
    return [
      TagFactory({ name: 'Tag with "quotes"' }),
      TagFactory({ name: "Tag with 'apostrophes'" }),
      TagFactory({ name: 'Tag with & symbols' }),
      TagFactory({ name: 'Tag with émojis 🌟' }),
      TagFactory({ name: 'Tag-with-dashes' }),
      TagFactory({ name: 'Tag_with_underscores' }),
    ];
  }

  /**
   * Creates a large set of tags for performance testing
   */
  static manyTags(count: number): Tag[] {
    return Array.from({ length: count }, (_, index) => TagFactory({ name: `Tag ${index + 1}` }));
  }
}

/**
 * Factory for creating filter and search scenarios
 */
export class FilterScenarioFactory {
  /**
   * Creates projects for testing status filtering
   */
  static statusFilteringProjects(): ProjectType[] {
    const statuses: ProjectFilterStatus[] = [
      'wishlist',
      'purchased',
      'stash',
      'progress',
      'completed',
      'destashed',
      'archived',
    ];

    return statuses.flatMap(status =>
      Array.from({ length: 3 }, (_, index) =>
        ProjectFactory({
          status,
          title: `${status} Project ${index + 1}`,
        })
      )
    );
  }

  /**
   * Creates projects for testing search functionality
   */
  static searchTestProjects(): ProjectType[] {
    return [
      ProjectFactory({ title: 'Beautiful Landscape', company: 'Nature Co', artist: 'John Doe' }),
      ProjectFactory({ title: 'Cute Kitten', company: 'Pet Designs', artist: 'Jane Smith' }),
      ProjectFactory({ title: 'Abstract Art', company: 'Modern Designs', artist: 'Bob Johnson' }),
      ProjectFactory({ title: 'Mountain Vista', company: 'Nature Co', artist: 'John Doe' }),
      ProjectFactory({ title: 'City Skyline', company: 'Urban Art', artist: 'Alice Brown' }),
    ];
  }

  /**
   * Creates projects for testing date filtering
   */
  static dateFilteringProjects(): ProjectType[] {
    const years = ['2022', '2023', '2024'];
    return years.flatMap(year =>
      Array.from({ length: 2 }, (_, index) =>
        ProjectFactory({
          title: `Project ${year}-${index + 1}`,
          date_completed: `${year}-06-15`,
          dateCompleted: `${year}-06-15`,
          status: 'completed',
        })
      )
    );
  }

  /**
   * Creates projects for testing company filtering
   */
  static companyFilteringProjects(): ProjectType[] {
    const companies = ['Diamond Art Club', 'Dreamer Designs', 'Sparkle Studio'];
    return companies.flatMap(company =>
      Array.from({ length: 3 }, (_, index) =>
        ProjectFactory({
          company,
          title: `${company} Project ${index + 1}`,
        })
      )
    );
  }

  /**
   * Creates projects for testing tag filtering
   */
  static tagFilteringProjects(): ProjectType[] {
    const tags = TagVariationFactory.commonTags();
    return [
      ProjectFactory({ title: 'Cute Animal Project', tags: [tags[0], tags[1]] }),
      ProjectFactory({ title: 'Nature Landscape', tags: [tags[2]] }),
      ProjectFactory({ title: 'Portrait Study', tags: [tags[3]] }),
      ProjectFactory({ title: 'Abstract Composition', tags: [tags[4]] }),
      ProjectFactory({ title: 'Holiday Theme', tags: [tags[5]] }),
      ProjectFactory({ title: 'Fantasy Adventure', tags: [tags[6]] }),
      ProjectFactory({ title: 'Floral Garden', tags: [tags[7]] }),
      ProjectFactory({ title: 'Multi-tag Project', tags: [tags[0], tags[2], tags[4]] }),
    ];
  }
}

/**
 * Factory for creating error scenarios
 */
interface ExtendedError extends Error {
  name: string;
  status: number;
  data?: Record<string, unknown>;
}

export class ErrorScenarioFactory {
  /**
   * Creates a network timeout error
   */
  static networkTimeout(): ExtendedError {
    const error = new Error('Request timeout') as ExtendedError;
    error.name = 'TimeoutError';
    error.status = 408;
    return error;
  }

  /**
   * Creates a validation error
   */
  static validationError(field: string, message: string): ExtendedError {
    const error = new Error(`Validation failed: ${field} - ${message}`) as ExtendedError;
    error.name = 'ValidationError';
    error.status = 400;
    error.data = { [field]: { message } };
    return error;
  }

  /**
   * Creates an authentication error
   */
  static authenticationError(): ExtendedError {
    const error = new Error('Authentication required') as ExtendedError;
    error.name = 'AuthError';
    error.status = 401;
    return error;
  }

  /**
   * Creates a permission error
   */
  static permissionError(): ExtendedError {
    const error = new Error('Insufficient permissions') as ExtendedError;
    error.name = 'PermissionError';
    error.status = 403;
    return error;
  }

  /**
   * Creates a not found error
   */
  static notFoundError(resource: string): ExtendedError {
    const error = new Error(`${resource} not found`) as ExtendedError;
    error.name = 'NotFoundError';
    error.status = 404;
    return error;
  }

  /**
   * Creates a server error
   */
  static serverError(): ExtendedError {
    const error = new Error('Internal server error') as ExtendedError;
    error.name = 'ServerError';
    error.status = 500;
    return error;
  }
}

/**
 * Utility for creating bulk test data
 */
export class BulkDataFactory {
  /**
   * Creates a large dataset for performance testing
   */
  static largeProjectDataset(count: number): ProjectType[] {
    return Array.from({ length: count }, (_, index) =>
      ProjectFactory({
        title: `Performance Test Project ${index + 1}`,
        status: ['wishlist', 'purchased', 'progress', 'completed'][
          index % 4
        ] as ProjectFilterStatus,
      })
    );
  }

  /**
   * Creates realistic mixed dataset
   */
  static realisticDataset(): {
    projects: ProjectType[];
    tags: Tag[];
    users: ReturnType<typeof UserFactory>[];
  } {
    const tags = TagVariationFactory.commonTags();
    const users = Array.from({ length: 3 }, () => UserFactory());
    const projects = [
      ...FilterScenarioFactory.statusFilteringProjects(),
      ...FilterScenarioFactory.searchTestProjects(),
      ...FilterScenarioFactory.tagFilteringProjects().map(project => ({
        ...project,
        tags: project.tags?.map(tag => tags.find(t => t.name === tag.name) || tag) || [],
      })),
    ];

    return { projects, tags, users };
  }
}
