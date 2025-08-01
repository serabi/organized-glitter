/**
 * Timezone-safe date utilities for handling date-only fields
 * @author @serabi
 * @created 2025-07-13
 */

import { toZonedTime, formatInTimeZone, toDate } from 'date-fns-tz';
import { format } from 'date-fns';
import { createLogger } from '@/utils/logger';

const logger = createLogger('TimezoneUtils');

/**
 * Common timezone options for user selection
 */
export interface TimezoneOption {
  value: string;
  label: string;
  region: string;
}

export const TIMEZONE_REGIONS = {
  UTC: 'UTC',
  America: 'Americas',
  Europe: 'Europe & Africa',
  Asia: 'Asia & Pacific',
} as const;

export const COMMON_TIMEZONES: TimezoneOption[] = [
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'UTC' },

  // Americas
  { value: 'America/New_York', label: 'Eastern Time (New York)', region: 'America' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', region: 'America' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', region: 'America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', region: 'America' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', region: 'America' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', region: 'America' },

  // Europe & Africa
  { value: 'Europe/London', label: 'British Time (London)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Central European Time (Berlin)', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Central European Time (Rome)', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Central European Time (Madrid)', region: 'Europe' },

  // Asia & Pacific
  { value: 'Asia/Tokyo', label: 'Japan Time (Tokyo)', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'China Time (Shanghai)', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'India Time (Kolkata)', region: 'Asia' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)', region: 'Asia' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time (Melbourne)', region: 'Asia' },
];

/**
 * Groups timezones by region for organized display
 */
export function getTimezonesByRegion(): Record<string, TimezoneOption[]> {
  return COMMON_TIMEZONES.reduce(
    (acc, tz) => {
      if (!acc[tz.region]) acc[tz.region] = [];
      acc[tz.region].push(tz);
      return acc;
    },
    {} as Record<string, TimezoneOption[]>
  );
}

/**
 * Detects the user's browser timezone using Intl API
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    logger.warn('Failed to detect user timezone, falling back to UTC', { error });
    return 'UTC';
  }
}

/**
 * Safely converts any date input to YYYY-MM-DD string in the specified timezone
 * This prevents timezone shifts that occur with naive date conversion
 *
 * @param input - Date string, Date object, or null/undefined
 * @param userTimezone - User's preferred timezone (defaults to UTC)
 * @returns YYYY-MM-DD string or null if input is invalid
 */
export function toUserDateString(
  input: string | Date | null | undefined,
  userTimezone: string = 'UTC'
): string | null {
  if (!input) return null;

  try {
    let date: Date;

    if (typeof input === 'string') {
      // If already in YYYY-MM-DD format, parse it as midnight in user's timezone
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        date = toDate(`${input}T00:00:00`, { timeZone: userTimezone });
      } else {
        // Parse other date formats normally
        date = new Date(input);
      }
    } else {
      date = input;
    }

    if (isNaN(date.getTime())) {
      logger.warn('Invalid date input', { input, userTimezone });
      return null;
    }

    // Convert to user's timezone and format as YYYY-MM-DD
    const zonedDate = toZonedTime(date, userTimezone);
    return format(zonedDate, 'yyyy-MM-dd');
  } catch (error) {
    logger.error('Error converting date to user timezone', { input, userTimezone, error });
    return null;
  }
}

/**
 * Safely converts YYYY-MM-DD string from user's timezone to a Date object
 * Useful when you need a Date object for further processing
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param userTimezone - User's preferred timezone (defaults to UTC)
 * @returns Date object or null if input is invalid
 */
export function fromUserDateString(
  dateStr: string | null | undefined,
  userTimezone: string = 'UTC'
): Date | null {
  if (!dateStr) return null;

  try {
    // Parse as midnight in user's timezone using toDate
    const utcDate = toDate(`${dateStr}T00:00:00`, { timeZone: userTimezone });

    if (isNaN(utcDate.getTime())) {
      logger.warn('Invalid date string', { dateStr, userTimezone });
      return null;
    }

    return utcDate;
  } catch (error) {
    logger.error('Error parsing date from user timezone', { dateStr, userTimezone, error });
    return null;
  }
}

/**
 * Formats a date for display in the user's timezone
 *
 * @param date - Date to format
 * @param userTimezone - User's preferred timezone
 * @param formatString - Date format pattern (defaults to 'PPP' for readable format)
 * @returns Formatted date string
 */
export function formatDateInUserTimezone(
  date: Date | string | null | undefined,
  userTimezone: string,
  formatString: string = 'PPP'
): string {
  if (!date) return '';

  try {
    return formatInTimeZone(date, userTimezone, formatString);
  } catch (error) {
    logger.error('Error formatting date in timezone', { date, userTimezone, formatString, error });
    return '';
  }
}

/**
 * Gets the current date as YYYY-MM-DD string in user's timezone
 * Useful for setting default values in date inputs
 *
 * @param userTimezone - User's preferred timezone (defaults to UTC)
 * @returns Current date in YYYY-MM-DD format
 */
export function getCurrentDateInUserTimezone(userTimezone: string = 'UTC'): string {
  const now = new Date();
  return toUserDateString(now, userTimezone) || formatInTimeZone(now, userTimezone, 'yyyy-MM-dd');
}

/**
 * Validates if a timezone string is supported
 *
 * @param timezone - Timezone string to validate
 * @returns True if timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
