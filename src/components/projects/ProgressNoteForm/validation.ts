import { PROGRESS_NOTE_CONSTANTS } from './constants';

export interface ProgressNoteValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates the progress note data.
 * @param data - The data to validate, including date, content, and an optional image file.
 * @returns An object containing a boolean indicating if the data is valid and an errors object.
 */
export function validateProgressNote(data: {
  date: string;
  content: string;
  imageFile?: File | null;
}): ProgressNoteValidationResult {
  const errors: Record<string, string> = {};

  if (!data.date) {
    errors.date = 'Date is required.';
  }
  if (!data.content?.trim()) {
    errors.content = 'Content is required.';
  }

  if (data.imageFile) {
    const imageValidationResult = validateImageFile(data.imageFile);
    if (!imageValidationResult.isValid && imageValidationResult.error) {
      errors.imageFile = imageValidationResult.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates an image file based on accepted types and maximum size.
 * @param file - The image file to validate.
 * @returns An object containing a boolean indicating if the file is valid and an optional error message.
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  const { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } = PROGRESS_NOTE_CONSTANTS;

  // Cast ACCEPTED_FILE_TYPES to string[] for the includes check to satisfy TypeScript
  // when file.type is a general string and ACCEPTED_FILE_TYPES is a readonly tuple of literals.
  if (!(ACCEPTED_FILE_TYPES as readonly string[]).includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Accepted types are: ${ACCEPTED_FILE_TYPES.join(', ')}.`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    };
  }

  return { isValid: true };
}
