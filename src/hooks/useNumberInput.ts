/**
 * Custom hook for handling number inputs with comma formatting support
 * @author @serabi
 * @created 2025-08-04
 */

import { useCallback } from 'react';

/**
 * Hook for handling number inputs that automatically strips commas from user input
 * Supports both typing and pasting of comma-formatted numbers (e.g., "22,555" → 22555)
 * @author @serabi
 * @param onChange - Callback function to update the value
 * @returns Object with onChange and onPaste handlers for the input
 */
export const useNumberInput = (onChange: (value: number | null) => void) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip commas from the input value
      const cleanValue = e.target.value.replace(/,/g, '');
      // Convert to number or null if empty
      const numValue = cleanValue ? Number(cleanValue) : null;
      onChange(numValue);
    },
    [onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      // Get pasted text and strip commas
      const pastedText = e.clipboardData.getData('text').replace(/,/g, '');
      // Convert to number or null if empty
      const numValue = pastedText ? Number(pastedText) : null;
      onChange(numValue);
    },
    [onChange]
  );

  return {
    onChange: handleChange,
    onPaste: handlePaste,
  };
};
