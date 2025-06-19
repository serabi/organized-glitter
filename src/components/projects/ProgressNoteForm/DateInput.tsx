import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface DateInputProps {
  value: string;
  disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string; // Added error prop
}

/**
 * DateInput component for the ProgressNoteForm.
 * Renders a date input field with label and error display.
 * @param {DateInputProps} props - The component props.
 * @param {string} props.value - The current value of the date input.
 * @param {boolean} props.disabled - Whether the input is disabled.
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onChange - Handler for date input changes.
 * @param {string} [props.error] - Optional error message to display.
 * @returns {JSX.Element} The rendered DateInput component.
 */
export const DateInput: React.FC<DateInputProps> = ({
  value,
  disabled,
  onChange,
  error, // Destructure error prop
}) => {
  return (
    <div>
      <Label htmlFor="note-date">Date</Label>
      <Input
        id="note-date"
        type="date"
        value={value}
        onChange={onChange}
        className={cn(
          'w-full',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-red-500'
        )} // Added error styling
        disabled={disabled}
        required
        aria-invalid={error ? 'true' : 'false'} // Accessibility
        aria-describedby={error ? 'date-error' : undefined} // Accessibility
      />
      {error && (
        <p id="date-error" className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}{' '}
      {/* Display error message */}
    </div>
  );
};
