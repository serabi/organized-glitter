/**
 * React context definitions
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext } from 'react';
import { FilterContextType } from '@/contexts/FilterContext';

export const FilterStateContext = createContext<FilterContextType | null>(null);
export const FilterActionsContext = createContext<FilterContextType | null>(null);
