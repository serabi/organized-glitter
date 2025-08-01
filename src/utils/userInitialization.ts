/**
 * User initialization utilities for application startup
 */

import { createLogger } from '@/utils/logger';

const userInitLogger = createLogger('UserInit');

interface UserData {
  id: string;
  email: string;
}

/**
 * Safely initialize user data from localStorage
 * Handles parsing errors and validates storage availability
 */
export const initializeUser = (): void => {
  try {
    // Only initialize if we have localStorage support
    if (typeof Storage === 'undefined') {
      return;
    }

    const userData = localStorage.getItem('user');
    if (!userData) {
      return;
    }

    const user: UserData = JSON.parse(userData);

    // Basic validation
    if (!user.id || !user.email) {
      userInitLogger.warn('Invalid user data found in localStorage');
      localStorage.removeItem('user');
      return;
    }

    // User initialization logic here if needed
    if (import.meta.env.DEV) {
      userInitLogger.debug('User initialized:', { id: user.id, email: user.email });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      userInitLogger.error('Failed to initialize user:', error);
    }
    // Clear corrupted data
    localStorage.removeItem('user');
  }
};
