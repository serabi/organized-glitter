import React from 'react';
import CollapsibleDashboardFilters from '@/components/dashboard/CollapsibleDashboardFilters';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
// import { ValidSortField as DashboardValidSortField } from '@/components/dashboard/DashboardFilters'; // Provided by context type
// SortDirectionType is now provided by context

interface DashboardFilterSectionProps {
  isMobile: boolean;
  // Most props will be removed as they come from context
  // searchInputRef?: React.RefObject<HTMLInputElement>; // From context
  // searchTerm: string;
  // onSearchChange: (term: string | null) => void;
  // selectedCompany: string;
  // setSelectedCompany: (company: string | null) => void;
  // selectedArtist: string;
  // setSelectedArtist: (artist: string | null) => void;
  // selectedDrillShape: string;
  // setSelectedDrillShape: (shape: string | null) => void;
  // selectedTag: string;
  // setSelectedTag: (tag: string | null) => void;
  // includeMiniKits: boolean;
  // setIncludeMiniKits: (include: boolean) => void;
  // viewType: 'grid' | 'list';
  // setViewType: (viewType: 'grid' | 'list') => void;
  // companies: string[];
  // artists: string[];
  // drillShapes: string[];
  // tags: string[];
  // sortField: DashboardValidSortField;
  // sortDirection: SortDirectionType;
  // onSortChange: (field: DashboardValidSortField, direction: string) => void; // This will be applySort from context
  // loading: boolean; // This is isLoadingProjects from context
  // resetAllFilters: () => void;
  // getActiveFilterCount: () => number;
}

const DashboardFilterSectionComponent: React.FC<DashboardFilterSectionProps> = ({
  isMobile,
  // No need to destructure other props here, they come from context
}) => {
  // const { ... } = useDashboardFiltersContext(); // No longer needed here, children will use it

  if (isMobile) {
    return (
      <CollapsibleDashboardFilters /> // Props will be consumed from context by CollapsibleDashboardFilters
    );
  } else {
    // Desktop filters are wrapped in a div that handles layout (col-span) and visibility
    return (
      <div className="hidden lg:col-span-1 lg:block">
        <DashboardFilters />
      </div>
    );
  }
};

export default React.memo(DashboardFilterSectionComponent);
