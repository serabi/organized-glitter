import { format } from 'date-fns';
import { Project, Tag } from '@/types/shared';
import { logger } from './logger';

/**
 * Converts an array of projects to CSV format
 * @param projects Array of projects to convert
 * @returns CSV string with headers
 */
export const projectsToCsv = (projects: Project[]): string => {
  if (!projects || projects.length === 0) {
    return '';
  }

  // Define headers for CSV
  const headers = [
    'Title',
    'Status',
    'Company',
    'Artist',
    'Width',
    'Height',
    'Drill Shape',
    'Total Diamonds',
    'Type of Kit',
    'Project URL',
    'Date Purchased',
    'Date Received',
    'Date Started',
    'Date Completed',
    'Notes',
    'Tags',
  ];

  // Convert each project to a row in the CSV
  const rows = projects.map(project => {
    return [
      escapeField(project.title), // Title
      escapeField(project.status), // Status
      escapeField(project.company), // Company
      escapeField(project.artist), // Artist
      escapeField(project.width), // Width
      escapeField(project.height), // Height
      escapeField(project.drillShape), // Drill Shape
      escapeField(project.totalDiamonds), // Total Diamonds
      escapeField(project.kit_category), // Type of Kit
      escapeField(project.sourceUrl), // Project URL
      formatDate(project.datePurchased), // Date Purchased
      formatDate(project.dateReceived), // Date Received
      formatDate(project.dateStarted), // Date Started
      formatDate(project.dateCompleted), // Date Completed
      escapeField(project.generalNotes), // Notes
      escapeField(formatTags(project.tags)), // Tags
    ];
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  return csvContent;
};

/**
 * Download data as a CSV file
 * @param csvData CSV data as string
 * @param filename Name for the downloaded file
 */
export const downloadCsv = (csvData: string, filename: string = 'projects-export.csv'): void => {
  if (!csvData) {
    logger.error('No CSV data to download');
    return;
  }

  // Create a blob from the CSV data
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Create a link and trigger the download
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL
  URL.revokeObjectURL(url);
};

/**
 * Escapes a field for CSV format
 * @param field The field value to escape (can be any type, will be converted to string)
 * @returns The escaped field value as a string
 */
const escapeField = (field: unknown): string => {
  // Convert to string, handling null/undefined
  const strField = field === null || field === undefined ? '' : String(field);

  // If the field contains quotes, commas, or newlines, wrap it in quotes and escape internal quotes
  const needsQuotes = /[",\n\r]/.test(strField);

  if (needsQuotes) {
    // Replace any quotes with double quotes (CSV standard for escaping quotes)
    return `"${strField.replace(/"/g, '""')}"`;
  }

  return strField;
};

/**
 * Format a date string for CSV (or return empty string if no date)
 * @param dateString Date string to format
 * @returns Formatted date or empty string
 */
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) {
    return '';
  }

  try {
    // If the date string is already in YYYY-MM-DD format, return it as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    // For ISO strings or other formats, parse and format to avoid timezone issues
    const date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }

    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    logger.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Format tags array for CSV (comma-separated tag names)
 * @param tags Array of tags to format
 * @returns Comma-separated tag names or empty string
 */
const formatTags = (tags: Tag[] | undefined): string => {
  if (!tags || tags.length === 0) {
    return '';
  }

  // Extract tag IDs and join with commas for PocketBase compatibility
  return tags.map(tag => tag.id).join(',');
};
