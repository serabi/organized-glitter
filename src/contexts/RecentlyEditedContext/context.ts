/**
 * Recently Edited Context Definition
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext } from 'react';
import type { RecentlyEditedContextType } from './types';

export const RecentlyEditedContext = createContext<RecentlyEditedContextType | null>(null);

// Re-export types for convenience
export type { RecentlyEditedContextType } from './types';
