/**
 * @fileoverview Shared slug generation utility
<<<<<<< HEAD
 *
 * Provides consistent URL-safe slug generation across the application.
 * This utility ensures that slugs generated for the same input are identical
 * regardless of where they're created (TagService, CSV import, etc.).
 *
=======
 * 
 * Provides consistent URL-safe slug generation across the application.
 * This utility ensures that slugs generated for the same input are identical
 * regardless of where they're created (TagService, CSV import, etc.).
 * 
>>>>>>> main
 * @version 1.0.0
 * @since 2025-07-01
 */

/**
 * Generate URL-safe slug from text
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> main
 * Creates a URL-safe slug from any text input by converting to lowercase,
 * replacing non-alphanumeric characters with hyphens, and removing
 * leading/trailing hyphens. This method is consistent with the TagService
 * implementation and ensures database slug uniqueness.
<<<<<<< HEAD
 *
 * @function
 * @param {string} text - Original text to convert to slug
 * @returns {string} URL-safe slug representation
 *
=======
 * 
 * @function
 * @param {string} text - Original text to convert to slug
 * @returns {string} URL-safe slug representation
 * 
>>>>>>> main
 * @example
 * ```typescript
 * generateSlug('My Awesome Tag!'); // Returns: 'my-awesome-tag'
 * generateSlug('  Special & Characters  '); // Returns: 'special-characters'
<<<<<<< HEAD
 * generateSlug('Changed snowflakes using light purple pearl from shimmering canvases');
=======
 * generateSlug('Changed snowflakes using light purple pearl from shimmering canvases'); 
>>>>>>> main
 * // Returns: 'changed-snowflakes-using-light-purple-pearl-from-shimmering-canvases'
 * ```
 */
export const generateSlug = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Generate unique slug with collision handling
<<<<<<< HEAD
 *
 * Creates a unique slug by appending a numeric suffix if the base slug
 * already exists. This is useful for CSV imports where duplicate tag names
 * might exist but need unique slugs in the database.
 *
=======
 * 
 * Creates a unique slug by appending a numeric suffix if the base slug
 * already exists. This is useful for CSV imports where duplicate tag names
 * might exist but need unique slugs in the database.
 * 
>>>>>>> main
 * @function
 * @param {string} text - Original text to convert to slug
 * @param {(slug: string) => Promise<boolean>} checkExists - Function to check if slug exists
 * @param {number} maxAttempts - Maximum number of attempts (default: 100)
 * @returns {Promise<string>} Unique URL-safe slug
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> main
 * @example
 * ```typescript
 * const checkSlugExists = async (slug: string) => {
 *   // Check database for existing slug
 *   const result = await pb.collection('tags').getFirstListItem(`slug = "${slug}"`);
 *   return !!result;
 * };
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> main
 * const uniqueSlug = await generateUniqueSlug('my-tag', checkSlugExists);
 * // Returns: 'my-tag' if available, 'my-tag-2' if 'my-tag' exists, etc.
 * ```
 */
export const generateUniqueSlug = async (
  text: string,
  checkExists: (slug: string) => Promise<boolean>,
  maxAttempts: number = 100
): Promise<string> => {
  const baseSlug = generateSlug(text);
<<<<<<< HEAD

=======
  
>>>>>>> main
  // If base slug is empty after processing, use a fallback
  if (!baseSlug) {
    return generateUniqueSlug('tag', checkExists, maxAttempts);
  }
<<<<<<< HEAD

=======
  
>>>>>>> main
  // Check if base slug is available
  const baseExists = await checkExists(baseSlug);
  if (!baseExists) {
    return baseSlug;
  }
<<<<<<< HEAD

=======
  
>>>>>>> main
  // Try numbered variations
  for (let i = 2; i <= maxAttempts; i++) {
    const candidateSlug = `${baseSlug}-${i}`;
    const exists = await checkExists(candidateSlug);
    if (!exists) {
      return candidateSlug;
    }
  }
<<<<<<< HEAD

  // Fallback to timestamp if all attempts exhausted
  const timestamp = Date.now();
  return `${baseSlug}-${timestamp}`;
};
=======
  
  // Fallback to timestamp if all attempts exhausted
  const timestamp = Date.now();
  return `${baseSlug}-${timestamp}`;
};
>>>>>>> main
