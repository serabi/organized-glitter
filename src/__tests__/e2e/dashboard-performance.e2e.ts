/**
 * Dashboard Performance End-to-End Test Suite
 * Tests real browser performance with Playwright automation
 * @author @serabi
 * @created 2025-07-17
 */

import { test, expect, Page } from '@playwright/test';

// Performance thresholds for E2E tests (more lenient than unit tests)
const E2E_PERFORMANCE_THRESHOLDS = {
  DASHBOARD_LOAD_TIME: 5000, // 5 seconds for full dashboard load in browser
  STATUS_TAB_LOAD_TIME: 3000, // 3 seconds for status tabs to show counts
  OPTIMISTIC_UPDATE_TIME: 200, // 200ms for optimistic UI updates
  NETWORK_TIMEOUT: 30000, // 30 seconds network timeout
} as const;

// Test URLs
const TEST_URLS = {
  DASHBOARD: 'http://localhost:3000/dashboard',
  LOGIN: 'http://localhost:3000/login',
} as const;

// Console log categories to track
const PERFORMANCE_LOG_PATTERNS = {
  STATUS_COUNTING: /status counting|Simple getFullList|StatusTabs/i,
  DASHBOARD_LOADING: /DASHBOARD|useDashboardData|ProjectsService/i,
  OPTIMISTIC_UPDATES: /onMutate|Optimistically|setQueryData/i,
  PERFORMANCE: /PERF|performance|duration|ms/i,
} as const;

interface PerformanceMetrics {
  dashboardLoadTime: number;
  statusTabLoadTime: number;
  totalProjects: number;
  statusCounts: Record<string, number>;
  consoleLogs: Array<{
    type: string;
    text: string;
    timestamp: number;
    category: string;
  }>;
}

/**
 * Capture and analyze console logs for performance metrics
 */
async function capturePerformanceLogs(page: Page): Promise<PerformanceMetrics['consoleLogs']> {
  const logs: PerformanceMetrics['consoleLogs'] = [];

  page.on('console', msg => {
    const text = msg.text();
    let category = 'other';

    if (PERFORMANCE_LOG_PATTERNS.STATUS_COUNTING.test(text)) {
      category = 'status-counting';
    } else if (PERFORMANCE_LOG_PATTERNS.DASHBOARD_LOADING.test(text)) {
      category = 'dashboard-loading';
    } else if (PERFORMANCE_LOG_PATTERNS.OPTIMISTIC_UPDATES.test(text)) {
      category = 'optimistic-updates';
    } else if (PERFORMANCE_LOG_PATTERNS.PERFORMANCE.test(text)) {
      category = 'performance';
    }

    logs.push({
      type: msg.type(),
      text,
      timestamp: Date.now(),
      category,
    });
  });

  return logs;
}

/**
 * Extract status counts from dashboard status tabs
 */
async function extractStatusCounts(page: Page): Promise<Record<string, number>> {
  const statusCounts: Record<string, number> = {};

  try {
    // Wait for status tabs to be visible
    await page.waitForSelector('[role="tablist"]', { timeout: 5000 });

    // Extract counts from each status tab
    const tabs = await page.locator('[role="tab"]').all();

    for (const tab of tabs) {
      const text = await tab.textContent();
      if (text) {
        // Extract status name and count from tab text like "All 672" or "In Progress 18"
        const match = text.match(/^(.+?)\s+(\d+)$/);
        if (match) {
          const [, statusName, count] = match;
          statusCounts[statusName.toLowerCase().replace(/\s+/g, '-')] = parseInt(count, 10);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to extract status counts:', error);
  }

  return statusCounts;
}

test.describe('Dashboard Performance E2E Tests', () => {
  let performanceLogs: PerformanceMetrics['consoleLogs'];

  test.beforeEach(async ({ page }) => {
    // Start capturing performance logs
    performanceLogs = await capturePerformanceLogs(page);

    // Set up performance monitoring
    await page.addInitScript(() => {
      // Mark the start time for performance measurement
      window.dashboardTestStartTime = performance.now();
    });
  });

  test('Dashboard should load within performance threshold', async ({ page }) => {
    const testStartTime = Date.now();

    // Navigate to dashboard
    await page.goto(TEST_URLS.DASHBOARD, {
      waitUntil: 'networkidle',
      timeout: E2E_PERFORMANCE_THRESHOLDS.NETWORK_TIMEOUT,
    });

    // Wait for essential dashboard elements
    await Promise.all([
      page.waitForSelector('h1:has-text("My Diamond Paintings")', { timeout: 10000 }),
      page.waitForSelector('[role="tablist"]', { timeout: 10000 }),
      page.waitForSelector('[data-testid="project-card"], .grid > div', { timeout: 15000 }),
    ]);

    const dashboardLoadTime = Date.now() - testStartTime;

    // Extract performance metrics
    const statusCounts = await extractStatusCounts(page);
    const totalProjects = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    console.log('📊 Dashboard Performance Metrics:', {
      dashboardLoadTime: `${dashboardLoadTime}ms`,
      threshold: `${E2E_PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_TIME}ms`,
      totalProjects,
      statusCounts,
      passed: dashboardLoadTime < E2E_PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_TIME,
    });

    // Performance assertions
    expect(dashboardLoadTime).toBeLessThan(E2E_PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_TIME);
    expect(totalProjects).toBeGreaterThan(0);
    expect(Object.keys(statusCounts).length).toBeGreaterThan(0);
  });

  test('Status tabs should load counts within threshold', async ({ page }) => {
    await page.goto(TEST_URLS.DASHBOARD);

    const statusTabStartTime = Date.now();

    // Wait for status tabs to show actual counts (not spinners)
    await page.waitForFunction(
      () => {
        const tabs = document.querySelectorAll('[role="tab"]');
        return Array.from(tabs).some(tab => {
          const text = tab.textContent || '';
          // Check if tab has actual numbers (not just text or spinners)
          return /\d+/.test(text) && !text.includes('loading');
        });
      },
      { timeout: E2E_PERFORMANCE_THRESHOLDS.STATUS_TAB_LOAD_TIME }
    );

    const statusTabLoadTime = Date.now() - statusTabStartTime;

    // Verify all tabs have counts
    const tabs = await page.locator('[role="tab"]').all();
    const tabTexts = await Promise.all(tabs.map(tab => tab.textContent()));

    const tabsWithCounts = tabTexts.filter(text => text && /\d+/.test(text));

    console.log('📊 Status Tab Performance:', {
      statusTabLoadTime: `${statusTabLoadTime}ms`,
      threshold: `${E2E_PERFORMANCE_THRESHOLDS.STATUS_TAB_LOAD_TIME}ms`,
      tabsWithCounts: tabsWithCounts.length,
      totalTabs: tabs.length,
      passed: statusTabLoadTime < E2E_PERFORMANCE_THRESHOLDS.STATUS_TAB_LOAD_TIME,
    });

    expect(statusTabLoadTime).toBeLessThan(E2E_PERFORMANCE_THRESHOLDS.STATUS_TAB_LOAD_TIME);
    expect(tabsWithCounts.length).toBeGreaterThan(0);
  });

  test('Optimistic updates should provide instant feedback', async ({ page }) => {
    await page.goto(TEST_URLS.DASHBOARD);

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="project-card"], .grid > div', { timeout: 10000 });

    // Find a project card to test status change
    const projectCard = page.locator('.grid > div').first();
    await expect(projectCard).toBeVisible();

    // Look for a status dropdown or button within the project card
    const statusElement = projectCard.locator('button, select, [role="combobox"]').first();

    if ((await statusElement.count()) > 0) {
      const updateStartTime = Date.now();

      // Attempt to trigger a status change
      await statusElement.click();

      // Look for dropdown options or direct status change
      const statusOptions = page.locator('[role="option"], [role="menuitem"]');

      if ((await statusOptions.count()) > 0) {
        await statusOptions.first().click();

        const updateTime = Date.now() - updateStartTime;

        console.log('⚡ Optimistic Update Performance:', {
          updateTime: `${updateTime}ms`,
          threshold: `${E2E_PERFORMANCE_THRESHOLDS.OPTIMISTIC_UPDATE_TIME}ms`,
          passed: updateTime < E2E_PERFORMANCE_THRESHOLDS.OPTIMISTIC_UPDATE_TIME,
        });

        // UI should update immediately (optimistic update)
        expect(updateTime).toBeLessThan(E2E_PERFORMANCE_THRESHOLDS.OPTIMISTIC_UPDATE_TIME);
      } else {
        test.skip('No status change options found, skipping optimistic update test');
      }
    } else {
      test.skip('No status change elements found, skipping optimistic update test');
    }
  });

  test('Console logs should indicate performance optimizations are working', async ({ page }) => {
    await page.goto(TEST_URLS.DASHBOARD);

    // Wait for dashboard to fully load
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow time for all logs to be captured

    // Analyze performance logs
    const statusCountingLogs = performanceLogs.filter(
      log => log.category === 'status-counting' || log.text.includes('status counting')
    );

    const dashboardLoadingLogs = performanceLogs.filter(
      log => log.category === 'dashboard-loading'
    );

    const performanceOptimizationLogs = performanceLogs.filter(
      log =>
        log.text.includes('optimization') ||
        log.text.includes('cache') ||
        log.text.includes('30 seconds') ||
        log.text.includes('staleTime')
    );

    console.log('📋 Performance Log Analysis:', {
      totalLogs: performanceLogs.length,
      statusCountingLogs: statusCountingLogs.length,
      dashboardLoadingLogs: dashboardLoadingLogs.length,
      optimizationLogs: performanceOptimizationLogs.length,
      sampleLogs: performanceLogs.slice(0, 5).map(log => ({
        category: log.category,
        text: log.text.substring(0, 100),
      })),
    });

    // Verify we have performance-related logs
    expect(statusCountingLogs.length + dashboardLoadingLogs.length).toBeGreaterThan(0);

    // Check for specific optimization indicators
    const hasOptimizationLogs = performanceOptimizationLogs.length > 0;
    const hasCachingLogs = performanceLogs.some(
      log => log.text.includes('30 seconds') || log.text.includes('staleTime')
    );

    if (hasOptimizationLogs) {
      console.log('✅ Performance optimizations detected in logs');
    }

    if (hasCachingLogs) {
      console.log('✅ Caching optimizations detected in logs');
    }

    // At minimum, we should have dashboard loading logs
    expect(dashboardLoadingLogs.length).toBeGreaterThan(0);
  });

  test('Network requests should be optimized', async ({ page }) => {
    const networkRequests: Array<{
      url: string;
      method: string;
      duration: number;
      size: number;
    }> = [];

    // Monitor network requests
    page.on('response', async response => {
      if (response.url().includes('/api/collections/projects')) {
        const request = response.request();
        const timing = response.timing();

        try {
          const contentLength = response.headers()['content-length'];
          networkRequests.push({
            url: response.url(),
            method: request.method(),
            duration: timing.responseEnd - timing.requestStart,
            size: contentLength ? parseInt(contentLength, 10) : 0,
          });
        } catch {
          // Handle any timing/size calculation errors
        }
      }
    });

    await page.goto(TEST_URLS.DASHBOARD);
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
    await page.waitForTimeout(3000); // Allow all requests to complete

    const totalRequests = networkRequests.length;
    const averageRequestDuration =
      networkRequests.length > 0
        ? networkRequests.reduce((sum, req) => sum + req.duration, 0) / networkRequests.length
        : 0;

    const statusCountingRequests = networkRequests.filter(
      req => req.url.includes('projects') && req.method === 'GET'
    );

    console.log('🌐 Network Performance Analysis:', {
      totalProjectRequests: totalRequests,
      statusCountingRequests: statusCountingRequests.length,
      averageRequestDuration: `${Math.round(averageRequestDuration)}ms`,
      requestDetails: networkRequests.map(req => ({
        method: req.method,
        duration: `${Math.round(req.duration)}ms`,
        size: `${Math.round(req.size / 1024)}KB`,
      })),
    });

    // We should have some project-related requests
    expect(totalRequests).toBeGreaterThan(0);

    // Individual requests should be reasonably fast
    if (networkRequests.length > 0) {
      expect(averageRequestDuration).toBeLessThan(10000); // 10 seconds max per request
    }

    // We shouldn't have excessive duplicate requests (indicates poor caching)
    const duplicateRequests = networkRequests.filter(
      (req, index, arr) =>
        arr.findIndex(r => r.url === req.url && r.method === req.method) !== index
    );

    expect(duplicateRequests.length).toBeLessThan(3); // Allow some duplicates but not excessive
  });
});
