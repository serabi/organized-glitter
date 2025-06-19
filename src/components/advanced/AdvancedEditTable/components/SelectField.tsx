import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  includeNoneOption?: boolean;
  noneLabel?: string;
  onChange: (value: string) => void;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  value,
  options,
  placeholder,
  includeNoneOption = false,
  noneLabel = 'None',
  onChange,
  className = 'h-8 w-full',
}) => {
  const handleValueChange = (newValue: string) => {
    const actualValue = newValue === 'NONE' ? '' : newValue;
    onChange(actualValue);
  };

  return (
    <Select value={value || (includeNoneOption ? 'NONE' : '')} onValueChange={handleValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeNoneOption && <SelectItem value="NONE">{noneLabel}</SelectItem>}
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
