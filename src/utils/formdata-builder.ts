/**
 * Utility for building FormData objects for PocketBase API calls
 * Handles proper type preservation and file uploads
 */

import type { ProjectUpdateData } from '@/types/file-upload';

/**
 * Builds FormData for PocketBase update operations
 * Preserves proper data types instead of converting everything to strings
 */
export function buildFormDataForUpdate(data: ProjectUpdateData, imageFile?: File): FormData {
  const formData = new FormData();

  // Add all non-file fields with proper type preservation
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'image') return; // Skip image field, handle separately

    // Only add non-null, non-undefined, non-empty values
    if (value !== undefined && value !== null && value !== '') {
      // For PocketBase FormData, we need to convert to string but preserve meaningful values
      if (typeof value === 'boolean') {
        formData.append(key, value.toString());
      } else if (typeof value === 'number') {
        formData.append(key, value.toString());
      } else if (typeof value === 'string') {
        formData.append(key, value);
      } else {
        // For any other type, convert to JSON string
        formData.append(key, JSON.stringify(value));
      }
    }
  });

  // Add image file if present
  if (imageFile) {
    formData.append('image', imageFile);
  }

  return formData;
}

/**
 * Validates FormData before sending to PocketBase
 * Ensures all required fields are present and files are valid
 */
export function validateFormDataForUpdate(
  formData: FormData,
  requiredFields: string[] = []
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  for (const field of requiredFields) {
    if (!formData.has(field)) {
      errors.push(`Required field '${field}' is missing`);
    }
  }

  // Validate file if present
  const imageFile = formData.get('image');
  if (imageFile && imageFile instanceof File) {
    // Check file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      errors.push('Image file size cannot exceed 10MB');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(imageFile.type)) {
      errors.push(
        `Invalid file type: ${imageFile.type}. Allowed types: ${allowedTypes.join(', ')}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Logs FormData contents for debugging (safely handles File objects)
 */
export function logFormData(formData: FormData, label: string = 'FormData'): void {
  if (import.meta.env.DEV) {
    // console.group(`[Debug] ${label}`);
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // console.log(
        //   `${key}:`,
        //   `[File: ${value.name}, size: ${value.size} bytes, type: ${value.type}]`
        // );
      } else {
        // console.log(`${key}:`, value);
      }
    }
    // console.groupEnd();
  }
}
