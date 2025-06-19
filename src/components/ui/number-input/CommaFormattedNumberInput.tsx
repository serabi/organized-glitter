import React, { useState, useEffect, useCallback, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CommaFormattedNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value?: number | string;
  onChange?: (value: number | undefined) => void;
  allowNegative?: boolean;
  maxValue?: number;
  minValue?: number;
}

/**
 * A number input component that formats numbers with commas for display
 * while handling the underlying numeric value properly.
 */
export const CommaFormattedNumberInput = forwardRef<
  HTMLInputElement,
  CommaFormattedNumberInputProps
>(
  (
    {
      value,
      onChange,
      allowNegative = false,
      maxValue,
      minValue = 0,
      className,
      disabled,
      placeholder = '0',
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);

    // Format number with commas for display
    const formatNumberWithCommas = (num: number): string => {
      return num.toLocaleString('en-US');
    };

    // Parse a string to get the numeric value (removing commas)
    const parseNumericValue = useCallback(
      (str: string): number | undefined => {
        if (!str || str.trim() === '') return undefined;

        // Remove commas and any non-numeric characters except minus sign and decimal point
        const cleanStr = str.replace(/[^-\d.]/g, '');

        if (cleanStr === '' || cleanStr === '-') return undefined;

        const parsed = parseFloat(cleanStr);

        if (isNaN(parsed)) return undefined;

        // Apply constraints
        if (!allowNegative && parsed < 0) return undefined;
        if (minValue !== undefined && parsed < minValue) return undefined;
        if (maxValue !== undefined && parsed > maxValue) return undefined;

        // For integer inputs, ensure we return an integer
        return Math.floor(parsed);
      },
      [allowNegative, minValue, maxValue]
    );

    // More lenient parsing for real-time input (allows partial input)
    const parseInputValue = (str: string): number | undefined => {
      if (!str || str.trim() === '') return undefined;

      // Remove commas but be more permissive during typing
      const cleanStr = str.replace(/,/g, '');

      // If it's just numbers, parse it
      if (/^\d+$/.test(cleanStr)) {
        const parsed = parseInt(cleanStr, 10);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }

      // Fall back to more strict parsing
      return parseNumericValue(str);
    };

    // Update display value when prop value changes
    useEffect(() => {
      if (value === undefined || value === null || value === '') {
        setDisplayValue('');
        return;
      }

      const numericValue = typeof value === 'string' ? parseNumericValue(value) : value;

      if (numericValue !== undefined) {
        // Only format with commas when not focused (to avoid cursor jumping)
        if (!isFocused) {
          setDisplayValue(formatNumberWithCommas(numericValue));
        }
      } else {
        setDisplayValue('');
      }
    }, [value, isFocused, parseNumericValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setDisplayValue(inputValue);

      // Parse the numeric value and call onChange (use lenient parsing during typing)
      const numericValue = parseInputValue(inputValue);
      onChange?.(numericValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);

      // Show raw number without commas when focused for easier editing
      const numericValue = parseInputValue(displayValue);
      if (numericValue !== undefined) {
        setDisplayValue(numericValue.toString());
      }

      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      // Format with commas when losing focus
      const numericValue = parseInputValue(displayValue);
      if (numericValue !== undefined) {
        setDisplayValue(formatNumberWithCommas(numericValue));
      } else if (displayValue.trim() === '') {
        setDisplayValue('');
      }

      props.onBlur?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
      const allowedKeys = [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'Home',
        'End',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
      ];

      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      if (allowedKeys.includes(e.key)) {
        return;
      }

      // Allow numbers
      if (/^\d$/.test(e.key)) {
        return;
      }

      // Allow commas (user can type them, we'll handle them in parsing)
      if (e.key === ',') {
        return;
      }

      // Allow minus sign only at the beginning and if negative numbers are allowed
      if (e.key === '-' && allowNegative && (e.target as HTMLInputElement).selectionStart === 0) {
        return;
      }

      // Allow decimal point (though we'll floor the result for integer inputs)
      if (e.key === '.' && displayValue.indexOf('.') === -1) {
        return;
      }

      // Block everything else
      e.preventDefault();

      props.onKeyDown?.(e);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(className)}
      />
    );
  }
);

CommaFormattedNumberInput.displayName = 'CommaFormattedNumberInput';

export default CommaFormattedNumberInput;
