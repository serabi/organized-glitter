import { ProjectFormSchemaType } from '@/schemas/project.schema';
import { ProjectFormValues } from '@/types/project';
import { toUserDateString } from '@/utils/timezoneUtils';

/**
 * Converts ProjectFormSchemaType (Zod schema output) to ProjectFormValues (legacy form interface)
 * This ensures type compatibility between the form schema and existing form handlers
 */
export function convertSchemaToFormValues(
  data: ProjectFormSchemaType,
  userTimezone?: string
): ProjectFormValues {
  // Helper function to safely convert dates to strings using timezone-aware conversion
  const dateToString = (date: Date | string | null | undefined): string | undefined => {
    if (!date) return undefined;
    if (typeof date === 'string') return date;
    if (date instanceof Date) {
      // Use timezone-aware conversion instead of naive UTC conversion
      return toUserDateString(date, userTimezone) || undefined;
    }
    return undefined;
  };

  const result: ProjectFormValues = {
    // Copy all common fields
    title: data.title,
    userId: data.userId,
    status: data.status,
    // Convert dates safely to strings for form compatibility
    datePurchased: dateToString(data.datePurchased),
    dateReceived: dateToString(data.dateReceived),
    dateStarted: dateToString(data.dateStarted),
    dateCompleted: dateToString(data.dateCompleted),
    // Convert numbers to strings for form input compatibility
    width: data.width?.toString() || undefined,
    height: data.height?.toString() || undefined,
    totalDiamonds: data.totalDiamonds || undefined,
    // Handle nullable fields
    company: data.company || undefined,
    artist: data.artist || undefined,
    drillShape: data.drillShape || undefined,
    generalNotes: data.generalNotes || undefined,
    imageUrl: data.imageUrl || undefined,
    sourceUrl: data.sourceUrl || undefined,
    kit_category: data.kit_category || undefined,
    // Handle tagIds - convert null to undefined for form compatibility
    tagIds: data.tagIds || undefined,
    // Convert _imageReplacement to boolean
    _imageReplacement:
      typeof data._imageReplacement === 'string'
        ? data._imageReplacement === 'true'
        : !!data._imageReplacement,
    // Handle optional fields specific to ProjectFormValues
    id: data.id,
    imageFile: data.imageFile || undefined,
    // tagNames is not available on ProjectFormSchemaType, it has tagIds.
    // ProjectFormValues has an optional tagNames, so it will be undefined here.
    tagNames: undefined,
  };

  return result;
}

/**
 * Converts ProjectFormValues to ProjectFormSchemaType for validation
 * This prepares form data for Zod schema validation
 */
export function convertFormValuesToSchema(
  data: Partial<ProjectFormValues>
): Partial<ProjectFormSchemaType> {
  return {
    ...data,
    // Convert string dates to Date objects
    datePurchased: data.datePurchased ? new Date(data.datePurchased) : undefined,
    dateReceived: data.dateReceived ? new Date(data.dateReceived) : undefined,
    dateStarted: data.dateStarted ? new Date(data.dateStarted) : undefined,
    dateCompleted: data.dateCompleted ? new Date(data.dateCompleted) : undefined,
    // Convert string numbers to numbers
    width: data.width ? Number(data.width) : undefined,
    height: data.height ? Number(data.height) : undefined,
    totalDiamonds:
      typeof data.totalDiamonds === 'string' ? Number(data.totalDiamonds) : data.totalDiamonds,
    // Ensure drillShape is properly typed
    drillShape:
      data.drillShape === 'round' || data.drillShape === 'square' ? data.drillShape : null,
  };
}
