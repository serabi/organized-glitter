/**
 * Hook for accessing user timezone preference with fallbacks
 * @author @serabi
 * @created 2025-01-13
 */

import { useAuth } from '@/hooks/useAuth';
import { detectUserTimezone } from '@/utils/timezoneUtils';

/**
 * Hook to get the user's preferred timezone with intelligent fallbacks
 *
 * @returns User's timezone preference, browser-detected timezone, or UTC as final fallback
 */
export function useUserTimezone(): string {
  const { user } = useAuth();

  // Priority order: user preference > browser detection > UTC fallback
  return user?.timezone || detectUserTimezone();
}

/**
 * Hook to check if user has explicitly set a timezone preference
 *
 * @returns True if user has a saved timezone preference
 */
export function useHasTimezonePreference(): boolean {
  const { user } = useAuth();

  return Boolean(user?.timezone);
}
