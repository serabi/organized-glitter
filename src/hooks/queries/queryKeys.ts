import { ServerFilters } from './useProjects';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { SortDirectionType } from '@/contexts/DashboardFiltersContext';

export interface ProjectQueryParams {
  filters: ServerFilters;
  sortField: DashboardValidSortField;
  sortDirection: SortDirectionType;
  currentPage: number;
  pageSize: number;
}

export const queryKeys = {
  // Project-related keys
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (userId: string, params: ProjectQueryParams) =>
      [...queryKeys.projects.lists(), userId, params] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    advanced: (userId: string) => [...queryKeys.projects.all, 'advanced', userId] as const,
  },

  // Company-related keys
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.companies.lists(), userId] as const,
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
  },
} as const;
