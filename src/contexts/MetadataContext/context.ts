/**
 * Metadata Context Definition
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext } from 'react';
import type { MetadataContextType } from './types';

export const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

// Re-export types for convenience
export type { MetadataContextType } from './types';
