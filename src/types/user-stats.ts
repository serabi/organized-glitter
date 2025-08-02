/**
 * User Stats Collection Types
 *
 * Types for the user_yearly_stats collection that caches expensive
 * overview statistics calculations for performance and dashboard features.
 */

import type { RecordIdString, IsoDateString } from './pocketbase.types';

export type StatsType = 'yearly' | 'monthly' | 'all_time';

export interface StatusBreakdown {
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  onhold: number;
  completed: number;
  archived: number;
  destashed: number;
}

export interface UserYearlyStatsRecord {
  id: RecordIdString;
  user: RecordIdString;
  year: number;
  month?: number; // null for yearly aggregates, 1-12 for monthly
  stats_type: StatsType;

  // Core overview stats (matching OverviewStats interface)
  completed_count: number;
  started_count: number;
  in_progress_count: number;
  total_diamonds: number;
  estimated_drills: number;

  // Dashboard features
  status_breakdown?: StatusBreakdown;

  // Cache metadata
  last_calculated: IsoDateString;
  calculation_duration_ms?: number;
  projects_included: number;
  cache_version?: string;

  // System fields
  created: IsoDateString;
  updated: IsoDateString;
}

export interface UserYearlyStatsResponse extends UserYearlyStatsRecord {
  collectionId: string;
  collectionName: 'user_yearly_stats';
}

/**
 * Parameters for creating or updating cached stats
 */
export interface CreateStatsParams {
  user: RecordIdString;
  year: number;
  month?: number;
  stats_type: StatsType;
  completed_count: number;
  started_count: number;
  in_progress_count: number;
  total_diamonds: number;
  estimated_drills: number;
  status_breakdown?: StatusBreakdown;
  calculation_duration_ms?: number;
  projects_included: number;
  cache_version?: string;
}
