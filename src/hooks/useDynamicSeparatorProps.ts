/**
 * Hook to compute dynamic separator props for date-based sorting
 * @author @serabi
 * @created 2025-07-04
 */

import { useMemo } from 'react';
import { ProjectType } from '@/types/project';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';

// Types for dynamic separator props
export interface DynamicSeparatorProps {
  isCurrentSortDateBased: boolean;
  currentSortDateFriendlyName: string;
  currentSortDatePropertyKey: string;
  countOfItemsWithoutCurrentSortDate: number;
}

export const useDynamicSeparatorProps = (
  sortField: DashboardValidSortField,
  projects: ProjectType[]
): DynamicSeparatorProps => {
  return useMemo(() => {
    const dateSortFields = {
      date_purchased: { friendlyName: 'purchase date', propertyKey: 'date_purchased' },
      date_received: { friendlyName: 'received date', propertyKey: 'date_received' },
      date_started: { friendlyName: 'start date', propertyKey: 'date_started' },
      date_finished: { friendlyName: 'finish date', propertyKey: 'date_finished' },
    };

    const isCurrentSortDateBased = sortField in dateSortFields;
    const dateConfig = dateSortFields[sortField as keyof typeof dateSortFields];

    const currentSortDateFriendlyName = dateConfig?.friendlyName || '';
    const currentSortDatePropertyKey = dateConfig?.propertyKey || '';

    // Count projects without the current sort date
    let countOfItemsWithoutCurrentSortDate = 0;
    if (projects && isCurrentSortDateBased && currentSortDatePropertyKey) {
      countOfItemsWithoutCurrentSortDate = projects.filter(
        project => !project[currentSortDatePropertyKey as keyof ProjectType]
      ).length;
    }

    return {
      isCurrentSortDateBased,
      currentSortDateFriendlyName,
      currentSortDatePropertyKey,
      countOfItemsWithoutCurrentSortDate,
    };
  }, [sortField, projects]);
};
