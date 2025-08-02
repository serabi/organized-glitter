import { ProjectType, ProjectStatus } from '@/types/project';

/**
 * Factory for creating mock project data for testing
 */
export const createMockProject = (overrides: Partial<ProjectType> = {}): ProjectType => {
  const defaultProject: ProjectType = {
    id: `project-${Math.random().toString(36).substr(2, 9)}`,
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
    generalNotes: 'Test notes for this project',
    datePurchased: '2024-01-15',
    dateReceived: '2024-01-20',
    dateStarted: undefined,
    dateCompleted: undefined,
    imageUrl: undefined,
    userId: 'test-user-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tagNames: ['test', 'diamond-art'],
  };

  return { ...defaultProject, ...overrides };
};

/**
 * Create multiple mock projects with different statuses
 */
export const createMockProjects = (count: number = 3): ProjectType[] => {
  const statuses: ProjectStatus[] = [
    'wishlist',
    'purchased',
    'stash',
    'progress',
    'onhold',
    'completed',
  ];

  return Array.from({ length: count }, (_, index) =>
    createMockProject({
      id: `project-${index + 1}`,
      title: `Test Project ${index + 1}`,
      status: statuses[index % statuses.length],
    })
  );
};

/**
 * Create a project with specific status
 */
export const createProjectWithStatus = (
  status: ProjectStatus,
  overrides: Partial<ProjectType> = {}
): ProjectType => {
  const statusDates: Record<ProjectStatus, Partial<ProjectType>> = {
    wishlist: {
      datePurchased: undefined,
      dateReceived: undefined,
      dateStarted: undefined,
      dateCompleted: undefined,
    },
    purchased: {
      datePurchased: '2024-01-15',
      dateReceived: undefined,
      dateStarted: undefined,
      dateCompleted: undefined,
    },
    stash: {
      datePurchased: '2024-01-15',
      dateReceived: '2024-01-20',
      dateStarted: undefined,
      dateCompleted: undefined,
    },
    progress: {
      datePurchased: '2024-01-15',
      dateReceived: '2024-01-20',
      dateStarted: '2024-02-01',
      dateCompleted: undefined,
    },
    onhold: {
      datePurchased: '2024-01-15',
      dateReceived: '2024-01-20',
      dateStarted: '2024-02-01',
      dateCompleted: undefined,
    },
    completed: {
      datePurchased: '2024-01-15',
      dateReceived: '2024-01-20',
      dateStarted: '2024-02-01',
      dateCompleted: '2024-03-15',
    },
    archived: {
      datePurchased: '2024-01-15',
      dateReceived: '2024-01-20',
      dateStarted: '2024-02-01',
      dateCompleted: undefined,
    },
    destashed: {
      datePurchased: '2024-01-15',
      dateReceived: '2024-01-20',
      dateStarted: undefined,
      dateCompleted: undefined,
    },
  };

  return createMockProject({
    status,
    ...statusDates[status],
    ...overrides,
  });
};

/**
 * Create a project with tags
 */
export const createProjectWithTags = (
  tags: string[],
  overrides: Partial<ProjectType> = {}
): ProjectType => {
  return createMockProject({
    tagNames: tags,
    ...overrides,
  });
};

/**
 * Create a project for CSV import testing
 */
export const createCSVImportProject = (overrides: Partial<ProjectType> = {}): ProjectType => {
  return createMockProject({
    title: 'CSV Import Test Project',
    company: 'Import Company',
    artist: 'Import Artist',
    width: 40,
    height: 50,
    drillShape: 'square',
    totalDiamonds: 35000,
    kit_category: 'mini',
    status: 'stash',
    generalNotes: 'Imported from CSV file',
    tagNames: ['imported', 'csv', 'test'],
    ...overrides,
  });
};
