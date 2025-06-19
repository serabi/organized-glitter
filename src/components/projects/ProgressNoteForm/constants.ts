/**
 * Type definitions for supported image formats and constants
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const SUPPORTED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

// Type aliases for better type safety
export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];
export type SupportedAvatarType = (typeof SUPPORTED_AVATAR_TYPES)[number];

/**
 * File size constants in bytes
 */
export const FILE_SIZE = {
  /** 1 MB in bytes */
  MB_1: 1024 * 1024,
  /** 5 MB in bytes */
  MB_5: 5 * 1024 * 1024,
  /** 50 MB in bytes */
  MB_50: 50 * 1024 * 1024,
  /** 200 MB in bytes */
  MB_200: 200 * 1024 * 1024,
} as const;

/**
 * Progress note form configuration
 */
export const PROGRESS_NOTE_CONSTANTS = {
  /** Maximum file size for progress note images */
  MAX_FILE_SIZE: FILE_SIZE.MB_50,
  /** File size threshold for compression */
  COMPRESSION_THRESHOLD: FILE_SIZE.MB_5,
  /** Supported image file types */
  ACCEPTED_FILE_TYPES: SUPPORTED_IMAGE_TYPES,
  /** Throttle interval for tracking user input */
  TRACKING_THROTTLE: 10,
  /** Date format for progress notes */
  DATE_FORMAT: 'yyyy-MM-dd',
  /** Maximum content length */
  MAX_CONTENT_LENGTH: 10000,
  /** Minimum content length */
  MIN_CONTENT_LENGTH: 1,
} as const;

/**
 * Project image configuration
 */
export const PROJECT_IMAGE_CONSTANTS = {
  /** Maximum file size for project images */
  MAX_FILE_SIZE: FILE_SIZE.MB_50,
  /** File size threshold for compression */
  COMPRESSION_THRESHOLD: FILE_SIZE.MB_5,
  /** Supported image file types */
  ACCEPTED_FILE_TYPES: SUPPORTED_IMAGE_TYPES,
} as const;

/**
 * Image resize configuration for regular images
 */
export const IMAGE_RESIZE_CONSTANTS = {
  /** Maximum width for resized images */
  MAX_WIDTH: 1200,
  /** Maximum height for resized images */
  MAX_HEIGHT: 1200,
  /** Compression quality (0-1) */
  QUALITY: 0.85,
  /** Default format for compressed images */
  FORMAT: 'image/jpeg',
} as const;

/**
 * Avatar image resize configuration
 */
export const AVATAR_RESIZE_CONSTANTS = {
  /** Maximum width for avatar images - doubled for better quality on modern displays */
  MAX_WIDTH: 800,
  /** Maximum height for avatar images - doubled for better quality on modern displays */
  MAX_HEIGHT: 800,
  /** Higher compression quality for avatars */
  QUALITY: 0.95,
  /** Target size for final avatar */
  TARGET_SIZE: 200,
  /** Default format for avatar images */
  FORMAT: 'image/jpeg',
} as const;

/**
 * Avatar upload and processing configuration
 */
export const AVATAR_CONSTANTS = {
  /** Maximum file size after processing */
  MAX_FILE_SIZE: FILE_SIZE.MB_5,
  /** Maximum original file size before processing - let compression handle it */
  MAX_ORIGINAL_FILE_SIZE: FILE_SIZE.MB_200,
  /** Supported file types for avatars */
  ACCEPTED_FILE_TYPES: SUPPORTED_AVATAR_TYPES,
  /** Compression options */
  COMPRESSION: {
    MAX_SIZE_MB: 1,
    MAX_WIDTH_OR_HEIGHT: 400,
    USE_WEB_WORKER: true,
    INITIAL_QUALITY: 0.8,
  },
} as const;

/**
 * Validation constants
 */
export const VALIDATION = {
  /** Minimum file size to prevent corrupted files */
  MIN_FILE_SIZE: 100,
  /** Maximum target size for cropped images */
  MAX_TARGET_SIZE: 2000,
  /** Quality bounds */
  QUALITY: {
    MIN: 0,
    MAX: 1,
  },
} as const;

/**
 * Animation and UI constants
 */
export const UI_CONSTANTS = {
  /** Debounce delay for form inputs */
  DEBOUNCE_DELAY: 300,
  /** Animation duration for transitions */
  ANIMATION_DURATION: 150,
  /** Toast display duration */
  TOAST_DURATION: 3000,
} as const;

// Export all constants as a single object for convenience
export const ALL_CONSTANTS = {
  PROGRESS_NOTE: PROGRESS_NOTE_CONSTANTS,
  PROJECT_IMAGE: PROJECT_IMAGE_CONSTANTS,
  IMAGE_RESIZE: IMAGE_RESIZE_CONSTANTS,
  AVATAR_RESIZE: AVATAR_RESIZE_CONSTANTS,
  AVATAR: AVATAR_CONSTANTS,
  VALIDATION,
  UI: UI_CONSTANTS,
  FILE_SIZE,
} as const;

// Type for accessing nested constants
export type ConstantKey = keyof typeof ALL_CONSTANTS;
export type ConstantValue<T extends ConstantKey> = (typeof ALL_CONSTANTS)[T];
