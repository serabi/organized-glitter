/**
 * @fileoverview Main Dashboard Filters Component
 *
 * This component provides a comprehensive filtering interface for the dashboard projects view.
 * It includes search, multiple filter dropdowns, view toggles, sorting controls, and a reset
 * option. All state management is handled through the DashboardFiltersContext.
 *
 * Key Features:
 * - Real-time search with debounced input
 * - Company, artist, drill shape, tag, and year filters
 * - Include/exclude mini kits toggle
 * - Grid/list view toggle
 * - Dynamic sorting with field-specific direction labels
 * - Active filter count badge
 * - Reset all filters functionality
 * - Responsive design with sticky positioning
 *
 * Filter Behavior:
 * - All filters are applied server-side for performance
 * - Tag filtering supports single selection via dropdown
 * - Sort direction labels change based on selected field
 * - Filter state persists to database on navigation
 *
 * @author serabi
 * @since 2025-07-03
 * @version 1.0.0 - Context-based filtering system
 */

import React, { useMemo } from 'react';
import SearchProjects from '@/components/dashboard/SearchProjects';
import FilterDropdown from '@/components/dashboard/FilterDropdown';
import ViewToggle from '@/components/dashboard/ViewToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useFiltersFull } from '@/contexts/FilterProvider';
import { useAvailableYears } from '@/hooks/queries/useAvailableYears';
import { useProjectStatus } from '@/hooks/useProjectStatus';
import { logger } from '@/utils/logger';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants'; // Import type from constants
import { ProjectFilterStatus } from '@/types/project';

// No longer need to define ValidSortField here, it's imported from context
// export type ValidSortField = DashboardFiltersContextValue['sortField'];

// No longer need DATE_SORT_FIELDS_FOR_LABELS here, logic will be direct

export type DashboardFiltersProps = Record<string, never>;

const DashboardFiltersComponent: React.FC<DashboardFiltersProps> = React.memo(() => {
  const {
    filters,
    updateSearchTerm,
    updateCompany,
    updateArtist,
    updateDrillShape,
    toggleTag,
    clearAllTags,
    updateYearFinished,
    updateIncludeMiniKits,
    updateIncludeWishlist,
    updateIncludeDestashed,
    updateIncludeArchived,
    updateViewType,
    companiesOptions, // Use computed options for DashboardFilters
    artistsOptions, // Use computed options for DashboardFilters
    drillShapesOptions,
    tags: allTags, // Raw tags for tag filtering (already has id, name)
    updateSort,
    updateStatus,
    resetAllFilters,
    getActiveFilterCount,
    searchInputRef,
    isSearchPending,
  } = useFiltersFull();

  // Get available years from the appropriate hook
  const { data: availableYears = [] } = useAvailableYears();
  // Transform available years to the expected format for the dropdown
  const yearFinishedOptions = availableYears.map(year => ({
    label: year.toString(),
    value: year.toString(),
  }));

  // Get status utilities from hook
  const { statusOptions: availableStatuses, getStatusLabel } = useProjectStatus();

  // Create dynamic status options for the dropdown
  const statusOptions = useMemo(
    () => [
      { label: 'All Statuses', value: 'all' },
      ...availableStatuses.map(status => ({
        label: getStatusLabel(status),
        value: status,
      })),
    ],
    [availableStatuses, getStatusLabel]
  );

  // Extract values from filters with defaults
  const searchTerm = filters.searchTerm;
  const activeStatus = filters.activeStatus;
  const selectedCompany = filters.selectedCompany;
  const selectedArtist = filters.selectedArtist;
  const selectedDrillShape = filters.selectedDrillShape;
  const selectedTags = filters.selectedTags;
  const selectedYearFinished = filters.selectedYearFinished;
  const includeMiniKits = filters.includeMiniKits;
  const includeWishlist = filters.includeWishlist;
  const includeDestashed = filters.includeDestashed;
  const includeArchived = filters.includeArchived;
  const viewType = filters.viewType;
  const sortField = filters.sortField;
  const sortDirection = filters.sortDirection;

  // Use sortField, providing a default if it's undefined, as FilterDropdown expects a non-undefined value for `value`
  const currentSortField = sortField;

  // Removed excessive logging for performance
  // useEffect(() => {
  //   console.log('DashboardFilters - Available companies (context):', companies);
  //   console.log('DashboardFilters - Available artists (context):', artists);
  //   console.log('DashboardFilters - Selected artist (context):', selectedArtist);
  //   console.log('DashboardFilters - Loading state (context):', isLoadingProjects);
  // }, [artists, companies, selectedArtist, isLoadingProjects]);

  return (
    <div
      className="dark:glass-card rounded-lg bg-white p-6 shadow md:sticky md:top-20"
      data-testid="dashboard-filters"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        {getActiveFilterCount() > 0 && (
          <Badge variant="secondary">{getActiveFilterCount()} Active</Badge>
        )}
      </div>

      {/* Search Section */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Search</label>
        <SearchProjects
          searchTerm={searchTerm}
          onSearchChange={updateSearchTerm}
          inputRef={searchInputRef}
          isPending={isSearchPending}
        />
      </div>

      <div className="space-y-5">
        <FilterDropdown
          label="Status"
          options={statusOptions}
          value={activeStatus}
          onChange={value => updateStatus(value as ProjectFilterStatus)}
          placeholder="All statuses"
          showAllOption={false}
        />

        <FilterDropdown
          label="Company"
          options={companiesOptions}
          value={selectedCompany}
          onChange={updateCompany}
          placeholder="All companies"
        />

        <FilterDropdown
          label="Artist"
          options={artistsOptions}
          value={selectedArtist}
          onChange={updateArtist}
          placeholder="All artists"
        />

        <FilterDropdown
          label="Drill Shape"
          options={drillShapesOptions}
          value={selectedDrillShape}
          onChange={updateDrillShape}
          placeholder="All drill shapes"
        />

        <FilterDropdown
          label="Tag"
          options={allTags?.map(tag => ({ label: tag.name, value: tag.id })) || []}
          value={selectedTags.length > 0 ? selectedTags[0] : 'all'} // Show first selected tag or "all"
          onChange={value => {
            if (value === 'all') {
              // Clear all tag filters when "All Tags" is selected
              clearAllTags();
            } else {
              // Clear existing tags and set the new single tag
              // This ensures only one tag is selected at a time via the dropdown
              clearAllTags();
              toggleTag(value);
            }
          }}
          placeholder="All tags"
        />

        <FilterDropdown
          label="Year Finished"
          options={yearFinishedOptions}
          value={selectedYearFinished}
          onChange={updateYearFinished}
          placeholder="All years"
        />

        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="mb-4 text-sm font-semibold leading-relaxed">
            Kit Display Options for All Projects View
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="include-mini-kits"
                checked={includeMiniKits}
                onCheckedChange={checked => updateIncludeMiniKits(Boolean(checked))}
                data-testid="include-mini-kits-checkbox"
              />
              <Label htmlFor="include-mini-kits" className="text-sm font-normal">
                Include Mini Kits
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="include-wishlist-kits"
                checked={includeWishlist}
                onCheckedChange={checked => updateIncludeWishlist(Boolean(checked))}
                data-testid="include-wishlist-checkbox"
              />
              <Label htmlFor="include-wishlist-kits" className="text-sm font-normal">
                Include Wishlisted Kits
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="include-destashed-kits"
                checked={includeDestashed}
                onCheckedChange={checked => updateIncludeDestashed(Boolean(checked))}
                data-testid="include-destashed-checkbox"
              />
              <Label htmlFor="include-destashed-kits" className="text-sm font-normal">
                Include Destashed Kits
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="include-archived-kits"
                checked={includeArchived}
                onCheckedChange={checked => updateIncludeArchived(Boolean(checked))}
                data-testid="include-archived-checkbox"
              />
              <Label htmlFor="include-archived-kits" className="text-sm font-normal">
                Include Archived Kits
              </Label>
            </div>
          </div>
        </div>

        {/* View Controls */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">View & Sort</h3>
          <ViewToggle activeView={viewType} onViewChange={updateViewType} />

          <div className="space-y-3">
            <FilterDropdown
              label="Sort by"
              options={[
                { label: 'Default', value: 'last_updated' },
                { label: 'Alphabetical by Kit Name', value: 'kit_name' },
                { label: 'Date Purchased', value: 'date_purchased' },
                { label: 'Date Finished', value: 'date_finished' },
                { label: 'Date Started', value: 'date_started' },
                { label: 'Date Received', value: 'date_received' },
              ]}
              value={currentSortField}
              onChange={value => {
                const newSortField = value as DashboardValidSortField | undefined;
                updateSort(newSortField || 'last_updated', sortDirection || 'desc');
              }}
              placeholder="Select field"
              showAllOption={false}
            />
            <FilterDropdown
              label="Order"
              options={useMemo(() => {
                if (currentSortField === 'kit_name') {
                  return [
                    { label: 'Z-A', value: 'desc' },
                    { label: 'A-Z', value: 'asc' },
                  ];
                } else if (currentSortField === 'last_updated') {
                  return [
                    { label: 'Most Recently Modified', value: 'desc' },
                    { label: 'Least Recently Modified', value: 'asc' },
                  ];
                } else {
                  return [
                    { label: 'Newest First', value: 'desc' },
                    { label: 'Oldest First', value: 'asc' },
                  ];
                }
              }, [currentSortField])}
              value={sortDirection}
              onChange={value => {
                if (value === 'asc' || value === 'desc') {
                  updateSort(currentSortField, value);
                } else {
                  logger.warn(
                    `DashboardFilters: Invalid sort direction value received: ${value}. Defaulting to 'desc'.`
                  );
                  updateSort(currentSortField, 'desc');
                }
              }}
              placeholder="Select order"
              showAllOption={false}
            />
          </div>
        </div>

        {/* Reset Button */}
        <Button
          variant="outline"
          onClick={() => resetAllFilters('user')}
          className="w-full"
          data-testid="reset-filters-button"
        >
          Reset All Filters
        </Button>
      </div>
    </div>
  );
});

DashboardFiltersComponent.displayName = 'DashboardFilters';

export default DashboardFiltersComponent;
