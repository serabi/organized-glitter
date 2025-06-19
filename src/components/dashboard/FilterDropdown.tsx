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

interface FilterDropdownProps {
  label: string;
  options: OptionType[] | string[]; // Can accept string array for backward compatibility
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

    const isOptionTypeArray = (opts: unknown[]): opts is OptionType[] => {
      return (
        opts.length > 0 &&
        typeof opts[0] === 'object' &&
        opts[0] !== null &&
        'label' in opts[0] &&
        'value' in opts[0]
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
            {isOptionTypeArray(options)
              ? options.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              : (options as string[]).map(option => (
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
