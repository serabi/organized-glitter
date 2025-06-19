import { pb } from '@/lib/pocketbase';

/**
 * Clears all authentication data when switching environments
 * This helps prevent auth conflicts between local and production
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    // Sign out from PocketBase
    pb.authStore.clear();

    // Clear localStorage auth tokens
    const localStorageKeysToRemove = Object.keys(localStorage).filter(
      key =>
        key.startsWith('pocketbase_auth') ||
        key.startsWith('pb_') ||
        key.startsWith('diamond-art-auth-token') ||
        key === 'pocketbase_auth_token'
    );

    localStorageKeysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Cleared localStorage key: ${key}`);
    });

    // Clear sessionStorage auth tokens
    const sessionStorageKeysToRemove = Object.keys(sessionStorage).filter(
      key =>
        key.startsWith('pocketbase_auth') ||
        key.startsWith('pb_') ||
        key.startsWith('diamond-art-auth-token') ||
        key === 'pocketbase_auth_token'
    );

    sessionStorageKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`Cleared sessionStorage key: ${key}`);
    });

    console.log('Successfully cleared all auth data');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Helper to manually clear auth from browser console
 * Usage: window.clearOrganizedGlitterAuth()
 */
export const setupGlobalAuthClear = (): void => {
  if (typeof window !== 'undefined') {
    (window as Window & { clearOrganizedGlitterAuth?: () => void }).clearOrganizedGlitterAuth =
      clearAuthData;
    console.log('Global auth clear function available: window.clearOrganizedGlitterAuth()');
  }
};
