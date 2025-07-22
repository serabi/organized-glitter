/**
 * Dashboard view state management hook
 * @author @serabi
 * @created 2025-07-16
 */

import { useState, useEffect } from 'react';
import { ProjectFilterStatus, ViewType } from '@/types/project';
import { useDashboardPersistence } from './useDashboardPersistence';

export const useDashboardViewState = () => {
  const { initialFilters, getInitialViewType, persistFiltersToLocalStorage } =
    useDashboardPersistence();

  // View and filter state
  // Note: activeStatus and searchTerm are intentionally non-persistent (reset on page refresh)
  // This provides better UX where users start with clean status/search state each session
  const [activeStatus, setActiveStatus] = useState<ProjectFilterStatus>('all');
  const [viewType, setViewType] = useState<ViewType>(getInitialViewType());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(initialFilters.selectedCompany || 'all');
  const [selectedArtist, setSelectedArtist] = useState(initialFilters.selectedArtist || 'all');
  const [selectedDrillShape, setSelectedDrillShape] = useState(
    initialFilters.selectedDrillShape || 'all'
  );
  const [selectedTag, setSelectedTag] = useState(initialFilters.selectedTag || 'all');
  const [selectedYearFinished, setSelectedYearFinished] = useState(
    initialFilters.selectedYearFinished || 'all'
  );
  const [includeMiniKits, setIncludeMiniKits] = useState(initialFilters.includeMiniKits || false);
  const [filterInitialized, setFilterInitialized] = useState(false);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    persistFiltersToLocalStorage({
      selectedCompany,
      selectedArtist,
      selectedDrillShape,
      selectedTag,
      selectedYearFinished,
      includeMiniKits,
      viewType,
    });
  }, [
    selectedCompany,
    selectedArtist,
    selectedDrillShape,
    selectedTag,
    selectedYearFinished,
    includeMiniKits,
    viewType,
    persistFiltersToLocalStorage,
  ]);

  const resetFilters = () => {
    setActiveStatus('all');
    setSearchTerm('');
    setSelectedCompany('all');
    setSelectedArtist('all');
    setSelectedDrillShape('all');
    setSelectedTag('all');
    setSelectedYearFinished('all');
    setIncludeMiniKits(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    // Note: searchTerm is excluded as it's non-persistent (session-only)
    // activeStatus is excluded as it's handled separately by tab UI
    if (selectedCompany !== 'all') count++;
    if (selectedArtist !== 'all') count++;
    if (selectedDrillShape !== 'all') count++;
    if (selectedTag !== 'all') count++;
    if (selectedYearFinished !== 'all') count++;
    if (includeMiniKits) count++;
    return count;
  };

  return {
    // State
    activeStatus,
    viewType,
    searchTerm,
    selectedCompany,
    selectedArtist,
    selectedDrillShape,
    selectedTag,
    selectedYearFinished,
    includeMiniKits,
    filterInitialized,

    // Setters
    setActiveStatus,
    setViewType,
    setSearchTerm,
    setSelectedCompany,
    setSelectedArtist,
    setSelectedDrillShape,
    setSelectedTag,
    setSelectedYearFinished,
    setIncludeMiniKits,
    setFilterInitialized,

    // Actions
    resetFilters,
    getActiveFilterCount,
  };
};
