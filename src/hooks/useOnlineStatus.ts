/**
 * Hook for tracking browser online/offline status
 * @author @serabi
 * @created 2025-08-02
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook to track browser online/offline status
 * @returns boolean indicating current connection status
 */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
