/**
 * React context definitions
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext } from 'react';
import { FilterStateContextType } from '@/contexts/filterState';
import { FilterActionsContextType } from '@/contexts/filterActions';

export const FilterStateContext = createContext<FilterStateContextType | null>(null);
export const FilterActionsContext = createContext<FilterActionsContextType | null>(null);