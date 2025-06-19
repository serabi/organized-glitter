import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateOverviewStats } from '../overviewStatsCalculator';
import { ProjectType } from '@/types/project';

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe('overviewStatsCalculator', () => {
  describe('calculateOverviewStats', () => {
    const currentYear = new Date().getFullYear();

    const createMockProject = (overrides: Partial<ProjectType> = {}): ProjectType => ({
      id: 'test-id',
      userId: 'user-1',
      title: 'Test Project',
      status: 'wishlist',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      progressNotes: [],
      tags: [],
      ...overrides,
    });

    it('should return default stats for empty projects array', () => {
      const result = calculateOverviewStats([]);

      expect(result.stats).toEqual({
        completedCount: 0,
        estimatedDrills: 0,
        startedCount: 0,
        inProgressCount: 0,
        totalDiamonds: 0,
      });
      expect(result.inProgressProjects).toEqual([]);
    });

    it('should return default stats for null input', () => {
      const result = calculateOverviewStats(null);

      expect(result.stats).toEqual({
        completedCount: 0,
        estimatedDrills: 0,
        startedCount: 0,
        inProgressCount: 0,
        totalDiamonds: 0,
      });
      expect(result.inProgressProjects).toEqual([]);
    });

    it('should return default stats for undefined input', () => {
      const result = calculateOverviewStats(undefined);

      expect(result.stats).toEqual({
        completedCount: 0,
        estimatedDrills: 0,
        startedCount: 0,
        inProgressCount: 0,
        totalDiamonds: 0,
      });
      expect(result.inProgressProjects).toEqual([]);
    });

    it('should count completed projects from current year only', () => {
      const projects = [
        createMockProject({
          id: 'completed-this-year',
          status: 'completed',
          dateCompleted: `${currentYear}-06-15T00:00:00Z`,
          totalDiamonds: 1000,
        }),
        createMockProject({
          id: 'completed-last-year',
          status: 'completed',
          dateCompleted: `${currentYear - 1}-06-15T00:00:00Z`,
          totalDiamonds: 2000,
        }),
        createMockProject({
          id: 'not-completed',
          status: 'progress',
        }),
      ];

      const result = calculateOverviewStats(projects);

      expect(result.stats.completedCount).toBe(1);
      expect(result.stats.totalDiamonds).toBe(1000);
      expect(result.stats.estimatedDrills).toBe(1000);
    });

    it('should count started projects from current year only', () => {
      const projects = [
        createMockProject({
          id: 'started-this-year',
          dateStarted: `${currentYear}-03-10T00:00:00Z`,
        }),
        createMockProject({
          id: 'started-last-year',
          dateStarted: `${currentYear - 1}-03-10T00:00:00Z`,
        }),
        createMockProject({
          id: 'not-started',
        }),
      ];

      const result = calculateOverviewStats(projects);

      expect(result.stats.startedCount).toBe(1);
    });

    it('should count in-progress projects regardless of year', () => {
      const projects = [
        createMockProject({
          id: 'progress-1',
          status: 'progress',
          dateStarted: `${currentYear}-01-01T00:00:00Z`,
        }),
        createMockProject({
          id: 'progress-2',
          status: 'progress',
          dateStarted: `${currentYear - 1}-01-01T00:00:00Z`,
        }),
        createMockProject({
          id: 'completed',
          status: 'completed',
        }),
      ];

      const result = calculateOverviewStats(projects);

      expect(result.stats.inProgressCount).toBe(2);
      expect(result.inProgressProjects).toHaveLength(2);
    });

    it('should limit in-progress projects to 3 items', () => {
      const projects = Array.from({ length: 5 }, (_, i) =>
        createMockProject({
          id: `progress-${i}`,
          status: 'progress',
        })
      );

      const result = calculateOverviewStats(projects);

      expect(result.stats.inProgressCount).toBe(5);
      expect(result.inProgressProjects).toHaveLength(3);
    });

    it('should handle projects with no totalDiamonds', () => {
      const projects = [
        createMockProject({
          status: 'completed',
          dateCompleted: `${currentYear}-06-15T00:00:00Z`,
          totalDiamonds: undefined,
        }),
      ];

      const result = calculateOverviewStats(projects);

      expect(result.stats.completedCount).toBe(1);
      expect(result.stats.totalDiamonds).toBe(0);
      expect(result.stats.estimatedDrills).toBe(0);
    });

    it('should parse totalDiamonds as string and remove non-numeric characters', () => {
      const projects = [
        createMockProject({
          status: 'completed',
          dateCompleted: `${currentYear}-06-15T00:00:00Z`,
          totalDiamonds: '1,500' as unknown as number, // Test string with comma - calculator will parse this
        }),
        createMockProject({
          status: 'completed',
          dateCompleted: `${currentYear}-07-15T00:00:00Z`,
          totalDiamonds: '2500 diamonds' as unknown as number, // Test string with text - calculator will parse this
        }),
      ];

      const result = calculateOverviewStats(projects);

      expect(result.stats.totalDiamonds).toBe(4000); // 1500 + 2500
    });

    it('should handle invalid totalDiamonds gracefully', () => {
      const projects = [
        createMockProject({
          status: 'completed',
          dateCompleted: `${currentYear}-06-15T00:00:00Z`,
          totalDiamonds: 'invalid' as unknown as number,
        }),
      ];

      const result = calculateOverviewStats(projects);

      expect(result.stats.totalDiamonds).toBe(0);
    });

    it('should handle projects without date fields', () => {
      const projects = [
        createMockProject({
          status: 'completed',
          dateCompleted: undefined,
        }),
        createMockProject({
          status: 'progress',
          dateStarted: undefined,
        }),
      ];

      const result = calculateOverviewStats(projects);

      expect(result.stats.completedCount).toBe(0);
      expect(result.stats.startedCount).toBe(0);
      expect(result.stats.inProgressCount).toBe(1);
    });

    it('should handle invalid date formats', () => {
      const projects = [
        createMockProject({
          status: 'completed',
          dateCompleted: 'invalid-date',
        }),
        createMockProject({
          dateStarted: 'another-invalid-date',
        }),
      ];

      const result = calculateOverviewStats(projects);

      expect(result.stats.completedCount).toBe(0);
      expect(result.stats.startedCount).toBe(0);
    });

    it('should calculate complex scenario correctly', () => {
      const projects = [
        // Completed this year with diamonds
        createMockProject({
          id: 'completed-1',
          status: 'completed',
          dateCompleted: `${currentYear}-03-15T00:00:00Z`,
          dateStarted: `${currentYear}-01-15T00:00:00Z`,
          totalDiamonds: 1000,
        }),
        createMockProject({
          id: 'completed-2',
          status: 'completed',
          dateCompleted: `${currentYear}-06-15T00:00:00Z`,
          dateStarted: `${currentYear}-04-15T00:00:00Z`,
          totalDiamonds: 2500,
        }),
        // Started this year but not completed
        createMockProject({
          id: 'started-progress',
          status: 'progress',
          dateStarted: `${currentYear}-08-15T00:00:00Z`,
        }),
        // In progress projects
        createMockProject({
          id: 'progress-1',
          status: 'progress',
        }),
        createMockProject({
          id: 'progress-2',
          status: 'progress',
        }),
        // Started last year
        createMockProject({
          id: 'started-last-year',
          dateStarted: `${currentYear - 1}-12-15T00:00:00Z`,
        }),
        // Completed last year
        createMockProject({
          id: 'completed-last-year',
          status: 'completed',
          dateCompleted: `${currentYear - 1}-12-15T00:00:00Z`,
          totalDiamonds: 999,
        }),
      ];

      const result = calculateOverviewStats(projects);

      expect(result.stats).toEqual({
        completedCount: 2, // Only completed this year
        estimatedDrills: 3500, // 1000 + 2500
        startedCount: 3, // 2 completed + 1 in progress, all started this year
        inProgressCount: 3, // All progress status projects
        totalDiamonds: 3500,
      });
      expect(result.inProgressProjects).toHaveLength(3);
    });

    it('should handle invalid totalDiamonds values', () => {
      const projects = [
        createMockProject({
          status: 'completed',
          dateCompleted: `${currentYear}-06-15T00:00:00Z`,
          totalDiamonds: 'invalid-number' as unknown as number,
        }),
        createMockProject({
          status: 'completed',
          dateCompleted: `${currentYear}-07-15T00:00:00Z`,
          totalDiamonds: '1,500 diamonds!!!' as unknown as number, // Should extract numbers (1500)
        }),
      ];

      const result = calculateOverviewStats(projects);

      // Should handle invalid numbers gracefully
      expect(result.stats.completedCount).toBe(2);
      expect(result.stats.totalDiamonds).toBe(1500); // Should extract 1500 from the second project
    });
  });
});
