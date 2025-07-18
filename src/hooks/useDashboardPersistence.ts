/**
 * Dashboard filters localStorage persistence hook
 *
 * Manages persistence of dashboard filter state across sessions.
 *
 * PERSISTENT FILTERS (saved to localStorage):
 * - selectedCompany, selectedArtist, selectedDrillShape, selectedTag, selectedYearFinished
 * - includeMiniKits, viewType
 *
 * NON-PERSISTENT FILTERS (reset on page refresh):
 * - activeStatus (tab selection) - better UX to start fresh each session
 * - searchTerm - session-only for privacy and fresh search experience
 *
 * @author @serabi
 * @created 2025-07-16
 */

import { useCallback, useMemo } from 'react';
import { ProjectFilterStatus, ViewType } from '@/types/project';
import { secureLogger } from '@/utils/secureLogger';

interface DashboardFilters {
  selectedCompany?: string;
  selectedArtist?: string;
  selectedDrillShape?: string;
  selectedTag?: string;
  selectedYearFinished?: string;
  includeMiniKits?: boolean;
  viewType?: ViewType;
}

interface DashboardFilterState {
  selectedCompany: string;
  selectedArtist: string;
  selectedDrillShape: string;
  selectedTag: string;
  selectedYearFinished: string;
  includeMiniKits: boolean;
  viewType: ViewType;
}

export const useDashboardPersistence = () => {
  // Load initial filters from localStorage
  const initialFilters = useMemo(() => {
    const storedFilters = localStorage.getItem('dashboardFilters');
    try {
      return storedFilters ? JSON.parse(storedFilters) : {};
    } catch (error) {
      secureLogger.error('Failed to parse dashboardFilters from localStorage', error);
      return {};
    }
  }, []);

  const getInitialViewType = useCallback((): ViewType => {
    const storedViewType = initialFilters.viewType;
    if (storedViewType === 'grid' || storedViewType === 'list') {
      return storedViewType;
    }
    return 'grid'; // Default
  }, [initialFilters.viewType]);

  const persistFiltersToLocalStorage = useCallback((filterState: DashboardFilterState) => {
    try {
      localStorage.setItem(
        'dashboardFilters',
        JSON.stringify({
          selectedCompany: filterState.selectedCompany,
          selectedArtist: filterState.selectedArtist,
          selectedDrillShape: filterState.selectedDrillShape,
          selectedTag: filterState.selectedTag,
          selectedYearFinished: filterState.selectedYearFinished,
          includeMiniKits: filterState.includeMiniKits,
          viewType: filterState.viewType,
        })
      );
    } catch (error) {
      secureLogger.error('Failed to persist dashboardFilters to localStorage', error);
    }
  }, []);

  return {
    initialFilters,
    getInitialViewType,
    persistFiltersToLocalStorage,
  };
};
