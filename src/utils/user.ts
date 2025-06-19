/**
 * Gets a display name for a user based on available profile information
 * Uses a consistent hierarchy to resolve the name from multiple possible sources
 * Always returns a non-empty string to prevent loading loops in UI components
 *
 * @param user The PocketBase user record
 * @returns A display name string (never empty)
 */
export function getDisplayName(
  user: { username?: string; email?: string; name?: string } | null
): string {
  if (!user) return 'Diamond Art Enthusiast';

  // Check if username is empty string and treat it as null
  const username = user.username && user.username.trim() !== '' ? user.username : null;

  // Check if name is empty string and treat it as null
  const name = user.name && user.name.trim() !== '' ? user.name : null;

  // Email-derived username - make it more friendly
  const emailUsername = user.email ? user.email.split('@')[0] : null;

  // Always return a non-empty string to prevent loading loops
  return (
    // First priority: username from user record
    username ||
    // Second priority: name field
    name ||
    // Third priority: derive from email
    emailUsername ||
    // Fallback
    'Diamond Art Enthusiast'
  );
}
