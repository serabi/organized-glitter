import { useState, useEffect, useMemo, useCallback } from 'react';
import { ProjectType, ProjectFilterStatus, ViewType } from '@/types/project'; // Added ViewType
import { TagService } from '@/lib/tags';
import { Tag } from '@/types/tag';
// import { sortProjectsByDate } from '../utils/projectSorting'; // Removed

// export type SortByType = 'title' | 'status' | 'datePurchased' | 'dateCompleted' | 'createdAt' | 'updatedAt'; // Removed
// export type SortOrderType = 'asc' | 'desc'; // Removed

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
  activeStatus: ProjectFilterStatus;
  setActiveStatus: React.Dispatch<React.SetStateAction<ProjectFilterStatus>>;
  viewType: ViewType;
  setViewType: React.Dispatch<React.SetStateAction<ViewType>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  selectedCompany: string;
  setSelectedCompany: React.Dispatch<React.SetStateAction<string>>;
  selectedArtist: string;
  setSelectedArtist: React.Dispatch<React.SetStateAction<string>>;
  selectedDrillShape: string;
  setSelectedDrillShape: React.Dispatch<React.SetStateAction<string>>;
  selectedTag: string;
  setSelectedTag: React.Dispatch<React.SetStateAction<string>>;
  selectedYearFinished: string;
  setSelectedYearFinished: React.Dispatch<React.SetStateAction<string>>;
  includeMiniKits: boolean;
  setIncludeMiniKits: React.Dispatch<React.SetStateAction<boolean>>;
  filteredProjects: ProjectType[];
  drillShapes: string[];
  tags: string[];
  yearFinishedOptions: string[];
  getCounts: DashboardTabCounts;
  filterInitialized: boolean;
  setFilterInitialized: React.Dispatch<React.SetStateAction<boolean>>;
  projectsWithoutPurchaseDateCount: number;
  projectsWithoutFinishDateCount: number;
  resetFilters: () => void;
  getActiveFilterCount: () => number;
}

export const useDashboardFilters = (projects: ProjectType[]): UseDashboardFiltersReturn => {
  // Load initial filters from localStorage
  const initialFilters = useMemo(() => {
    const storedFilters = localStorage.getItem('dashboardFilters');
    try {
      return storedFilters ? JSON.parse(storedFilters) : {};
    } catch (error) {
      console.error('Failed to parse dashboardFilters from localStorage', error);
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

  // Filters and view settings
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
  const [includeMiniKits, setIncludeMiniKits] = useState(initialFilters.includeMiniKits || false); // New filter state
  const [filterInitialized, setFilterInitialized] = useState(false);
  const [allUserTags, setAllUserTags] = useState<Tag[]>([]);

  // Sorting state - REMOVED as sorting is handled by useProjectsData
  // const [sortBy, setSortBy] = useState<SortByType>(initialFilters.sortBy || 'createdAt');
  // const [sortOrder, setSortOrder] = useState<SortOrderType>(initialFilters.sortOrder || 'desc');

  // Persist filters to localStorage
  const persistFiltersToLocalStorage = useCallback(() => {
    localStorage.setItem(
      'dashboardFilters',
      JSON.stringify({
        selectedCompany,
        selectedArtist,
        selectedDrillShape,
        selectedTag,
        selectedYearFinished,
        includeMiniKits, // Persist new filter
        viewType,
        // sortBy, // Removed
        // sortOrder // Removed
      })
    );
  }, [
    selectedCompany,
    selectedArtist,
    selectedDrillShape,
    selectedTag,
    selectedYearFinished,
    includeMiniKits,
    viewType,
  ]); // Removed sortBy, sortOrder from deps, added includeMiniKits

  // Effect to persist filters whenever they change
  useEffect(() => {
    persistFiltersToLocalStorage();
  }, [persistFiltersToLocalStorage]);

  // Fetch all user tags for the filter dropdown
  useEffect(() => {
    const fetchUserTags = async () => {
      try {
        const response = await TagService.getUserTags();
        if (response.status === 'success' && response.data) {
          setAllUserTags(response.data);
        } else {
          console.error('Failed to fetch user tags:', response.error);
          setAllUserTags([]);
        }
      } catch (error) {
        console.error('Error fetching user tags:', error);
        setAllUserTags([]);
      }
    };

    fetchUserTags();
  }, []);

  // Counts for projects without specific dates are now illustrative and might need actual calculation if still used
  // For now, they are not directly calculated here as primary sorting changed.
  // If these specific counts are needed for UI elements driven by useDashboardFilters,
  // they would need to be recalculated based on the filteredProjects.
  // However, the primary mechanism for "count of items without date" is now in Dashboard.tsx's dynamicSeparatorProps.

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

  // Debug tags - show both project tags and all user tags
  useEffect(() => {
    console.log('useDashboardFilters - Total projects:', projects.length);
    console.log(
      'useDashboardFilters - Projects with tags:',
      projects.filter(p => p.tags && p.tags.length > 0).length
    );
    const projectTags = projects.flatMap(p => p.tags || []);
    console.log(
      'useDashboardFilters - Tags from projects:',
      projectTags.map(t => t.name)
    );
    console.log(
      'useDashboardFilters - All user tags:',
      allUserTags.map(t => t.name)
    );
    console.log('useDashboardFilters - Final tags for filter:', tags);
  }, [projects, allUserTags, tags]);

  // Extract unique years from completed projects
  const yearFinishedOptions = Array.from(
    new Set(
      projects
        .filter(project => project.dateCompleted)
        .map(project => new Date(project.dateCompleted!).getFullYear().toString())
        .filter(Boolean)
    )
  ).sort((a, b) => parseInt(b) - parseInt(a)); // Sort years in descending order

  // Log all available artists for debugging
  useEffect(() => {
    const projectArtists = projects
      .map(project => project.artist)
      .filter(artist => artist !== undefined);

    console.log('All project artists:', projectArtists);
  }, [projects]);

  // Memoize filtered projects
  // Sorting is now handled by useProjectsData, so this hook only filters.
  const filteredProjects = useMemo(() => {
    let tempFilteredProjects = [...projects]; // projects are already sorted by useProjectsData

    // Apply status filter
    if (activeStatus !== 'all') {
      tempFilteredProjects = tempFilteredProjects.filter(
        project => project.status === activeStatus
      );
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      tempFilteredProjects = tempFilteredProjects.filter(
        project =>
          project.title.toLowerCase().includes(search) ||
          (project.company && project.company.toLowerCase().includes(search)) ||
          (project.artist && project.artist.toLowerCase().includes(search))
      );
    }

    // Apply company filter
    if (selectedCompany !== 'all') {
      tempFilteredProjects = tempFilteredProjects.filter(
        project => project.company === selectedCompany
      );
    }

    // Apply artist filter - case-insensitive exact match
    if (selectedArtist !== 'all') {
      console.log(`Filtering by artist: "${selectedArtist}"`);
      tempFilteredProjects = tempFilteredProjects.filter(project => {
        if (!project.artist) return false;

        const projectArtist = project.artist.toLowerCase().trim();
        const filterArtist = selectedArtist.toLowerCase().trim();
        const match = projectArtist === filterArtist;

        return match;
      });
    }

    // Apply drill shape filter
    if (selectedDrillShape !== 'all') {
      tempFilteredProjects = tempFilteredProjects.filter(
        project => project.drillShape === selectedDrillShape
      );
    }

    // Apply tag filter
    if (selectedTag !== 'all') {
      console.log(`Filtering by tag: "${selectedTag}"`);
      tempFilteredProjects = tempFilteredProjects.filter(project => {
        if (!project.tags || !Array.isArray(project.tags)) return false;

        return project.tags.some(
          tag => tag.name && tag.name.toLowerCase().trim() === selectedTag.toLowerCase().trim()
        );
      });
    }

    // Apply year finished filter
    if (selectedYearFinished !== 'all') {
      tempFilteredProjects = tempFilteredProjects.filter(project => {
        if (!project.dateCompleted) return false;
        const completedYear = new Date(project.dateCompleted).getFullYear().toString();
        return completedYear === selectedYearFinished;
      });
    }

    // Apply kit category filter
    if (!includeMiniKits) {
      tempFilteredProjects = tempFilteredProjects.filter(
        project => project.kit_category !== 'mini'
      );
    }

    // REMOVED: tempFilteredProjects = sortProjectsByDate(tempFilteredProjects, sortBy, sortOrder);
    // Sorting is handled by useProjectsData before projects are passed to this hook.

    // The specific counts for projectsWithoutPurchaseDateCount and projectsWithoutFinishDateCount
    // were tied to the local sortBy state. If these exact counts are still needed for UI elements
    // driven by useDashboardFilters, they would need a different calculation method here,
    // or be sourced from where the primary sortField (from useProjectsData) is known.
    // For now, they are removed as their original calculation context is gone.

    return tempFilteredProjects;
  }, [
    activeStatus,
    searchTerm,
    selectedCompany,
    selectedArtist,
    selectedDrillShape,
    selectedTag,
    selectedYearFinished,
    includeMiniKits,
    projects,
  ]);

  // The projectsWithoutPurchaseDateCount and projectsWithoutFinishDateCount are no longer calculated here.
  // If needed, they should be derived based on the global sortField from useProjectsData,
  // potentially within Dashboard.tsx or passed down if specific to filter display.
  // For simplicity, returning 0 or removing them from the hook's return if not used by consumers.
  const projectsWithoutPurchaseDateCount = 0; // Placeholder if still destructured by Dashboard.tsx
  const projectsWithoutFinishDateCount = 0; // Placeholder if still destructured by Dashboard.tsx

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
      // project.status is ProjectStatus, which are all keys of DashboardTabCounts
      if (project.status in counts) {
        // This check is still good practice
        counts[project.status as keyof DashboardTabCounts]++;
      }
    });

    return counts;
  }, [projects]);

  const resetFilters = () => {
    setActiveStatus('all');
    setSearchTerm('');
    setSelectedCompany('all');
    setSelectedArtist('all');
    setSelectedDrillShape('all');
    setSelectedTag('all');
    setSelectedYearFinished('all');
    setIncludeMiniKits(false); // Reset new filter
    // setSortBy('createdAt'); // Assuming default sort should also be reset if managed here
    // setSortOrder('desc');   // Or if sort is managed by useProjectsData, this might not be needed here
    // Note: viewType is not reset as it's a view preference, not a filter.
    // Consider if filterInitialized should be reset or handled differently.
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedCompany !== 'all') count++;
    if (selectedArtist !== 'all') count++;
    if (selectedDrillShape !== 'all') count++;
    if (selectedTag !== 'all') count++;
    if (selectedYearFinished !== 'all') count++;
    if (includeMiniKits) count++; // Include new filter in count
    return count;
  };

  return {
    activeStatus,
    setActiveStatus,
    viewType,
    setViewType,
    searchTerm,
    setSearchTerm,
    selectedCompany,
    setSelectedCompany,
    selectedArtist,
    setSelectedArtist,
    selectedDrillShape,
    setSelectedDrillShape,
    selectedTag,
    setSelectedTag,
    selectedYearFinished,
    setSelectedYearFinished,
    includeMiniKits, // Expose new filter state
    setIncludeMiniKits, // Expose new filter setter
    filteredProjects, // Now derived from useMemo
    drillShapes,
    tags,
    yearFinishedOptions,
    getCounts,
    filterInitialized,
    setFilterInitialized,
    // sortBy, // Removed
    // setSortBy, // Removed
    // sortOrder, // Removed
    // setSortOrder, // Removed
    projectsWithoutPurchaseDateCount, // Placeholder, review if used
    projectsWithoutFinishDateCount, // Placeholder, review if used
    resetFilters,
    getActiveFilterCount,
  };
};

export default useDashboardFilters;
