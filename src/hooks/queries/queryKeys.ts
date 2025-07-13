/**
 * @fileoverview React Query key definitions for consistent caching
 *
 * This file defines hierarchical query keys used throughout the application
 * for React Query cache management. Keys follow a consistent pattern:
 * [resource, type, identifier, params]
 *
 * Key principles:
 * - Hierarchical structure enables targeted cache invalidation
 * - Consistent naming prevents cache key collisions
 * - TypeScript const assertions ensure type safety
 * - Parameters are included for cache isolation
 *
 * @author serabi
 * @since 2025-07-02
 */

import { ServerFilters } from './useProjects';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { SortDirectionType } from '@/contexts/FilterProvider';

/**
 * Creates stable, deterministic query keys by serializing object parameters.
 * 
 * This function ensures that React Query cache keys remain consistent even when
 * object references change but the underlying data values are identical. This
 * prevents unnecessary cache misses and re-fetches.
 * 
 * **Key behaviors:**
 * - Object keys are sorted alphabetically for consistent serialization
 * - Arrays are sorted to ensure deterministic ordering (critical for cache consistency)
 * - Nested objects are recursively processed with the same stabilization logic
 * - Primitive values are preserved as-is
 * 
 * **Array sorting rationale:**
 * Arrays in query parameters (filters, tags, IDs) typically don't have semantic
 * ordering requirements for caching purposes. Sorting ensures that functionally
 * equivalent parameter sets produce identical cache keys:
 * 
 * @example
 * // These should produce the same cache key:
 * createStableKey({ tags: ['react', 'typescript'] })
 * createStableKey({ tags: ['typescript', 'react'] })
 * 
 * @example
 * // Usage in query keys:
 * const params = { filters: { status: 'active' }, tags: ['urgent', 'bug'] };
 * const key = ['projects', userId, createStableKey(params)];
 * 
 * @param obj - The object to serialize into a stable string representation
 * @returns A JSON string with consistent ordering for use as query cache key
 * 
 * @author @serabi
 * @since 2025-07-02
 */
const createStableKey = (obj: Record<string, any>): string => {
  // Sort object keys alphabetically to ensure consistent property ordering
  const sortedKeys = Object.keys(obj).sort();
  const stableObj: Record<string, any> = {};

  sortedKeys.forEach(key => {
    const value = obj[key];
    if (Array.isArray(value)) {
      // Sort arrays to ensure deterministic serialization regardless of input order
      // This is essential for React Query cache consistency
      stableObj[key] = [...value].sort();
    } else if (typeof value === 'object' && value !== null) {
      // Recursively stabilize nested objects using the same logic
      stableObj[key] = createStableKey(value);
    } else {
      // Preserve primitive values (string, number, boolean, null) as-is
      stableObj[key] = value;
    }
  });

  return JSON.stringify(stableObj);
};

/**
 * Parameters for project list queries
 * Used to create unique cache keys for different filter/sort combinations
 */
export interface ProjectQueryParams {
  filters: ServerFilters;
  sortField: DashboardValidSortField;
  sortDirection: SortDirectionType;
  currentPage: number;
  pageSize: number;
}

/**
 * Parameters for company list queries
 * Used to create unique cache keys for different pagination combinations
 */
export interface CompanyQueryParams {
  currentPage: number;
  pageSize: number;
}

/**
 * Hierarchical query key definitions for React Query cache management
 *
 * Structure follows the pattern: [resource, type, identifier, params]
 * This enables targeted cache invalidation and prevents key collisions.
 *
 * @example
 * // Invalidate all project queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
 *
 * // Invalidate specific project list
 * queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(userId, params) });
 */
export const queryKeys = {
  // Project-related keys
  projects: {
    /** Base key for all project queries */
    all: ['projects'] as const,
    /** Base key for project list queries */
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    /** Specific project list with user and parameters - uses stable serialization */
    list: (userId: string, params: ProjectQueryParams) =>
      [...queryKeys.projects.lists(), userId, createStableKey(params)] as const,
    /** Base key for project detail queries */
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    /** Specific project detail by ID */
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    /** Advanced project queries for specific user */
    advanced: (userId: string) => [...queryKeys.projects.all, 'advanced', userId] as const,
    /** Available years for project filtering - DEPRECATED: now included in dashboard stats */
    availableYears: (userId: string) =>
      [...queryKeys.projects.all, 'available-years', userId] as const,
    /** Navigation context fallback for direct URL access */
    navigationContext: (userId: string) =>
      [...queryKeys.projects.all, 'navigation-context', userId] as const,
  },

  // Company-related keys
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: (userId: string, params: CompanyQueryParams) =>
      [...queryKeys.companies.lists(), userId, params] as const,
    allForUser: (userId: string) => [...queryKeys.companies.all, 'all-for-user', userId] as const,
    details: () => [...queryKeys.companies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
  },

  // Artist-related keys
  artists: {
    all: ['artists'] as const,
    lists: () => [...queryKeys.artists.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.artists.lists(), userId] as const,
    details: () => [...queryKeys.artists.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.artists.details(), id] as const,
  },

  // Tag-related keys
  tags: {
    all: ['tags'] as const,
    lists: () => [...queryKeys.tags.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.tags.lists(), userId] as const,
    details: () => [...queryKeys.tags.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tags.details(), id] as const,
    stats: () => [...queryKeys.tags.all, 'stats'] as const,
    stat: (userId: string, tagIds: string[]) =>
      [...queryKeys.tags.stats(), userId, tagIds.sort().join(',')] as const,
  },

  // Progress notes-related keys
  progressNotes: {
    all: ['progressNotes'] as const,
    lists: () => [...queryKeys.progressNotes.all, 'list'] as const,
    list: (projectId: string) => [...queryKeys.progressNotes.lists(), projectId] as const,
    details: () => [...queryKeys.progressNotes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.progressNotes.details(), id] as const,
  },

  // User-related keys
  user: {
    all: ['user'] as const,
    profile: (userId: string) => [...queryKeys.user.all, 'profile', userId] as const,
    metadata: (userId: string) => [...queryKeys.user.all, 'metadata', userId] as const,
    betaTesterStatus: (userId: string) => [...queryKeys.user.all, 'beta-tester', userId] as const,
    optimisticAvatar: (userId: string) =>
      [...queryKeys.user.all, 'optimistic-avatar', userId] as const,
  },

  // Stats and analytics keys
  stats: {
    all: ['stats'] as const,
    overview: (userId: string) => [...queryKeys.stats.all, 'overview', userId] as const,
    analytics: (userId: string) => [...queryKeys.stats.all, 'analytics', userId] as const,
    availableYears: (userId: string) => [...queryKeys.stats.all, 'availableYears', userId] as const,
  },

  // Dashboard filter state keys (for optimistic updates)
  dashboardFilters: {
    all: ['dashboardFilters'] as const,
    state: (userId: string) => [...queryKeys.dashboardFilters.all, 'state', userId] as const,
  },
} as const;
