import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runOverviewDiagnostics, enableDiagnosticConsoleAccess } from '../overviewDiagnostics';

interface MockPocketBase {
  collection: ReturnType<typeof vi.fn>;
  authStore: {
    record: unknown;
  };
}

interface MockWindow {
  [key: string]: unknown;
}

// Mock the PocketBase module
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getList: vi.fn(),
    })),
    authStore: {
      record: null,
    },
  },
}));

describe('overviewDiagnostics', () => {
  const mockUserId = 'test-user-123';
  let mockPb: MockPocketBase;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked pb
    const pbModule = await import('@/lib/pocketbase');
    mockPb = pbModule.pb as unknown as MockPocketBase;

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});

    // Mock performance.now() for consistent timing
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(0) // Basic query start
      .mockReturnValueOnce(100) // Basic query end
      .mockReturnValueOnce(200) // Date query start
      .mockReturnValueOnce(300) // Date query end
      .mockReturnValueOnce(400) // Optimized query start
      .mockReturnValueOnce(500); // Optimized query end
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runOverviewDiagnostics', () => {
    it('should analyze empty user with no projects', async () => {
      // Mock empty response
      mockPb.collection.mockReturnValue({
        getList: vi.fn().mockResolvedValue({
          totalItems: 0,
          items: [],
        }),
      });

      const result = await runOverviewDiagnostics(mockUserId);

      expect(result).toEqual(
        expect.objectContaining({
          totalProjects: 0,
          projectsWithDates: 0,
          dateDataQuality: {
            emptyStrings: 0,
            nullValues: 0,
            invalidDates: 0,
            validDates: 0,
          },
          sampleDates: [],
          queryTiming: {
            basicUserQuery: 100,
            dateFilteredQuery: 100,
            optimizedQuery: 100,
          },
          recommendations: expect.arrayContaining([
            '✅ User has no projects - Overview should be instant',
          ]),
        })
      );
    });

    it('should analyze user with projects containing various date formats', async () => {
      const currentYear = new Date().getFullYear();
      const mockProjects = [
        {
          id: 'project-1',
          date_started: `${currentYear}-06-15T00:00:00Z`,
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
        },
        {
          id: 'project-2',
          date_started: null,
          created: '2024-01-02T00:00:00Z',
          updated: '2024-01-02T00:00:00Z',
        },
        {
          id: 'project-3',
          date_started: '',
          created: '2024-01-03T00:00:00Z',
          updated: '2024-01-03T00:00:00Z',
        },
        {
          id: 'project-4',
          date_started: 'invalid-date',
          created: '2024-01-04T00:00:00Z',
          updated: '2024-01-04T00:00:00Z',
        },
      ];

      // Mock the pagination response
      mockPb.collection.mockReturnValue({
        getList: vi
          .fn()
          .mockResolvedValueOnce({
            totalItems: 4,
            items: mockProjects,
          })
          .mockResolvedValueOnce({
            totalItems: 1,
            items: [],
          })
          .mockResolvedValueOnce({
            totalItems: 1,
            items: [],
          }),
      });

      const result = await runOverviewDiagnostics(mockUserId);

      expect(result.totalProjects).toBe(4);
      expect(result.projectsWithDates).toBe(1);
      expect(result.dateDataQuality).toEqual({
        emptyStrings: 1,
        nullValues: 1,
        invalidDates: 1,
        validDates: 1,
      });
      expect(result.sampleDates).toHaveLength(1);
      expect(result.sampleDates[0]).toBe(`${currentYear}-06-15T00:00:00Z`);
    });

    it('should handle large datasets with pagination', async () => {
      const mockFirstBatch = Array.from({ length: 500 }, (_, i) => ({
        id: `project-${i}`,
        date_started: i % 2 === 0 ? `2024-0${(i % 9) + 1}-01T00:00:00Z` : null,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
      }));

      const mockSecondBatch = Array.from({ length: 300 }, (_, i) => ({
        id: `project-${i + 500}`,
        date_started: i % 3 === 0 ? `2024-0${(i % 9) + 1}-01T00:00:00Z` : '',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
      }));

      mockPb.collection.mockReturnValue({
        getList: vi
          .fn()
          .mockResolvedValueOnce({
            totalItems: 800,
            items: mockFirstBatch,
          })
          .mockResolvedValueOnce({
            totalItems: 800,
            items: mockSecondBatch,
          })
          .mockResolvedValueOnce({
            totalItems: 1,
            items: [],
          })
          .mockResolvedValueOnce({
            totalItems: 1,
            items: [],
          }),
      });

      const result = await runOverviewDiagnostics(mockUserId);

      expect(result.totalProjects).toBe(800);
      expect(result.projectsWithDates).toBe(350); // 250 from first batch + 100 from second batch
      expect(result.dateDataQuality.validDates).toBe(350);
      expect(result.dateDataQuality.emptyStrings).toBe(200); // From second batch
      expect(result.dateDataQuality.nullValues).toBe(250); // From first batch
    });

    it('should generate appropriate recommendations based on data quality', async () => {
      const mockProjects = Array.from({ length: 100 }, (_, i) => ({
        id: `project-${i}`,
        date_started: i < 10 ? `2024-06-${i + 1}T00:00:00Z` : '', // Only 10% have valid dates
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
      }));

      mockPb.collection.mockReturnValue({
        getList: vi
          .fn()
          .mockResolvedValueOnce({
            totalItems: 100,
            items: mockProjects,
          })
          .mockResolvedValueOnce({
            totalItems: 1,
            items: [],
          })
          .mockResolvedValueOnce({
            totalItems: 1,
            items: [],
          }),
      });

      const result = await runOverviewDiagnostics(mockUserId);

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Found 90 projects with empty string dates'),
          '💡 Most projects have no start dates - consider skipping date queries for this user',
        ])
      );
    });

    it('should identify slow query performance', async () => {
      // Mock slow response times
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(2000) // Slow basic query (2000ms)
        .mockReturnValueOnce(2100)
        .mockReturnValueOnce(3600) // Very slow date query (1500ms)
        .mockReturnValueOnce(3700)
        .mockReturnValueOnce(5000); // Slow optimized query (1300ms)

      mockPb.collection.mockReturnValue({
        getList: vi.fn().mockResolvedValue({
          totalItems: 0,
          items: [],
        }),
      });

      const result = await runOverviewDiagnostics(mockUserId);

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Basic user query is slow (2000ms)'),
          expect.stringContaining('Date-filtered query is slow (1500ms)'),
          expect.stringContaining('Even optimized query is slow (1300ms)'),
        ])
      );
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockPb.collection.mockReturnValue({
        getList: vi.fn().mockRejectedValue(error),
      });

      const result = await runOverviewDiagnostics(mockUserId);

      expect(result.recommendations).toEqual(
        expect.arrayContaining(['❌ Diagnostic analysis failed - check console for errors'])
      );
      expect(console.error).toHaveBeenCalledWith('[Diagnostics] Error during analysis:', error);
    });

    it('should detect data retrieval mismatches', async () => {
      mockPb.collection.mockReturnValue({
        getList: vi
          .fn()
          .mockResolvedValueOnce({
            totalItems: 100, // Says there are 100 items
            items: [
              { id: 'project-1', date_started: null, created: '2024-01-01', updated: '2024-01-01' },
            ], // But only returns 1
          })
          .mockResolvedValueOnce({
            totalItems: 1,
            items: [],
          })
          .mockResolvedValueOnce({
            totalItems: 1,
            items: [],
          }),
      });

      const result = await runOverviewDiagnostics(mockUserId);

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Data retrieval mismatch: Retrieved 1 projects but expected 100'),
        ])
      );
    });

    it('should collect sample dates up to limit', async () => {
      const mockProjects = Array.from({ length: 20 }, (_, i) => ({
        id: `project-${i}`,
        date_started: `2024-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
      }));

      mockPb.collection.mockReturnValue({
        getList: vi
          .fn()
          .mockResolvedValueOnce({
            totalItems: 20,
            items: mockProjects,
          })
          .mockResolvedValueOnce({
            totalItems: 1,
            items: [],
          })
          .mockResolvedValueOnce({
            totalItems: 1,
            items: [],
          }),
      });

      const result = await runOverviewDiagnostics(mockUserId);

      expect(result.sampleDates).toHaveLength(10); // Should be limited to 10
      expect(result.dateDataQuality.validDates).toBe(20);
    });
  });

  describe('enableDiagnosticConsoleAccess', () => {
    it('should add diagnostic function to window object', () => {
      const mockWindow = {} as MockWindow;
      global.window = mockWindow as unknown as Window & typeof globalThis;

      enableDiagnosticConsoleAccess();

      expect(mockWindow.runOverviewDiagnostics).toBeDefined();
      expect(typeof mockWindow.runOverviewDiagnostics).toBe('function');
      expect(console.log).toHaveBeenCalledWith(
        '🔍 Diagnostics enabled! Run: window.runOverviewDiagnostics()'
      );
    });

    it('should handle missing window object gracefully', () => {
      const originalWindow = global.window;
      delete (global as { window?: unknown }).window;

      expect(() => enableDiagnosticConsoleAccess()).not.toThrow();

      global.window = originalWindow;
    });

    it('should use current user when no userId provided', async () => {
      const mockWindow = {} as MockWindow;
      global.window = mockWindow as unknown as Window & typeof globalThis;

      enableDiagnosticConsoleAccess();

      // Verify the function exists on window
      expect(mockWindow.runOverviewDiagnostics).toBeDefined();
    });

    it('should handle missing authenticated user', async () => {
      const mockWindow = {} as MockWindow;
      global.window = mockWindow as unknown as Window & typeof globalThis;

      enableDiagnosticConsoleAccess();

      // The function should exist
      expect(mockWindow.runOverviewDiagnostics).toBeDefined();
    });
  });
});
