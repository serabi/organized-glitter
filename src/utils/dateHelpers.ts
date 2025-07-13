/**
 * Helper functions for date operations with timezone awareness
 * @author @serabi
 * @created 2025-01-13
 */

import { toUserDateString, getCurrentDateInUserTimezone } from '@/utils/timezoneUtils';

/**
 * Legacy-compatible wrapper for timezone-safe date extraction
 * Can be used as a drop-in replacement for problematic toISOString().split('T')[0] patterns
 *
 * @param input - Date input (string, Date object, or null/undefined)
 * @param userTimezone - Optional user timezone (defaults to UTC for backwards compatibility)
 * @returns YYYY-MM-DD string or empty string if invalid
 */
export function safeDateString(
  input: string | Date | null | undefined,
  userTimezone: string = 'UTC'
): string {
  const result = toUserDateString(input, userTimezone);
  return result || '';
}

/**
 * Get current date in YYYY-MM-DD format using user timezone
 * Can be used as a drop-in replacement for new Date().toISOString().split('T')[0]
 *
 * @param userTimezone - Optional user timezone (defaults to UTC for backwards compatibility)
 * @returns Current date in YYYY-MM-DD format
 */
export function getCurrentDateString(userTimezone: string = 'UTC'): string {
  return getCurrentDateInUserTimezone(userTimezone);
}

/**
 * Convert any date input to YYYY-MM-DD format safely
 * Handles the most common problematic pattern: new Date(...).toISOString().split('T')[0]
 *
 * @param dateInput - Any date input that would normally go to new Date()
 * @param userTimezone - Optional user timezone (defaults to UTC)
 * @returns YYYY-MM-DD string
 */
export function dateToYMD(
  dateInput: string | Date | number | null | undefined,
  userTimezone: string = 'UTC'
): string {
  if (!dateInput) return '';

  try {
    let date: Date;

    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      date = new Date(dateInput);
    }

    return safeDateString(date, userTimezone);
  } catch {
    return '';
  }
}
