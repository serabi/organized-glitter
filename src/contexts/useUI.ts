/**
 * useUI hook - extracted for React Fast Refresh optimization
 * @author @serabi
 * @created 2025-08-02
 */

import { useContext } from 'react';
import { UIContext, type UIContextType } from '@/contexts/contexts-ui';

/**
 * Hook to access UI context state and utilities
 * Must be used within a UIProvider component.
 *
 * @returns UIContextType with UI state and control functions
 * @throws Error if used outside of UIProvider
 */
export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

// Re-export UIProvider for backward compatibility
export { UIProvider } from '@/contexts/UIContext';
