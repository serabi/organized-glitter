/**
 * Filter actions types and interfaces
 * @author @serabi
 * @created 2025-08-02
 */

import { ProjectFilterStatus } from '@/types/project';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { FilterState, SortDirectionType, ViewType, ChangeSource } from '@/contexts/filterState';

/**
 * Context interface for filter actions management
 */
export interface FilterActionsContextType {
  // Filter update actions
  updateStatus: (status: ProjectFilterStatus, source?: ChangeSource) => void;
  updateCompany: (company: string | null, source?: ChangeSource) => void;
  updateArtist: (artist: string | null, source?: ChangeSource) => void;
  updateDrillShape: (shape: string | null, source?: ChangeSource) => void;
  updateYearFinished: (year: string | null, source?: ChangeSource) => void;
  updateIncludeMiniKits: (include: boolean, source?: ChangeSource) => void;
  updateIncludeDestashed: (include: boolean, source?: ChangeSource) => void;
  updateIncludeArchived: (include: boolean, source?: ChangeSource) => void;
  updateIncludeWishlist: (include: boolean, source?: ChangeSource) => void;
  updateIncludeOnHold: (include: boolean, source?: ChangeSource) => void;
  updateSearchTerm: (term: string, source?: ChangeSource) => void;
  updateTags: (tags: string[], source?: ChangeSource) => void;
  toggleTag: (tagId: string, source?: ChangeSource) => void;
  clearAllTags: (source?: ChangeSource) => void;
  updateSort: (
    field: DashboardValidSortField,
    direction: SortDirectionType,
    source?: ChangeSource
  ) => void;
  updatePage: (page: number, source?: ChangeSource) => void;
  updatePageSize: (size: number, source?: ChangeSource) => void;
  updateViewType: (type: ViewType, source?: ChangeSource) => void;
  resetAllFilters: (source?: ChangeSource) => void;
  batchUpdateFilters: (updates: Partial<FilterState>, source?: ChangeSource) => void;

  // Computed values
  getActiveFilterCount: () => number;
}