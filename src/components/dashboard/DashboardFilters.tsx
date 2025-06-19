import React, { useMemo } from 'react';
import SearchProjects from '@/components/dashboard/SearchProjects';
import FilterDropdown from '@/components/dashboard/FilterDropdown';
import ViewToggle from '@/components/dashboard/ViewToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useDashboardFiltersContext } from '@/hooks/useDashboardFiltersContext'; // Import context
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants'; // Import type from constants

// No longer need to define ValidSortField here, it's imported from context
// export type ValidSortField = DashboardFiltersContextValue['sortField'];

// No longer need DATE_SORT_FIELDS_FOR_LABELS here, logic will be direct

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DashboardFiltersProps {
  // All props will be removed as they come from context
}

const DashboardFiltersComponent: React.FC<DashboardFiltersProps> = () => {
  const {
    searchTerm,
    applySearchTerm, // Renamed from onSearchChange
    searchInputRef,
    isSearchPending, // OG-91: Add search pending state
    selectedCompany,
    applyCompanyFilter, // Renamed from setSelectedCompany
    selectedArtist,
    applyArtistFilter, // Renamed from setSelectedArtist
    selectedDrillShape,
    applyDrillShapeFilter, // Renamed from setSelectedDrillShape
    applyTagFilter, // Renamed from setSelectedTag
    clearTagFilters,
    selectedTags,
    selectedYearFinished,
    applyYearFinishedFilter,
    includeMiniKits,
    applyIncludeMiniKitsFilter, // Renamed from setIncludeMiniKits
    viewType,
    applyViewType, // Renamed from setViewType
    companies,
    artists,
    drillShapes,
    allTags,
    yearFinishedOptions,
    isLoadingProjects, // Renamed from loading
    sortField: contextSortField, // Rename to avoid conflict with local `sortField` if any, or use directly
    sortDirection,
    applySort, // Renamed from onSortChange
    resetAllFilters,
    getActiveFilterCount,
  } = useDashboardFiltersContext();

  // Use contextSortField, providing a default if it's undefined, as FilterDropdown expects a non-undefined value for `value`
  const currentSortField = contextSortField || 'last_updated';

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
        onSearchChange={applySearchTerm} // Use context action
        inputRef={searchInputRef}
        isPending={isSearchPending} // OG-91: Show loading state
      />

      <div className="mt-6 space-y-4">
        <FilterDropdown
          label="Company"
          options={companies}
          value={selectedCompany}
          onChange={applyCompanyFilter} // Use context action
          placeholder="All companies"
        />

        <FilterDropdown
          label="Artist"
          options={artists}
          value={selectedArtist}
          onChange={applyArtistFilter} // Use context action
          placeholder="All artists"
        />

        <FilterDropdown
          label="Drill Shape"
          options={drillShapes}
          value={selectedDrillShape}
          onChange={applyDrillShapeFilter} // Use context action
          placeholder="All drill shapes"
        />

        <FilterDropdown
          label="Tag"
          options={allTags.map(tag => ({ label: tag.name, value: tag.id }))}
          value={selectedTags.length > 0 ? selectedTags[0] : 'all'} // Show first selected tag or "all"
          onChange={value => {
            if (value === 'all') {
              // Clear all tag filters when "All Tags" is selected
              clearTagFilters();
            } else {
              // Clear existing tags and set the new single tag
              // This ensures only one tag is selected at a time via the dropdown
              clearTagFilters();
              applyTagFilter(value);
            }
          }}
          placeholder="All tags"
        />

        <FilterDropdown
          label="Year Finished"
          options={yearFinishedOptions}
          value={selectedYearFinished}
          onChange={applyYearFinishedFilter}
          placeholder="All years"
        />

        <div className="mt-4 flex items-center space-x-2">
          <Checkbox
            id="include-mini-kits"
            checked={includeMiniKits}
            onCheckedChange={checked => applyIncludeMiniKitsFilter(Boolean(checked))} // Use context action
            data-testid="include-mini-kits-checkbox"
          />
          <Label htmlFor="include-mini-kits" className="text-sm font-medium">
            Include Mini Kits?
          </Label>
        </div>

        <Button
          variant="outline"
          onClick={resetAllFilters} // Use context action
          className="mt-4 w-full"
          data-testid="reset-filters-button"
        >
          Reset Filters
        </Button>

        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium">View</h3>
          <ViewToggle
            activeView={viewType}
            onViewChange={applyViewType} // Use context action
          />
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
              value={currentSortField} // Use the defaulted sort field
              onChange={value => {
                const newSortField = value as DashboardValidSortField | undefined;
                applySort(newSortField || 'last_updated', sortDirection || 'desc'); // Ensure non-undefined field
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
                // Ensure value is a valid SortDirectionType before calling applySort
                if (value === 'asc' || value === 'desc') {
                  applySort(currentSortField, value);
                } else {
                  // Handle unexpected value, perhaps log an error or default
                  console.warn(
                    `DashboardFilters: Invalid sort direction value received: ${value}. Defaulting to 'desc'.`
                  );
                  applySort(currentSortField, 'desc');
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
};

export default React.memo(DashboardFiltersComponent);
