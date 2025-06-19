import { useContext } from 'react';
import {
  DashboardFiltersContext,
  DashboardFiltersContextValue,
} from '@/contexts/DashboardFiltersContext';

export const useDashboardFiltersContext = (): DashboardFiltersContextValue => {
  const context = useContext(DashboardFiltersContext);
  if (context === undefined) {
    throw new Error('useDashboardFiltersContext must be used within a DashboardFiltersProvider');
  }
  return context;
};
