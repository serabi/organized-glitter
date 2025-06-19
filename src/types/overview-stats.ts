import { ProjectsResponse, CompaniesResponse, ArtistsResponse } from '@/types/pocketbase.types';
import { ProjectType } from '@/types/project';

export interface ExpandedProjectsResponse extends ProjectsResponse {
  expand?: {
    company?: CompaniesResponse;
    artist?: ArtistsResponse;
  };
}

export interface OverviewStats {
  completedCount: number;
  estimatedDrills: number;
  startedCount: number;
  inProgressCount: number;
  totalDiamonds: number;
}

export interface OverviewStatsResult {
  stats: OverviewStats;
  inProgressProjects: ProjectType[];
}

export interface StatsCache {
  userId: string;
  data: OverviewStatsResult;
  timestamp: number;
  ttl: number;
}

export interface EmptyUserCache {
  userId: string;
  isEmptyUser: boolean;
  lastChecked: number;
  ttl: number;
}

export interface PerformanceReport {
  totalTime: string;
  expectedImprovement: string;
  breakdown: {
    completedQuery: string;
    startedQuery: string;
    inProgressQuery: string;
  };
  optimizations: string[];
  cacheStrategy: {
    'Stats Cache': string;
    'Empty User Cache': string;
    'Expected Performance': {
      'Cached User': string;
      'Empty User': string;
      'New Data': string;
    };
  };
}
