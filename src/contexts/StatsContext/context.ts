/**
 * StatsContext - React context definition for dashboard statistics
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext } from 'react';
import type { StatsContextType } from './types';

/**
 * React context for dashboard statistics with optimized performance
 *
 * Provides access to:
 * - Project status counts and breakdowns
 * - Loading and error states
 * - Performance optimizations for mobile/slow networks
 * - Badge content with loading spinners
 * - Retry functionality for failed requests
 */
export const StatsContext = createContext<StatsContextType | null>(null);

StatsContext.displayName = 'StatsContext';
