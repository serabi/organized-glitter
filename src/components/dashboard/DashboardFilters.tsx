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
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import { secureLogger } from '@/utils/secureLogger';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants'; // Import type from constants

// No longer need to define ValidSortField here, it's imported from context
// export type ValidSortField = DashboardFiltersContextValue['sortField'];

// No longer need DATE_SORT_FIELDS_FOR_LABELS here, logic will be direct

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DashboardFiltersProps {
  // All props will be removed as they come from context
}

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
    updateIncludeDestashed,
    updateIncludeArchived,
    updateViewType,
    companies,
    artists,
    drillShapes,
    allTags,
    yearFinishedOptions,
    isLoadingProjects,
    updateSort,
    resetAllFilters,
    getActiveFilterCount,
    searchInputRef,
    isSearchPending,
  } = useDashboardFilters();

  // Extract values from filters with defaults
  const searchTerm = filters.searchTerm;
  const selectedCompany = filters.selectedCompany;
  const selectedArtist = filters.selectedArtist;
  const selectedDrillShape = filters.selectedDrillShape;
  const selectedTags = filters.selectedTags;
  const selectedYearFinished = filters.selectedYearFinished;
  const includeMiniKits = filters.includeMiniKits;
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
      className="dark:glass-card sticky top-20 rounded-lg bg-white p-6 shadow"
      data-testid="dashboard-filters"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        {getActiveFilterCount() > 0 && (
          <Badge variant="secondary">{getActiveFilterCount()} Active</Badge>
        )}
      </div>

      {isLoadingProjects && (
        <div className="mb-4 text-sm text-muted-foreground">Loading filters...</div>
      )}

      <SearchProjects
        searchTerm={searchTerm}
        onSearchChange={updateSearchTerm}
        inputRef={searchInputRef}
        isPending={isSearchPending}
      />

      <div className="mt-6 space-y-4">
        <FilterDropdown
          label="Company"
          options={companies}
          value={selectedCompany}
          onChange={updateCompany}
          placeholder="All companies"
        />

        <FilterDropdown
          label="Artist"
          options={artists}
          value={selectedArtist}
          onChange={updateArtist}
          placeholder="All artists"
        />

        <FilterDropdown
          label="Drill Shape"
          options={drillShapes}
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

        <div className="mt-4 flex items-center space-x-2">
          <Checkbox
            id="include-mini-kits"
            checked={includeMiniKits}
            onCheckedChange={checked => updateIncludeMiniKits(Boolean(checked))}
            data-testid="include-mini-kits-checkbox"
          />
          <Label htmlFor="include-mini-kits" className="text-sm font-medium">
            Include Mini Kits?
          </Label>
        </div>

        <div className="mt-4 flex items-center space-x-2">
          <Checkbox
            id="include-destashed-kits"
            checked={includeDestashed}
            onCheckedChange={checked => updateIncludeDestashed(Boolean(checked))}
            data-testid="include-destashed-checkbox"
          />
          <Label htmlFor="include-destashed-kits" className="text-sm font-medium">
            Include Destashed Kits?
          </Label>
        </div>

        <div className="mt-4 flex items-center space-x-2">
          <Checkbox
            id="include-archived-kits"
            checked={includeArchived}
            onCheckedChange={checked => updateIncludeArchived(Boolean(checked))}
            data-testid="include-archived-checkbox"
          />
          <Label htmlFor="include-archived-kits" className="text-sm font-medium">
            Include Archived Kits?
          </Label>
        </div>

        <Button
          variant="outline"
          onClick={resetAllFilters}
          className="mt-4 w-full"
          data-testid="reset-filters-button"
        >
          Reset Filters
        </Button>

        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium">View</h3>
          <ViewToggle activeView={viewType} onViewChange={updateViewType} />
        </div>

        <div className="mt-6">
          <div className="space-y-2">
            <FilterDropdown
              label="Sort by:"
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
              label="Order:"
              options={useMemo(() => {
                // Use currentSortField for logic
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
                // Ensure value is a valid SortDirectionType before calling updateSort
                if (value === 'asc' || value === 'desc') {
                  updateSort(currentSortField, value);
                } else {
                  // Handle unexpected value, perhaps log an error or default
                  secureLogger.warn(
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
      </div>
    </div>
  );
});

DashboardFiltersComponent.displayName = 'DashboardFilters';

export default DashboardFiltersComponent;
