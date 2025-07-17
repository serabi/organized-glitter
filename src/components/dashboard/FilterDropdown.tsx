import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OptionType {
  label: string;
  value: string;
}

interface MetadataType {
  id: string;
  name: string;
}

interface FilterDropdownProps {
  label: string;
  options: OptionType[] | string[] | MetadataType[] | undefined; // Can be undefined during loading
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showAllOption?: boolean; // New prop to control "All" option
}

const FilterDropdown = React.memo(
  ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Select...',
    showAllOption = true, // Default to true for existing filters
  }: FilterDropdownProps) => {
    // Provide safe default for options to prevent undefined errors
    const safeOptions = options || [];

    // Special cases for plural labels
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

    // Removed excessive logging for performance
    // useEffect(() => {
    //   console.log(`FilterDropdown ${label} - Options:`, options);
    //   console.log(`FilterDropdown ${label} - Current value:`, value);
    // }, [options, value, label]);

    const isOptionTypeArray = (opts: unknown[] | undefined | null): opts is OptionType[] => {
      return (
        Array.isArray(opts) &&
        opts.length > 0 &&
        typeof opts[0] === 'object' &&
        opts[0] !== null &&
        'label' in opts[0] &&
        'value' in opts[0]
      );
    };

    // Check if this is raw metadata format {id, name}
    const isMetadataTypeArray = (opts: unknown[] | undefined | null): opts is MetadataType[] => {
      return (
        Array.isArray(opts) &&
        opts.length > 0 &&
        typeof opts[0] === 'object' &&
        opts[0] !== null &&
        'id' in opts[0] &&
        'name' in opts[0]
      );
    };

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{label}</h3>
        <Select
          value={value}
          onValueChange={newValue => {
            // Reduced logging for performance
            // console.log(`FilterDropdown ${label} - Value changed from "${value}" to "${newValue}"`);
            onChange(newValue);
          }}
        >
          <SelectTrigger className="w-full bg-background dark:text-foreground">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-popover dark:bg-gray-800 dark:text-gray-100">
            {showAllOption && <SelectItem value="all">All {getPluralLabel(label)}</SelectItem>}
            {isOptionTypeArray(safeOptions)
              ? // Standard {label, value} format
                safeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              : isMetadataTypeArray(safeOptions)
                ? // Raw metadata {id, name} format - transform to {label, value}
                  safeOptions.map(option => (
                    <SelectItem key={option.name} value={option.name}>
                      {option.name}
                    </SelectItem>
                  ))
                : // String array format
                  (safeOptions as string[]).map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
);

export default FilterDropdown;
