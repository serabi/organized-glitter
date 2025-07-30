/**
 * Utility functions for mapping between frontend (camelCase) and backend (snake_case) field names
 * Provides type-safe conversion for PocketBase operations
 */

import type { ProjectFormValues } from '@/types/shared';
import type { ProjectUpdateData } from '@/types/file-upload';
import { toUserDateString } from '@/utils/timezoneUtils';
import { createLogger } from '@/utils/secureLogger';
import { pb } from '@/lib/pocketbase';

const fieldMappingLogger = createLogger('FieldMapping');

/**
 * Maps camelCase form fields to snake_case PocketBase fields
 * Handles type conversion and null values appropriately
 * Preserves proper data types for PocketBase API
 */
export function mapFormDataToPocketBase(
  formData: ProjectFormValues,
  userTimezone?: string
): ProjectUpdateData {
  // Helper function to safely parse integers
  const safeParseInt = (value: string | number | undefined): number | null => {
    if (value === undefined || value === null || value === '') return null;
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return isNaN(num) ? null : num;
  };

  // Helper function to handle optional string fields
  const safeString = (value: string | undefined): string | undefined => {
    return value === '' ? undefined : value;
  };

  // Helper function to format dates for PocketBase (YYYY-MM-DD format only)
  const formatDateForPocketBase = (
    value: string | Date | undefined,
    userTimezone?: string
  ): string | null => {
    if (!value || value === '') {
      fieldMappingLogger.debug('📅 Date formatting: null/empty value', { value, userTimezone });
      return null;
    }

    // Always convert through timezone utilities to ensure consistency
    // This prevents round-trip timezone conversion bugs where database dates
    // are incorrectly assumed to be user input
    const result = toUserDateString(value, userTimezone);

    fieldMappingLogger.debug('📅 Date formatting during save', {
      inputValue: value,
      inputType: typeof value,
      userTimezone,
      outputValue: result,
      isChanged: String(value) !== result,
    });

    return result;
  };

  // Log the input form data for debugging
  fieldMappingLogger.debug('🔄 Starting field mapping', {
    userTimezone,
    hasDatePurchased: !!formData.datePurchased,
    hasDateStarted: !!formData.dateStarted,
    hasDateCompleted: !!formData.dateCompleted,
    hasDateReceived: !!formData.dateReceived,
    dateValues: {
      datePurchased: formData.datePurchased,
      dateStarted: formData.dateStarted,
      dateCompleted: formData.dateCompleted,
      dateReceived: formData.dateReceived,
    },
  });

  const result: ProjectUpdateData = {
    title: formData.title,
    status: formData.status,
    kit_category: safeString(formData.kit_category),
    drill_shape: safeString(formData.drillShape),
    date_purchased: formatDateForPocketBase(formData.datePurchased, userTimezone),
    date_started: formatDateForPocketBase(formData.dateStarted, userTimezone),
    date_completed: formatDateForPocketBase(formData.dateCompleted, userTimezone),
    date_received: formatDateForPocketBase(formData.dateReceived, userTimezone),
    width: safeParseInt(formData.width),
    height: safeParseInt(formData.height),
    total_diamonds: safeParseInt(formData.totalDiamonds),
    general_notes: safeString(formData.generalNotes),
    source_url: safeString(formData.sourceUrl),
  };

  // Log the final mapped result for debugging
  fieldMappingLogger.debug('✅ Field mapping completed', {
    mappedDates: {
      date_purchased: result.date_purchased,
      date_started: result.date_started,
      date_completed: result.date_completed,
      date_received: result.date_received,
    },
  });

  // Handle company and artist - they may be names or IDs
  // For now, we'll store the values as-is and let the mutation resolve them
  // This maintains backward compatibility while we add name-to-ID resolution
  if (formData.company && formData.company !== '' && formData.company !== 'N/A') {
    result.company = formData.company;
  }

  if (formData.artist && formData.artist !== '' && formData.artist !== 'N/A') {
    result.artist = formData.artist;
  }

  return result;
}

/**
 * Field mapping configuration for dynamic conversions
 */
export const FIELD_MAPPING = {
  // Frontend (camelCase) -> Backend (snake_case)
  datePurchased: 'date_purchased',
  dateReceived: 'date_received',
  dateStarted: 'date_started',
  dateCompleted: 'date_completed',
  drillShape: 'drill_shape',
  generalNotes: 'general_notes',
  sourceUrl: 'source_url',
  totalDiamonds: 'total_diamonds',
  kitCategory: 'kit_category',
} as const;

/**
 * Reverse mapping for backend to frontend field conversion
 */
export const REVERSE_FIELD_MAPPING = Object.fromEntries(
  Object.entries(FIELD_MAPPING).map(([frontend, backend]) => [backend, frontend])
) as Record<string, string>;

/**
 * Type-safe field name mapper
 * Converts a camelCase field name to snake_case
 */
export function mapFieldName(camelCaseField: keyof typeof FIELD_MAPPING): string {
  return FIELD_MAPPING[camelCaseField] || camelCaseField;
}

/**
 * Converts snake_case field name back to camelCase
 */
export function reverseMapFieldName(snakeCaseField: string): string {
  return REVERSE_FIELD_MAPPING[snakeCaseField] || snakeCaseField;
}

/**
 * Generic function to convert any object from camelCase to snake_case
 * Useful for dynamic field mapping scenarios
 */
export function camelToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = FIELD_MAPPING[key as keyof typeof FIELD_MAPPING] || key;
    result[snakeKey] = value;
  }

  return result;
}

/**
 * Generic function to convert any object from snake_case to camelCase
 */
export function snakeToCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = REVERSE_FIELD_MAPPING[key] || key;
    result[camelKey] = value;
  }

  return result;
}

/**
 * Resolves company and artist names to their corresponding PocketBase IDs
 * @param companyName - Company name to resolve (can be empty, ID, or name)
 * @param artistName - Artist name to resolve (can be empty, ID, or name)
 * @param userId - Current user ID for filtering
 * @returns Promise with resolved IDs or null if not found
 */
export async function resolveCompanyAndArtistIds(
  companyName: string | undefined,
  artistName: string | undefined,
  userId: string
): Promise<{ companyId: string | null; artistId: string | null }> {
  const logger = createLogger('resolveCompanyAndArtistIds');

  let companyId: string | null = null;
  let artistId: string | null = null;

  // Resolve company name to ID if provided
  if (companyName && companyName !== '' && companyName !== 'N/A') {
    // Check if it's already a valid PocketBase ID
    if (isValidPocketBaseId(companyName)) {
      companyId = companyName;
      logger.debug('Company is already an ID', { companyId });
    } else {
      // Try to resolve the name to an ID
      try {
        const companyRecord = await pb.collection('companies').getFirstListItem(
          pb.filter('name = {:name} && user = {:user}', {
            name: companyName,
            user: userId,
          })
        );
        companyId = companyRecord?.id || null;
        logger.debug('Resolved company name to ID', { companyName, companyId });
      } catch (error) {
        logger.warn('Company not found, will be saved as null', { companyName, error });
        companyId = null;
      }
    }
  }

  // Resolve artist name to ID if provided
  if (artistName && artistName !== '' && artistName !== 'N/A') {
    // Check if it's already a valid PocketBase ID
    if (isValidPocketBaseId(artistName)) {
      artistId = artistName;
      logger.debug('Artist is already an ID', { artistId });
    } else {
      // Try to resolve the name to an ID
      try {
        const artistRecord = await pb.collection('artists').getFirstListItem(
          pb.filter('name = {:name} && user = {:user}', {
            name: artistName,
            user: userId,
          })
        );
        artistId = artistRecord?.id || null;
        logger.debug('Resolved artist name to ID', { artistName, artistId });
      } catch (error) {
        logger.warn('Artist not found, will be saved as null', { artistName, error });
        artistId = null;
      }
    }
  }

  return { companyId, artistId };

  // Helper function to check if a value looks like a PocketBase ID (15 characters)
  function isValidPocketBaseId(value: string | undefined): boolean {
    return typeof value === 'string' && value.length === 15 && /^[a-zA-Z0-9]+$/.test(value);
  }
}
