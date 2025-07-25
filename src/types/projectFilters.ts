/**
 * Type-safe project filter interfaces for structured query building
 * @author @serabi
 * @created 2025-07-16
 */

import { ProjectStatus, Project } from './project';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { SortDirectionType } from '@/contexts/FilterProvider';

/**
 * Main project filter interface - replaces manual filter string building
 */
export interface ProjectFilters {
  /** Filter by project status */
  status?: ProjectFilterStatus;
  /** Filter by company ID */
  company?: string;
  /** Filter by artist ID */
  artist?: string;
  /** Filter by drill shape */
  drillShape?: string;
  /** Filter by year finished */
  yearFinished?: string;
  /** Include mini kits in results */
  includeMiniKits?: boolean;
  /** Include destashed projects */
  includeDestashed?: boolean;
  /** Include archived projects */
  includeArchived?: boolean;
  /** Include wishlist projects */
  includeWishlist?: boolean;
  /** Search term for title and notes */
  searchTerm?: string;
  /** Selected tag IDs */
  selectedTags?: string[];
  /** User ID for data isolation */
  userId: string;
}

/**
 * Project filter status type - includes 'all' for no status filtering
 */
export type ProjectFilterStatus = ProjectStatus | 'all';

/**
 * Project sort configuration
 */
export interface ProjectSort {
  /** Sort field */
  field: DashboardValidSortField;
  /** Sort direction */
  direction: SortDirectionType;
}

/**
 * Project query options for service layer
 */
export interface ProjectQueryOptions {
  /** Filter criteria */
  filters: ProjectFilters;
  /** Sort configuration */
  sort: ProjectSort;
  /** Page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Whether to expand related data */
  expand?: ProjectExpandOptions;
  /** Whether to include status counts */
  includeStatusCounts?: boolean;
}

/**
 * Expand options for related data
 */
export interface ProjectExpandOptions {
  /** Include project tags */
  tags?: boolean;
  /** Include company data */
  company?: boolean;
  /** Include artist data */
  artist?: boolean;
  /** Include user data */
  user?: boolean;
}

/**
 * Project query result with metadata
 */
export interface ProjectQueryResult {
  /** Project records */
  projects: Project[];
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page */
  currentPage: number;
  /** Items per page */
  pageSize: number;
  /** Status breakdown counts */
  statusCounts?: StatusBreakdown;
}

/**
 * Status breakdown for dashboard counters
 */
export interface StatusBreakdown {
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  completed: number;
  archived: number;
  destashed: number;
}

/**
 * Filter builder result for internal use
 */
export interface FilterBuilderResult {
  /** PocketBase filter string */
  filter: string;
  /** Sort string for PocketBase */
  sort: string;
  /** Expand string for PocketBase */
  expand?: string;
}

/**
 * Status count query configuration
 */
export interface StatusCountQuery {
  /** Status to count */
  status: ProjectFilterStatus;
  /** Base filters to apply */
  baseFilters: Omit<ProjectFilters, 'status'>;
  /** Skip checkbox filters for accurate counts */
  skipCheckboxFilters?: boolean;
}

/**
 * Batch status count result
 */
export interface BatchStatusCountResult {
  /** Status counts */
  counts: StatusBreakdown;
  /** Total across all statuses */
  total: number;
}

/**
 * Project service configuration
 */
export interface ProjectServiceConfig {
  /** Default page size */
  defaultPageSize: number;
  /** Default sort field */
  defaultSortField: DashboardValidSortField;
  /** Default sort direction */
  defaultSortDirection: SortDirectionType;
  /** Default expand options */
  defaultExpand: ProjectExpandOptions;
  /** Enable performance logging */
  enablePerformanceLogging: boolean;
}

/**
 * Project update data for service operations
 */
export interface ProjectUpdateData {
  /** Project title */
  title?: string;
  /** Company ID */
  company?: string;
  /** Artist ID */
  artist?: string;
  /** Project status */
  status?: ProjectStatus;
  /** Kit category */
  kit_category?: string;
  /** Drill shape */
  drill_shape?: string;
  /** Date purchased */
  date_purchased?: string;
  /** Date received */
  date_received?: string;
  /** Date started */
  date_started?: string;
  /** Date completed */
  date_completed?: string;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** Total diamonds */
  total_diamonds?: number;
  /** General notes */
  general_notes?: string;
  /** Source URL */
  source_url?: string;
  /** Image file */
  image?: File | null;
  /** Index signature for compatibility with Record<string, unknown> */
  [key: string]: unknown;
}

/**
 * Project creation data for service operations
 */
export interface ProjectCreateData extends Omit<ProjectUpdateData, 'status'> {
  /** User ID - required for creation */
  user: string;
  /** Project status - defaults to 'wishlist' */
  status?: ProjectStatus;
}

// Re-export related types for convenience
export type { Project } from './project';
export type { ProjectStatus } from './project';
export type { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
export type { SortDirectionType } from '@/contexts/FilterProvider';
