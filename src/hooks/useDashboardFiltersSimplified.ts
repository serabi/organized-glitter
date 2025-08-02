/**
 * Simplified dashboard filters hook with core filtering logic only
 * @author @serabi
 * @created 2025-07-16
 */

import { useState, useEffect, useMemo } from 'react';
import { ProjectType } from '@/types/project';
import { TagService } from '@/lib/tags';
import { Tag } from '@/types/tag';
import { logger } from '@/utils/logger';
import { useDashboardViewState } from './useDashboardViewState';

interface DashboardTabCounts {
  all: number;
  wishlist: number;
  purchased: number;
  stash: number;
  progress: number;
  completed: number;
  destashed: number;
  archived: number;
}

export interface UseDashboardFiltersReturn {
  // Filter state from view state hook
  activeStatus: ReturnType<typeof useDashboardViewState>['activeStatus'];
  setActiveStatus: ReturnType<typeof useDashboardViewState>['setActiveStatus'];
  viewType: ReturnType<typeof useDashboardViewState>['viewType'];
  setViewType: ReturnType<typeof useDashboardViewState>['setViewType'];
  searchTerm: ReturnType<typeof useDashboardViewState>['searchTerm'];
  setSearchTerm: ReturnType<typeof useDashboardViewState>['setSearchTerm'];
  selectedCompany: ReturnType<typeof useDashboardViewState>['selectedCompany'];
  setSelectedCompany: ReturnType<typeof useDashboardViewState>['setSelectedCompany'];
  selectedArtist: ReturnType<typeof useDashboardViewState>['selectedArtist'];
  setSelectedArtist: ReturnType<typeof useDashboardViewState>['setSelectedArtist'];
  selectedDrillShape: ReturnType<typeof useDashboardViewState>['selectedDrillShape'];
  setSelectedDrillShape: ReturnType<typeof useDashboardViewState>['setSelectedDrillShape'];
  selectedTag: ReturnType<typeof useDashboardViewState>['selectedTag'];
  setSelectedTag: ReturnType<typeof useDashboardViewState>['setSelectedTag'];
  selectedYearFinished: ReturnType<typeof useDashboardViewState>['selectedYearFinished'];
  setSelectedYearFinished: ReturnType<typeof useDashboardViewState>['setSelectedYearFinished'];
  includeMiniKits: ReturnType<typeof useDashboardViewState>['includeMiniKits'];
  setIncludeMiniKits: ReturnType<typeof useDashboardViewState>['setIncludeMiniKits'];
  filterInitialized: ReturnType<typeof useDashboardViewState>['filterInitialized'];
  setFilterInitialized: ReturnType<typeof useDashboardViewState>['setFilterInitialized'];

  // Computed data
  filteredProjects: ProjectType[];
  drillShapes: string[];
  tags: string[];
  yearFinishedOptions: string[];
  getCounts: DashboardTabCounts;
  projectsWithoutPurchaseDateCount: number;
  projectsWithoutFinishDateCount: number;

  // Actions
  resetFilters: ReturnType<typeof useDashboardViewState>['resetFilters'];
  getActiveFilterCount: ReturnType<typeof useDashboardViewState>['getActiveFilterCount'];
}

export const useDashboardFilters = (projects: ProjectType[]): UseDashboardFiltersReturn => {
  // Use view state hook for all state management
  const viewState = useDashboardViewState();
  const [allUserTags, setAllUserTags] = useState<Tag[]>([]);

  // Fetch all user tags for the filter dropdown
  useEffect(() => {
    const fetchUserTags = async () => {
      try {
        const response = await TagService.getUserTags();
        if (response.status === 'success' && response.data) {
          setAllUserTags(response.data);
        } else {
          logger.error('Failed to fetch user tags:', response.error);
          setAllUserTags([]);
        }
      } catch (error) {
        logger.error('Error fetching user tags:', error);
        setAllUserTags([]);
      }
    };

    fetchUserTags();
  }, []);

  // Extract unique drill shapes from projects
  const drillShapes = Array.from(
    new Set(
      projects
        .map(project => project.drillShape)
        .filter((shape): shape is string => shape !== undefined)
    )
  );

  // Get all user tags (not just those used in projects)
  const tags = allUserTags.map(tag => tag.name).sort();

  // Extract unique years from completed projects
  const yearFinishedOptions = Array.from(
    new Set(
      projects
        .filter(project => project.dateCompleted)
        .map(project => new Date(project.dateCompleted!).getFullYear().toString())
        .filter(Boolean)
    )
  ).sort((a, b) => parseInt(b) - parseInt(a)); // Sort years in descending order

  // Apply all filters to projects
  const filteredProjects = useMemo(() => {
    let tempFilteredProjects = [...projects];

    // Apply status filter
    if (viewState.activeStatus !== 'everything') {
      tempFilteredProjects = tempFilteredProjects.filter(
        project => project.status === viewState.activeStatus
      );
    }

    // Apply search filter
    if (viewState.searchTerm) {
      const search = viewState.searchTerm.toLowerCase();
      tempFilteredProjects = tempFilteredProjects.filter(
        project =>
          project.title.toLowerCase().includes(search) ||
          (project.company && project.company.toLowerCase().includes(search)) ||
          (project.artist && project.artist.toLowerCase().includes(search))
      );
    }

    // Apply company filter
    if (viewState.selectedCompany !== 'all') {
      tempFilteredProjects = tempFilteredProjects.filter(
        project => project.company === viewState.selectedCompany
      );
    }

    // Apply artist filter - case-insensitive exact match
    if (viewState.selectedArtist !== 'all') {
      tempFilteredProjects = tempFilteredProjects.filter(project => {
        if (!project.artist) return false;
        const projectArtist = project.artist.toLowerCase().trim();
        const filterArtist = viewState.selectedArtist.toLowerCase().trim();
        return projectArtist === filterArtist;
      });
    }

    // Apply drill shape filter
    if (viewState.selectedDrillShape !== 'all') {
      tempFilteredProjects = tempFilteredProjects.filter(
        project => project.drillShape === viewState.selectedDrillShape
      );
    }

    // Apply tag filter
    if (viewState.selectedTag !== 'all') {
      tempFilteredProjects = tempFilteredProjects.filter(project => {
        if (!project.tags || !Array.isArray(project.tags)) return false;
        return project.tags.some(
          tag =>
            tag.name && tag.name.toLowerCase().trim() === viewState.selectedTag.toLowerCase().trim()
        );
      });
    }

    // Apply year finished filter
    if (viewState.selectedYearFinished !== 'all') {
      tempFilteredProjects = tempFilteredProjects.filter(project => {
        if (!project.dateCompleted) return false;
        const completedYear = new Date(project.dateCompleted).getFullYear().toString();
        return completedYear === viewState.selectedYearFinished;
      });
    }

    // Apply kit category filter
    if (!viewState.includeMiniKits) {
      tempFilteredProjects = tempFilteredProjects.filter(
        project => project.kit_category !== 'mini'
      );
    }

    return tempFilteredProjects;
  }, [
    projects,
    viewState.activeStatus,
    viewState.searchTerm,
    viewState.selectedCompany,
    viewState.selectedArtist,
    viewState.selectedDrillShape,
    viewState.selectedTag,
    viewState.selectedYearFinished,
    viewState.includeMiniKits,
  ]);

  // Calculate counts for each status
  const getCounts = useMemo((): DashboardTabCounts => {
    const counts: DashboardTabCounts = {
      all: projects.length,
      wishlist: 0,
      purchased: 0,
      stash: 0,
      progress: 0,
      completed: 0,
      destashed: 0,
      archived: 0,
    };

    projects.forEach(project => {
      if (project.status in counts) {
        counts[project.status as keyof DashboardTabCounts]++;
      }
    });

    return counts;
  }, [projects]);

  // Placeholder counts (previously calculated but now removed from original logic)
  const projectsWithoutPurchaseDateCount = 0;
  const projectsWithoutFinishDateCount = 0;

  return {
    // Spread all view state
    ...viewState,

    // Computed data
    filteredProjects,
    drillShapes,
    tags,
    yearFinishedOptions,
    getCounts,
    projectsWithoutPurchaseDateCount,
    projectsWithoutFinishDateCount,
  };
};
