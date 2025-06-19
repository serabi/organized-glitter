import { ProjectStatus } from '@/types/project';

export const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'stash', label: 'In Stash' },
  { value: 'progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
  { value: 'destashed', label: 'Destashed' },
];

export const KIT_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'full', label: 'Full Sized' },
  { value: 'mini', label: 'Mini' },
];

export const DRILL_SHAPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'round', label: 'Round' },
  { value: 'square', label: 'Square' },
];

export const formatStatus = (status: string): string => {
  const option = STATUS_OPTIONS.find(opt => opt.value === status);
  return option?.label ?? status.charAt(0).toUpperCase() + status.slice(1);
};

export const getStatusBadgeVariant = (status: ProjectStatus) => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'progress':
      return 'secondary';
    case 'stash':
      return 'outline';
    case 'purchased':
      return 'tag';
    default:
      return 'destructive';
  }
};

// Validation helper functions for type safety
export const isValidProjectStatus = (value: string): value is ProjectStatus => {
  return STATUS_OPTIONS.some(option => option.value === value);
};

export const isValidKitCategory = (value: string): value is 'full' | 'mini' => {
  return KIT_CATEGORY_OPTIONS.some(option => option.value === value);
};

export const isValidDrillShape = (value: string): value is 'round' | 'square' => {
  return DRILL_SHAPE_OPTIONS.some(option => option.value === value);
};

// Date field names that match the actual Project interface schema
export const DATE_FIELD_NAMES = [
  'datePurchased',
  'dateReceived',
  'dateStarted',
  'dateCompleted',
] as const;

// Type-safe date field validation using the actual project schema
export type DateFieldName = (typeof DATE_FIELD_NAMES)[number];

export const isDateField = (fieldName: string): fieldName is DateFieldName => {
  return (DATE_FIELD_NAMES as readonly string[]).includes(fieldName);
};

// Field name mapping from frontend camelCase to backend snake_case
export const FIELD_NAME_MAP: Record<string, string> = {
  dateStarted: 'date_started',
  dateCompleted: 'date_completed',
  datePurchased: 'date_purchased',
  dateReceived: 'date_received',
  drillShape: 'drill_shape',
  kitCategory: 'kit_category',
  generalNotes: 'general_notes',
  sourceUrl: 'source_url',
  totalDiamonds: 'total_diamonds',
};

// Convert frontend field name to backend field name
export const getBackendFieldName = (frontendField: string): string => {
  return FIELD_NAME_MAP[frontendField] || frontendField;
};
