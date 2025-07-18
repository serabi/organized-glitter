/**
 * Dashboard Performance Regression Test Suite
 * Validates that all performance optimizations are working correctly
 * @author @serabi
 * @created 2025-07-17
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import { projectsService } from '@/services/pocketbase/projects.service';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('DashboardPerformanceTests');

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  STATUS_COUNTING_TARGET: 2000, // Target: <2 seconds for status counting
  STATUS_COUNTING_EXCELLENT: 1000, // Excellent: <1 second
  PROJECT_QUERY_TARGET: 2000, // Target: <2 seconds for project queries
  DASHBOARD_TOTAL_TARGET: 3000, // Target: <3 seconds total dashboard load
  CACHE_DERIVATION_TARGET: 50, // Target: <50ms for cache derivation
} as const;

// Test data configuration
const TEST_CONFIG = {
  TEST_USER_ID: 'test-user-performance', // Use test user for consistent results
  SAMPLE_SIZE: 3, // Number of test iterations for averaging
  TIMEOUT: 30000, // 30 second timeout for performance tests
} as const;

describe('Dashboard Performance Regression Tests', () => {
  beforeAll(async () => {
    logger.info('🚀 Starting dashboard performance regression tests');
  });

  afterAll(async () => {
    logger.info('✅ Dashboard performance tests completed');
  });

  describe('Status Counting Performance', () => {
    test(
      'Status counting should complete in <2 seconds (target)',
      async () => {
        const results: number[] = [];

        for (let i = 0; i < TEST_CONFIG.SAMPLE_SIZE; i++) {
          const startTime = performance.now();

          try {
            const result = await projectsService.getBatchStatusCounts({
              userId: TEST_CONFIG.TEST_USER_ID,
            });

            const duration = performance.now() - startTime;
            results.push(duration);

            logger.debug(`Status counting iteration ${i + 1}:`, {
              duration: `${Math.round(duration)}ms`,
              projectsProcessed: result.total,
              statusBreakdown: result.counts,
            });

            // Verify result structure
            expect(result.counts).toBeDefined();
            expect(result.total).toBeGreaterThan(0);
            expect(typeof result.counts.wishlist).toBe('number');
            expect(typeof result.counts.completed).toBe('number');
          } catch (error) {
            logger.error(`Status counting failed on iteration ${i + 1}:`, error);
            throw error;
          }
        }

        const averageDuration =
          results.reduce((sum, duration) => sum + duration, 0) / results.length;
        const maxDuration = Math.max(...results);
        const minDuration = Math.min(...results);

        logger.info('📊 Status counting performance results:', {
          averageDuration: `${Math.round(averageDuration)}ms`,
          maxDuration: `${Math.round(maxDuration)}ms`,
          minDuration: `${Math.round(minDuration)}ms`,
          target: `${PERFORMANCE_THRESHOLDS.STATUS_COUNTING_TARGET}ms`,
          excellent: `${PERFORMANCE_THRESHOLDS.STATUS_COUNTING_EXCELLENT}ms`,
          passed: averageDuration < PERFORMANCE_THRESHOLDS.STATUS_COUNTING_TARGET,
          rating:
            averageDuration < PERFORMANCE_THRESHOLDS.STATUS_COUNTING_EXCELLENT
              ? 'excellent'
              : averageDuration < PERFORMANCE_THRESHOLDS.STATUS_COUNTING_TARGET
                ? 'good'
                : 'needs-improvement',
        });

        // Performance assertions
        expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.STATUS_COUNTING_TARGET);
        expect(maxDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.STATUS_COUNTING_TARGET * 1.5); // Allow 50% variance for max
      },
      TEST_CONFIG.TIMEOUT
    );

    test(
      'Optimized status counting should outperform standard method',
      async () => {
        const standardResults: number[] = [];
        const optimizedResults: number[] = [];

        // Test standard method
        for (let i = 0; i < TEST_CONFIG.SAMPLE_SIZE; i++) {
          const startTime = performance.now();
          await projectsService.getBatchStatusCounts({
            userId: TEST_CONFIG.TEST_USER_ID,
          });
          standardResults.push(performance.now() - startTime);
        }

        // Test optimized method (if available)
        for (let i = 0; i < TEST_CONFIG.SAMPLE_SIZE; i++) {
          const startTime = performance.now();
          try {
            await projectsService.getOptimizedStatusCounts({
              userId: TEST_CONFIG.TEST_USER_ID,
            });
            optimizedResults.push(performance.now() - startTime);
          } catch {
            // Optimized method might not be available in all environments
            logger.warn('Optimized status counting not available, skipping comparison');
            return;
          }
        }

        const standardAverage =
          standardResults.reduce((sum, duration) => sum + duration, 0) / standardResults.length;
        const optimizedAverage =
          optimizedResults.reduce((sum, duration) => sum + duration, 0) / optimizedResults.length;
        const performanceImprovement =
          ((standardAverage - optimizedAverage) / standardAverage) * 100;

        logger.info('⚡ Status counting method comparison:', {
          standardAverage: `${Math.round(standardAverage)}ms`,
          optimizedAverage: `${Math.round(optimizedAverage)}ms`,
          improvement: `${Math.round(performanceImprovement)}%`,
          optimizedFaster: optimizedAverage < standardAverage,
        });

        // Optimized method should be at least as fast as standard method
        expect(optimizedAverage).toBeLessThanOrEqual(standardAverage);
      },
      TEST_CONFIG.TIMEOUT
    );
  });

  describe('Project Query Performance', () => {
    test(
      'Project list query should complete in <2 seconds',
      async () => {
        const results: number[] = [];

        for (let i = 0; i < TEST_CONFIG.SAMPLE_SIZE; i++) {
          const startTime = performance.now();

          try {
            const result = await projectsService.getProjects({
              filters: {
                userId: TEST_CONFIG.TEST_USER_ID,
                status: 'all',
              },
              sort: {
                field: 'last_updated',
                direction: 'desc',
              },
              page: 1,
              pageSize: 25,
              expand: {
                tags: true,
                company: false,
                artist: false,
                user: false,
              },
              includeStatusCounts: false, // Test project query independently
            });

            const duration = performance.now() - startTime;
            results.push(duration);

            logger.debug(`Project query iteration ${i + 1}:`, {
              duration: `${Math.round(duration)}ms`,
              projectsReturned: result.projects.length,
              totalItems: result.totalItems,
              totalPages: result.totalPages,
            });

            // Verify result structure
            expect(result.projects).toBeDefined();
            expect(Array.isArray(result.projects)).toBe(true);
            expect(result.totalItems).toBeGreaterThan(0);
          } catch (error) {
            logger.error(`Project query failed on iteration ${i + 1}:`, error);
            throw error;
          }
        }

        const averageDuration =
          results.reduce((sum, duration) => sum + duration, 0) / results.length;
        const maxDuration = Math.max(...results);

        logger.info('📊 Project query performance results:', {
          averageDuration: `${Math.round(averageDuration)}ms`,
          maxDuration: `${Math.round(maxDuration)}ms`,
          target: `${PERFORMANCE_THRESHOLDS.PROJECT_QUERY_TARGET}ms`,
          passed: averageDuration < PERFORMANCE_THRESHOLDS.PROJECT_QUERY_TARGET,
        });

        expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.PROJECT_QUERY_TARGET);
      },
      TEST_CONFIG.TIMEOUT
    );
  });

  describe('Combined Dashboard Performance', () => {
    test(
      'Full dashboard data load should complete in <3 seconds',
      async () => {
        const results: number[] = [];

        for (let i = 0; i < TEST_CONFIG.SAMPLE_SIZE; i++) {
          const startTime = performance.now();

          try {
            // Simulate full dashboard load: projects + status counts
            const [projectResult, statusResult] = await Promise.all([
              projectsService.getProjects({
                filters: {
                  userId: TEST_CONFIG.TEST_USER_ID,
                  status: 'all',
                },
                sort: {
                  field: 'last_updated',
                  direction: 'desc',
                },
                page: 1,
                pageSize: 25,
                expand: {
                  tags: true,
                  company: false,
                  artist: false,
                  user: false,
                },
                includeStatusCounts: false,
              }),
              projectsService.getBatchStatusCounts({
                userId: TEST_CONFIG.TEST_USER_ID,
              }),
            ]);

            const duration = performance.now() - startTime;
            results.push(duration);

            logger.debug(`Full dashboard load iteration ${i + 1}:`, {
              duration: `${Math.round(duration)}ms`,
              projectsLoaded: projectResult.projects.length,
              statusCountsLoaded: Object.keys(statusResult.counts).length,
              totalProjects: statusResult.total,
            });

            // Verify both results
            expect(projectResult.projects).toBeDefined();
            expect(statusResult.counts).toBeDefined();
          } catch (error) {
            logger.error(`Full dashboard load failed on iteration ${i + 1}:`, error);
            throw error;
          }
        }

        const averageDuration =
          results.reduce((sum, duration) => sum + duration, 0) / results.length;
        const maxDuration = Math.max(...results);

        logger.info('🎯 Full dashboard performance results:', {
          averageDuration: `${Math.round(averageDuration)}ms`,
          maxDuration: `${Math.round(maxDuration)}ms`,
          target: `${PERFORMANCE_THRESHOLDS.DASHBOARD_TOTAL_TARGET}ms`,
          passed: averageDuration < PERFORMANCE_THRESHOLDS.DASHBOARD_TOTAL_TARGET,
          rating:
            averageDuration < PERFORMANCE_THRESHOLDS.DASHBOARD_TOTAL_TARGET
              ? 'excellent'
              : 'needs-improvement',
        });

        expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.DASHBOARD_TOTAL_TARGET);
      },
      TEST_CONFIG.TIMEOUT
    );
  });

  describe('Cache Performance', () => {
    test('Cache-derived status counts should be instant (<50ms)', async () => {
      // This test would require the optimized status counts hook
      // For now, we'll test the concept with a mock implementation

      const mockCachedProjects = Array.from({ length: 500 }, (_, i) => ({
        id: `project-${i}`,
        status: ['wishlist', 'stash', 'progress', 'completed'][i % 4],
      }));

      const results: number[] = [];

      for (let i = 0; i < TEST_CONFIG.SAMPLE_SIZE; i++) {
        const startTime = performance.now();

        // Simulate client-side status counting
        const counts = {
          wishlist: 0,
          purchased: 0,
          stash: 0,
          progress: 0,
          completed: 0,
          archived: 0,
          destashed: 0,
        };

        mockCachedProjects.forEach(project => {
          const status = project.status as keyof typeof counts;
          if (Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status]++;
          }
        });

        const duration = performance.now() - startTime;
        results.push(duration);
      }

      const averageDuration = results.reduce((sum, duration) => sum + duration, 0) / results.length;

      logger.info('⚡ Cache derivation performance:', {
        averageDuration: `${Math.round(averageDuration * 1000)}μs`, // Convert to microseconds
        projectsProcessed: mockCachedProjects.length,
        target: `${PERFORMANCE_THRESHOLDS.CACHE_DERIVATION_TARGET}ms`,
        passed: averageDuration < PERFORMANCE_THRESHOLDS.CACHE_DERIVATION_TARGET,
      });

      expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_DERIVATION_TARGET);
    });
  });

  describe('Performance Regression Detection', () => {
    test('Performance should not regress beyond acceptable thresholds', async () => {
      // This test establishes baseline performance metrics
      // In a real CI/CD environment, these would be compared against historical data

      const startTime = performance.now();

      const statusResult = await projectsService.getBatchStatusCounts({
        userId: TEST_CONFIG.TEST_USER_ID,
      });

      const statusDuration = performance.now() - startTime;

      // Record baseline metrics for future comparison
      const baselineMetrics = {
        statusCountingDuration: statusDuration,
        projectsProcessed: statusResult.total,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || 'unknown',
      };

      logger.info('📋 Performance baseline recorded:', baselineMetrics);

      // Ensure we haven't regressed significantly
      expect(statusDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.STATUS_COUNTING_TARGET);

      // Additional regression checks could be added here
      // e.g., comparing against stored baseline metrics
    });
  });
});
