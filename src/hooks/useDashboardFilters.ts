/**
 * Dashboard filters hook - now using simplified implementation
 * @author @serabi
 * @created 2025-07-16
 */

import { ProjectType } from '@/types/project';
import {
  useDashboardFilters as useDashboardFiltersSimplified,
  UseDashboardFiltersReturn,
} from './useDashboardFiltersSimplified';

export { UseDashboardFiltersReturn };

export const useDashboardFilters = (projects: ProjectType[]): UseDashboardFiltersReturn => {
  return useDashboardFiltersSimplified(projects);
};

export default useDashboardFilters;
