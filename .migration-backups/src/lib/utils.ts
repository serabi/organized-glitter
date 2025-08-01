import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logger } from '@/utils/logger';
import { toUserDateString } from '@/utils/timezoneUtils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    // Format as MM/DD/YYYY
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    logger.error('Error formatting date:', error);
    return '';
  }
}

export function extractDateOnly(dateString: string, userTimezone?: string): string | undefined {
  if (!dateString) return undefined;

  try {
    // Use timezone-safe conversion
    const result = toUserDateString(dateString, userTimezone);
    return result || undefined;
  } catch (error) {
    logger.error('Error extracting date:', error);
    return undefined;
  }
}
