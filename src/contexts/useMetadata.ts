/**
 * useMetadata hook - extracted for React Fast Refresh optimization
 * @author @serabi
 * @created 2025-08-02
 */

import { useContext } from 'react';
import { MetadataContext } from '@/contexts/contexts-metadata';

/**
 * Hook to access metadata context
 * @returns MetadataContextType with companies, artists, tags data and loading states
 * @throws Error if used outside of MetadataProvider
 */
export function useMetadata() {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('useMetadata must be used within a MetadataProvider');
  }
  return context;
}

// Re-export MetadataProvider for backward compatibility
export { MetadataProvider } from '@/contexts/MetadataContext';
