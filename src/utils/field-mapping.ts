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
 * Cache for user-specific special records to avoid repeated database calls
 */
const specialRecordsCache = new Map<
  string,
  { companies: Map<string, string>; artists: Map<string, string> }
>();

/**
 * Helper function to get or create special records for a user
 * @param userId - User ID to create records for
 * @param recordType - Either 'companies' or 'artists'
 * @param specialNames - Array of special names to ensure exist
 * @returns Promise with map of special names to their IDs
 */
async function ensureSpecialRecords(
  userId: string,
  recordType: 'companies' | 'artists',
  specialNames: string[]
): Promise<Map<string, string>> {
  const logger = createLogger('ensureSpecialRecords');

  // Check cache first
  if (!specialRecordsCache.has(userId)) {
    specialRecordsCache.set(userId, { companies: new Map(), artists: new Map() });
  }

  const userCache = specialRecordsCache.get(userId)!;
  const typeCache = userCache[recordType];

  // Check if we already have all the special names cached
  const missingNames = specialNames.filter(name => !typeCache.has(name));

  if (missingNames.length === 0) {
    logger.debug(`All special ${recordType} records cached for user`, { userId, specialNames });
    return typeCache;
  }

  // Fetch existing special records from database
  try {
    // Build OR conditions for each special name (PocketBase doesn't support 'in' with arrays properly)
    const nameConditions = specialNames.map((_, index) => `name = {:name${index}}`).join(' || ');
    const filterParams: Record<string, string> = { user: userId };
    specialNames.forEach((name, index) => {
      filterParams[`name${index}`] = name;
    });

    const existingRecords = await pb.collection(recordType).getFullList({
      filter: pb.filter(`user = {:user} && (${nameConditions})`, filterParams),
    });

    // Update cache with existing records
    existingRecords.forEach(record => {
      typeCache.set(record.name, record.id);
      logger.debug(`Found existing special ${recordType.slice(0, -1)} record`, {
        name: record.name,
        id: record.id,
      });
    });

    // Create missing records
    const stillMissingNames = specialNames.filter(name => !typeCache.has(name));

    for (const name of stillMissingNames) {
      try {
        logger.debug(`Creating special ${recordType.slice(0, -1)} record`, { name, userId });
        const newRecord = await pb.collection(recordType).create({
          name,
          user: userId,
        });

        typeCache.set(name, newRecord.id);
        logger.info(`✅ Created special ${recordType.slice(0, -1)} record`, {
          name,
          id: newRecord.id,
        });
      } catch (createError) {
        logger.error(`Failed to create special ${recordType.slice(0, -1)} record`, {
          name,
          createError,
        });
        // Continue with other records even if one fails
      }
    }
  } catch (error) {
    logger.error(`Failed to fetch existing special ${recordType} records`, { userId, error });
  }

  return typeCache;
}

/**
 * Resolves company and artist names to their corresponding PocketBase IDs
 * Auto-creates user-specific special records ("Other", "None", "Unknown") as needed
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

  // Define special values that need database records
  const specialCompanyNames = ['Other', 'None'];
  const specialArtistNames = ['Other', 'Unknown'];

  // Ensure special records exist for this user
  await Promise.all([
    ensureSpecialRecords(userId, 'companies', specialCompanyNames),
    ensureSpecialRecords(userId, 'artists', specialArtistNames),
  ]);

  // Resolve company name to ID if provided
  if (companyName && companyName !== '' && companyName !== 'N/A') {
    if (isValidPocketBaseId(companyName)) {
      // Check if it's already a valid PocketBase ID
      companyId = companyName;
      logger.debug('Company is already an ID', { companyId });
    } else {
      // Try to resolve the name to an ID (including special names)
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
    if (isValidPocketBaseId(artistName)) {
      // Check if it's already a valid PocketBase ID
      artistId = artistName;
      logger.debug('Artist is already an ID', { artistId });
    } else {
      // Try to resolve the name to an ID (including special names)
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
