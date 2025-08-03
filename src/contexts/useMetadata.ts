/**
 * useMetadata hook - legacy compatibility layer
 * @deprecated Use @/contexts/MetadataContext directly for new code
 * @author @serabi
 * @created 2025-08-02
 */

// Re-export from the new MetadataContext folder for backward compatibility
export { useMetadata } from './MetadataContext/hooks';
export { MetadataProvider } from './MetadataContext/MetadataProvider';
