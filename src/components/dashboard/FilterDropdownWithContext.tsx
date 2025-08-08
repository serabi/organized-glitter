/**
 * Context-aware filter dropdown components
 * @author @serabi
 * @created 2025-07-09
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFilters, useFilterHelpers } from '@/contexts/FilterContext';
import { useAllCompanies } from '@/hooks/queries/useCompanies';
import { useArtists } from '@/hooks/queries/useArtists';
import { useTags } from '@/hooks/queries/useTags';
import { ProjectsDrillShapeOptions } from '@/types/pocketbase.types';
import { useAuth } from '@/hooks/useAuth';

interface OptionType {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  label: string;
  options: OptionType[] | string[] | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
}

// Generic FilterDropdown (keeps existing interface for backward compatibility)
const FilterDropdown = React.memo(
  ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Select...',
    showAllOption = true,
  }: FilterDropdownProps) => {
    const safeOptions = options || [];

    const getPluralLabel = (label: string) => {
      const lowerLabel = label.toLowerCase();
      if (lowerLabel === 'company') {
        return 'Companies';
      }
      if (lowerLabel === 'year finished') {
        return 'Years';
      }
      return `${label}s`;
    };

    const formattedOptions = safeOptions.map(option =>
      typeof option === 'string' ? { label: option, value: option } : option
    );

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {showAllOption && <SelectItem value="all">All {getPluralLabel(label)}</SelectItem>}
            {formattedOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
);

FilterDropdown.displayName = 'FilterDropdown';

// Context-aware specialized components
export const CompanyFilter = React.memo(() => {
  const { filters } = useFilters();
  const { updateCompany } = useFilterHelpers();
  const { user } = useAuth();
  const userId = user?.id;

  const { data: companiesData } = useAllCompanies(userId);
  const companiesOptions =
    companiesData?.map(company => ({
      label: company.name,
      value: company.name,
    })) || [];

  return (
    <FilterDropdown
      label="Company"
      options={companiesOptions}
      value={filters.selectedCompany || 'all'}
      onChange={value => updateCompany(value === 'all' ? '' : value)}
      placeholder="Select company..."
    />
  );
});

export const ArtistFilter = React.memo(() => {
  const { filters } = useFilters();
  const { updateArtist } = useFilterHelpers();

  const { data: artistsData } = useArtists();
  const artistsOptions =
    artistsData?.map(artist => ({
      label: artist.name,
      value: artist.name,
    })) || [];

  return (
    <FilterDropdown
      label="Artist"
      options={artistsOptions}
      value={filters.selectedArtist || 'all'}
      onChange={value => updateArtist(value === 'all' ? '' : value)}
      placeholder="Select artist..."
    />
  );
});

export const DrillShapeFilter = React.memo(() => {
  const { filters } = useFilters();
  const { updateDrillShape } = useFilterHelpers();

  const drillShapes = Object.values(ProjectsDrillShapeOptions);
  const drillShapeOptions = drillShapes.map(shape => ({
    label: shape.charAt(0).toUpperCase() + shape.slice(1),
    value: shape,
  }));

  return (
    <FilterDropdown
      label="Drill Shape"
      options={drillShapeOptions}
      value={filters.selectedDrillShape || 'all'}
      onChange={value => updateDrillShape(value === 'all' ? '' : value)}
      placeholder="Select drill shape..."
    />
  );
});

export const TagFilter = React.memo(() => {
  const { filters } = useFilters();
  const { updateTags } = useFilterHelpers();

  const { data: tagsData } = useTags();
  const tagOptions =
    tagsData?.map(tag => ({
      label: tag.name,
      value: tag.id,
    })) || [];
  const selectedTag = filters.selectedTags.length > 0 ? filters.selectedTags[0] : 'all';

  return (
    <FilterDropdown
      label="Tag"
      options={tagOptions}
      value={selectedTag}
      onChange={value => updateTags(value === 'all' ? [] : [value])}
      placeholder="Select tag..."
    />
  );
});

CompanyFilter.displayName = 'CompanyFilter';
ArtistFilter.displayName = 'ArtistFilter';
DrillShapeFilter.displayName = 'DrillShapeFilter';
TagFilter.displayName = 'TagFilter';

export default FilterDropdown;
