/**
 * Dashboard Stats Types
 *
 * Simplified and type-safe interfaces for the new consolidated stats service.
 * Part of the stats caching simplification plan.
 */

import { z } from 'zod';

// Status breakdown for all project statuses
export const StatusBreakdownSchema = z.object({
  wishlist: z.number().min(0),
  purchased: z.number().min(0),
  stash: z.number().min(0),
  progress: z.number().min(0),
  completed: z.number().min(0),
  archived: z.number().min(0),
  destashed: z.number().min(0),
});

export type StatusBreakdown = z.infer<typeof StatusBreakdownSchema>;

// Core yearly statistics
export const YearlyStatsSchema = z.object({
  completed_count: z.number().min(0).int(),
  in_progress_count: z.number().min(0).int(),
  total_diamonds: z.number().min(0).int(),
  status_breakdown: StatusBreakdownSchema,
});

export type YearlyStats = z.infer<typeof YearlyStatsSchema>;

// Cache metadata
export const CacheMetadataSchema = z.object({
  last_calculated: z.string(), // ISO date string
  calculation_duration_ms: z.number().min(0),
  projects_included: z.number().min(0),
  cache_version: z.string(),
});

export type CacheMetadata = z.infer<typeof CacheMetadataSchema>;

// Complete cached stats record (matches PocketBase schema)
export const CachedStatsRecordSchema = YearlyStatsSchema.extend({
  id: z.string(),
  user: z.string(),
  year: z.number().min(2020).max(2050),
  stats_type: z.literal('yearly'),
  created: z.string(),
  updated: z.string(),
}).merge(CacheMetadataSchema);

export type CachedStatsRecord = z.infer<typeof CachedStatsRecordSchema>;

// Stats result with source information
export const StatsResultSchema = z.object({
  stats: YearlyStatsSchema,
  source: z.enum(['cache', 'realtime', 'fallback']),
  cached_at: z.string().optional(),
  calculation_time_ms: z.number().min(0),
});

export type StatsResult = z.infer<typeof StatsResultSchema>;

// Input for creating new cache records
export const CreateStatsParamsSchema = z.object({
  user: z.string(),
  year: z.number().min(2020).max(2050),
  stats_type: z.literal('yearly'),
  completed_count: z.number().min(0).int(),
  in_progress_count: z.number().min(0).int(),
  total_diamonds: z.number().min(0).int(),
  status_breakdown: StatusBreakdownSchema,
  calculation_duration_ms: z.number().min(0),
  projects_included: z.number().min(0),
  cache_version: z.string(),
});

export type CreateStatsParams = z.infer<typeof CreateStatsParamsSchema>;

// Error types for better error handling
export class StatsServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'CACHE_READ_ERROR'
      | 'CACHE_WRITE_ERROR'
      | 'CALCULATION_ERROR'
      | 'VALIDATION_ERROR',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'StatsServiceError';
    Object.setPrototypeOf(this, StatsServiceError.prototype);
  }
}

// Configuration for the stats service
export interface StatsServiceConfig {
  cacheExpirationMs: number; // How long cache is valid
  retryAttempts: number; // Number of retry attempts for failed operations
  timeoutMs: number; // Timeout for individual operations
  enableLogging: boolean; // Enable debug logging
  backgroundRefreshThreshold: number; // When to trigger background refresh (0.0-1.0 of cache lifetime)
  maxBackgroundRefreshDelay: number; // Maximum delay before background refresh starts
}

// Default configuration
export const DEFAULT_STATS_CONFIG: StatsServiceConfig = {
  cacheExpirationMs: 60 * 60 * 1000, // 1 hour
  retryAttempts: 2,
  timeoutMs: 10000, // 10 seconds
  enableLogging: import.meta.env.DEV,
  backgroundRefreshThreshold: 0.75, // Refresh when 75% of cache life elapsed
  maxBackgroundRefreshDelay: 5000, // Max 5 seconds delay
};

// Legacy interface compatibility (for gradual migration)
export interface LegacyOverviewStats {
  completedCount: number;
  inProgressCount: number;
  totalDiamonds: number;
}
