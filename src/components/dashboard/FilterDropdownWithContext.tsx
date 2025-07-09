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
import { useFilterActionsAndMeta, useFilterStateOnly } from '@/contexts/FilterProvider';

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
            {showAllOption && (
              <SelectItem value="all">All {getPluralLabel(label)}</SelectItem>
            )}
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
  const { companies, updateCompany } = useFilterActionsAndMeta();
  const { filters } = useFilterStateOnly();
  
  return (
    <FilterDropdown
      label="Company"
      options={companies}
      value={filters.selectedCompany}
      onChange={(value) => updateCompany(value === 'all' ? null : value)}
      placeholder="Select company..."
    />
  );
});

export const ArtistFilter = React.memo(() => {
  const { artists, updateArtist } = useFilterActionsAndMeta();
  const { filters } = useFilterStateOnly();
  
  return (
    <FilterDropdown
      label="Artist"
      options={artists}
      value={filters.selectedArtist}
      onChange={(value) => updateArtist(value === 'all' ? null : value)}
      placeholder="Select artist..."
    />
  );
});

export const DrillShapeFilter = React.memo(() => {
  const { drillShapes, updateDrillShape } = useFilterActionsAndMeta();
  const { filters } = useFilterStateOnly();
  
  return (
    <FilterDropdown
      label="Drill Shape"
      options={drillShapes.map(shape => ({ label: shape, value: shape }))}
      value={filters.selectedDrillShape}
      onChange={(value) => updateDrillShape(value === 'all' ? null : value)}
      placeholder="Select drill shape..."
    />
  );
});

export const TagFilter = React.memo(() => {
  const { allTags, updateTags } = useFilterActionsAndMeta();
  const { filters } = useFilterStateOnly();
  
  const tagOptions = allTags.map(tag => ({ label: tag.name, value: tag.id }));
  const selectedTag = filters.selectedTags.length > 0 ? filters.selectedTags[0] : 'all';
  
  return (
    <FilterDropdown
      label="Tag"
      options={tagOptions}
      value={selectedTag}
      onChange={(value) => updateTags(value === 'all' ? [] : [value])}
      placeholder="Select tag..."
    />
  );
});

CompanyFilter.displayName = 'CompanyFilter';
ArtistFilter.displayName = 'ArtistFilter';
DrillShapeFilter.displayName = 'DrillShapeFilter';
TagFilter.displayName = 'TagFilter';

export default FilterDropdown;