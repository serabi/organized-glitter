import { z } from 'zod';

// Enums from database schema
const ProjectStatusEnum = z.enum([
  'wishlist',
  'purchased',
  'stash',
  'progress',
  'completed',
  'archived',
  'destashed',
]);
const DrillShapeEnum = z.enum(['round', 'square']);
const KitCategoryEnum = z.enum(['full', 'mini']);

// File validation constants
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']; // Common defaults

// Define the base object schema first
export const BaseProjectFormObjectSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]{15}$/, 'Invalid ID format')
    .optional(),
  userId: z
    .string()
    .min(1, 'User ID is required')
    .refine(val => {
      // Handle empty string case more gracefully
      if (!val || val.trim() === '') return false;
      // PocketBase ID validation - 15 character alphanumeric lowercase
      const pocketbaseIdRegex = /^[a-z0-9]{15}$/;
      return pocketbaseIdRegex.test(val);
    }, 'User authentication is incomplete. Please refresh the page and try again.'),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  company: z.string().max(100, 'Company must be 100 characters or less').optional().nullable(),
  artist: z.string().max(100, 'Artist must be 100 characters or less').optional().nullable(),
  drillShape: DrillShapeEnum.optional().nullable(),
  width: z.preprocess(
    val => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z
      .number({ invalid_type_error: 'Width must be a number' })
      .positive('Width must be a positive number')
      .optional()
      .nullable()
  ),
  height: z.preprocess(
    val => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z
      .number({ invalid_type_error: 'Height must be a number' })
      .positive('Height must be a positive number')
      .optional()
      .nullable()
  ),
  status: ProjectStatusEnum,
  datePurchased: z.preprocess(
    arg => {
      if (!arg || arg === '') return undefined;
      if (typeof arg === 'string' && arg.trim() !== '') return arg;
      if (arg instanceof Date) return arg;
      return undefined;
    },
    z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .refine(
        value => {
          if (!value) return true;
          if (typeof value === 'string') {
            // Validate YYYY-MM-DD format
            return /^\d{4}-\d{2}-\d{2}$/.test(value);
          }
          if (value instanceof Date) {
            return !isNaN(value.getTime());
          }
          return false;
        },
        { message: 'Invalid purchase date format' }
      )
  ),
  dateReceived: z.preprocess(
    arg => {
      if (!arg || arg === '') return undefined;
      if (typeof arg === 'string' && arg.trim() !== '') return arg;
      if (arg instanceof Date) return arg;
      return undefined;
    },
    z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .refine(
        value => {
          if (!value) return true;
          if (typeof value === 'string') {
            // Validate YYYY-MM-DD format
            return /^\d{4}-\d{2}-\d{2}$/.test(value);
          }
          if (value instanceof Date) {
            return !isNaN(value.getTime());
          }
          return false;
        },
        { message: 'Invalid received date format' }
      )
  ),
  dateStarted: z.preprocess(
    arg => {
      if (!arg || arg === '') return undefined;
      if (typeof arg === 'string' && arg.trim() !== '') return arg;
      if (arg instanceof Date) return arg;
      return undefined;
    },
    z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .refine(
        value => {
          if (!value) return true;
          if (typeof value === 'string') {
            // Validate YYYY-MM-DD format
            return /^\d{4}-\d{2}-\d{2}$/.test(value);
          }
          if (value instanceof Date) {
            return !isNaN(value.getTime());
          }
          return false;
        },
        { message: 'Invalid start date format' }
      )
  ),
  dateCompleted: z.preprocess(
    arg => {
      if (!arg || arg === '') return undefined;
      if (typeof arg === 'string' && arg.trim() !== '') return arg;
      if (arg instanceof Date) return arg;
      return undefined;
    },
    z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .refine(
        value => {
          if (!value) return true;
          if (typeof value === 'string') {
            // Validate YYYY-MM-DD format
            return /^\d{4}-\d{2}-\d{2}$/.test(value);
          }
          if (value instanceof Date) {
            return !isNaN(value.getTime());
          }
          return false;
        },
        { message: 'Invalid completion date format' }
      )
  ),
  generalNotes: z.string().max(5000, 'Notes must be 5000 characters or less').optional().nullable(),
  imageUrl: z
    .string()
    .url('Image URL must be a valid URL if provided')
    .optional()
    .nullable()
    .or(z.literal('')),
  sourceUrl: z
    .string()
    .url('Source URL must be a valid URL if provided')
    .max(2048, 'Source URL too long')
    .optional()
    .nullable()
    .or(z.literal('')),
  totalDiamonds: z.preprocess(
    val => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z
      .number({ invalid_type_error: 'Total diamonds must be a number' })
      .int('Total diamonds must be an integer')
      .positive('Total diamonds must be positive')
      .optional()
      .nullable()
  ),
  kit_category: KitCategoryEnum.optional().nullable(),
  imageFile: z
    .instanceof(File)
    .optional()
    .nullable()
    .refine(
      file => !file || file.size <= MAX_FILE_SIZE_BYTES,
      `Max file size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`
    )
    .refine(
      file => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      `Accepted file types: ${ACCEPTED_IMAGE_TYPES.join(', ')}.`
    ),
  _imageReplacement: z.union([z.boolean(), z.string()]).optional(),
  tagIds: z
    .array(z.string().regex(/^[a-z0-9]{15}$/, 'Invalid Tag ID format'))
    .optional()
    .nullable(), // Changed from tagNames to tagIds
});

// Helper function to convert date field to Date object for comparison
const toDateForComparison = (dateField: string | Date | null | undefined): Date | null => {
  if (!dateField) return null;
  if (typeof dateField === 'string') return new Date(dateField);
  if (dateField instanceof Date) return dateField;
  return null;
};

// Apply refinements to the base object schema
export const ProjectFormSchema = BaseProjectFormObjectSchema.refine(
  data => {
    const purchasedDate = toDateForComparison(data.datePurchased);
    const startedDate = toDateForComparison(data.dateStarted);

    if (purchasedDate && startedDate && purchasedDate > startedDate) {
      return false;
    }
    return true;
  },
  {
    message: 'Start date cannot be before purchase date',
    path: ['dateStarted'],
  }
).refine(
  data => {
    const startedDate = toDateForComparison(data.dateStarted);
    const completedDate = toDateForComparison(data.dateCompleted);

    if (startedDate && completedDate && startedDate > completedDate) {
      return false;
    }
    return true;
  },
  {
    message: 'Completion date cannot be before start date',
    path: ['dateCompleted'],
  }
);

export type ProjectFormSchemaType = z.infer<typeof ProjectFormSchema>;
