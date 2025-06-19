import { ProjectFormSchemaType } from '@/schemas/project.schema';
import { ProjectFormValues } from '@/types/project';

/**
 * Converts ProjectFormSchemaType (Zod schema output) to ProjectFormValues (legacy form interface)
 * This ensures type compatibility between the form schema and existing form handlers
 */
export function convertSchemaToFormValues(data: ProjectFormSchemaType): ProjectFormValues {
  // Helper function to safely convert dates to strings
  const dateToString = (date: Date | string | null | undefined): string | undefined => {
    if (!date) return undefined;
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString().split('T')[0];
    return undefined;
  };

  return {
    ...data,
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
    // tagNames is not available on ProjectFormSchemaType, it has tagIds.
    // ProjectFormValues has an optional tagNames, so it will be undefined here.
    // tagNames: data.tagNames || undefined, // This line causes the error
  };
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
