/**
 * Filter types
 * @author @serabi
 * @created 2025-08-02
 */

import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { ProjectFilterStatus } from '@/types/project';

/**
 * Core filter state
 */
export interface FilterState {
  // Server-side filters
  activeStatus: ProjectFilterStatus;
  selectedCompany: string;
  selectedArtist: string;
  selectedDrillShape: string;
  selectedYearFinished: string;
  includeMiniKits: boolean;
  includeDestashed: boolean;
  includeArchived: boolean;
  includeWishlist: boolean;
  includeOnHold: boolean;
  searchTerm: string;
  selectedTags: string[];

  // Sorting
  sortField: DashboardValidSortField;
  sortDirection: 'asc' | 'desc';

  // Pagination
  currentPage: number;
  pageSize: number;

  // View
  viewType: 'grid' | 'list';
}

/**
 * Default filter state factory
 */
export const getDefaultFilters = (isMobilePhone = false): FilterState => ({
  activeStatus: 'active',
  selectedCompany: 'all',
  selectedArtist: 'all',
  selectedDrillShape: 'all',
  selectedYearFinished: 'all',
  includeMiniKits: true,
  includeDestashed: false,
  includeArchived: false,
  includeWishlist: false,
  includeOnHold: true,
  searchTerm: '',
  selectedTags: [],
  sortField: 'last_updated',
  sortDirection: 'desc',
  currentPage: 1,
  pageSize: 25,
  viewType: isMobilePhone ? 'list' : 'grid',
});
