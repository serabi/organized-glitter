/**
 * Utility functions for date formatting and storage
 * Extracted from field-mapping.ts and useProgressNotes.ts to eliminate duplication
 * @author @serabi
 * @created 2025-08-03
 */

import { toUserDateString } from '@/utils/timezoneUtils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('DateFormatting');

/**
 * Formats dates for PocketBase storage (YYYY-MM-DD format only)
 * Handles timezone conversion and prevents double timezone conversion for date-only values
 * @param value - Date value to format (string, Date, or undefined)
 * @param userTimezone - Optional user timezone for conversion
 * @returns Formatted date string or null if empty/invalid
 */
export const formatDateForStorage = (
  value: string | Date | undefined,
  userTimezone?: string
): string | null => {
  if (!value || value === '') {
    logger.debug('📅 Date formatting: null/empty value', { value, userTimezone });
    return null;
  }

  logger.debug('📅 Date formatting input', {
    inputValue: value,
    inputType: typeof value,
    userTimezone,
    isYYYYMMDD: typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
  });

  // For YYYY-MM-DD strings from HTML date inputs, treat as date-only values
  // This prevents the double timezone conversion bug in toUserDateString()
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    logger.debug('📅 Date: using date-only format (no timezone conversion)', {
      inputValue: value,
      outputValue: value,
      userTimezone,
      reason: 'YYYY-MM-DD strings represent calendar dates, not moments in time',
    });
    return value; // Return as-is for date-only values
  }

  // For other date formats, use the timezone conversion utilities
  const result = toUserDateString(value, userTimezone);

  logger.debug('📅 Date formatting during save', {
    inputValue: value,
    inputType: typeof value,
    userTimezone,
    outputValue: result,
    isChanged: String(value) !== result,
  });

  return result;
};
