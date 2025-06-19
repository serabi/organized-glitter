import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
    console.error('Error formatting date:', error);
    return '';
  }
}

export function extractDateOnly(dateString: string): string | undefined {
  if (!dateString) return undefined;

  try {
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    // Parse the date and extract just the date portion
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return undefined;
    }

    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error extracting date:', error);
    return undefined;
  }
}
