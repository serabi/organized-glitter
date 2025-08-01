export interface StatusBreakdown {
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  completed: number;
  archived: number;
  destashed: number;
  onhold: number;
}

export interface DashboardStats {
  completed_count: number;
  started_count: number;
  in_progress_count: number;
  total_diamonds: number;
  estimated_drills: number;
  status_breakdown: StatusBreakdown;
  available_years: number[];
}

export interface DashboardStatsResult {
  stats: DashboardStats | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  source: 'optimized' | 'legacy' | 'unknown';
}
