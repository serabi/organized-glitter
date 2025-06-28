import { useState, useMemo, useEffect } from 'react';
import { ProjectType, ProjectFilterStatus } from '@/types/project';

export type SortKey =
  | 'title'
  | 'company'
  | 'artist'
  | 'status'
  | 'tags'
  | 'drillShape'
  | 'kit_category'
  | 'width'
  | 'height'
  | 'datePurchased'
  | 'dateReceived'
  | 'dateStarted'
  | 'dateCompleted'
  | 'createdAt'
  | 'updatedAt';

export type SortConfig = {
  key: SortKey;
  direction: 'asc' | 'desc';
};

export type AdvancedFilters = {
  status: ProjectFilterStatus;
  searchTerm: string;
  company: string;
  artist: string;
  drillShape: string;
  tag: string; // Added tag filter
  hasDates: boolean; // We'll keep this in the interface for backward compatibility
};

export type AvailableFilters = {
  companies: string[];
  artists: string[];
  drillShapes: string[];
  tags: string[];
};

export const useAdvancedFilters = (
  projects: ProjectType[],
  showArchived: boolean = false,
  showDestashed: boolean = false,
  showMiniKits: boolean = false
) => {
  // Default sort configuration
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'updatedAt',
    direction: 'desc',
  });

  // Default filters
  const [filters, setFilters] = useState<AdvancedFilters>({
    status: 'all',
    searchTerm: '',
    company: 'all',
    artist: 'all',
    drillShape: 'all',
    tag: 'all', // Added tag filter
    hasDates: false, // We'll keep this even though we removed the UI element
  });

  // Extract available filter options from projects using useMemo
  const availableFilters = useMemo<AvailableFilters>(() => {
    // Extract filter options directly from projects
    const companies = Array.from(
      new Set(projects.map(project => project.company).filter(Boolean) as string[])
    ).sort();

    const artists = Array.from(
      new Set(projects.map(project => project.artist).filter(Boolean) as string[])
    ).sort();

    // Static drill shapes - always 'round' and 'square'
    const drillShapes = ['round', 'square'];

    // Extract tags from projects
    const tags = Array.from(
      new Set(
        projects
          .flatMap(project => project.tags || [])
          .map(tag => tag.name)
          .filter(Boolean) as string[]
      )
    ).sort();

    return {
      companies,
      artists,
      drillShapes,
      tags,
    };
  }, [projects]);

  // Apply filters to projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Filter out archived projects unless showArchived is true
    if (!showArchived) {
      filtered = filtered.filter(project => project.status !== 'archived');
    }

    // Filter out destashed projects unless showDestashed is true
    if (!showDestashed) {
      filtered = filtered.filter(project => project.status !== 'destashed');
    }

    // Filter out mini kits unless showMiniKits is true
    if (!showMiniKits) {
      filtered = filtered.filter(project => project.kit_category !== 'mini');
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(project => project.status === filters.status);
    }

    // Apply search filter (title, company, artist)
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        project =>
          project.title?.toLowerCase().includes(search) ||
          project.company?.toLowerCase().includes(search) ||
          project.artist?.toLowerCase().includes(search)
      );
    }

    // Apply company filter
    if (filters.company !== 'all') {
      filtered = filtered.filter(project => {
        // Make case-insensitive comparison for company
        return project.company?.toLowerCase() === filters.company.toLowerCase();
      });
    }

    // Apply artist filter
    if (filters.artist !== 'all') {
      filtered = filtered.filter(project => {
        // Make case-insensitive comparison for artist
        return project.artist?.toLowerCase() === filters.artist.toLowerCase();
      });
    }

    // Apply drill shape filter
    if (filters.drillShape !== 'all') {
      filtered = filtered.filter(project => project.drillShape === filters.drillShape);
    }

    // Apply tag filter
    if (filters.tag && filters.tag !== 'all') {
      filtered = filtered.filter(project => {
        if (!project.tags || !Array.isArray(project.tags)) return false;

        return project.tags.some(
          tag => tag.name && tag.name.toLowerCase().trim() === filters.tag.toLowerCase().trim()
        );
      });
    }

    // Apply has dates filter
    if (filters.hasDates) {
      filtered = filtered.filter(
        project => project.datePurchased || project.dateStarted || project.dateCompleted
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const getValue = (project: ProjectType, key: SortKey): string | number | null => {
        switch (key) {
          case 'title':
          case 'company':
          case 'artist':
          case 'drillShape':
          case 'kit_category':
            return (project[key] || '').toLowerCase();

          case 'tags': {
            // Sort by first tag name alphabetically, or empty string if no tags
            if (!project.tags || !Array.isArray(project.tags) || project.tags.length === 0) {
              return '';
            }
            // Get all tag names, sort them, and return the first one for consistent sorting
            const tagNames = project.tags
              .map(tag => tag.name)
              .filter(Boolean)
              .sort();
            return tagNames.length > 0 ? tagNames[0].toLowerCase() : '';
          }

          case 'width':
            return project.width || 0;
          case 'height':
            return project.height || 0;

          case 'datePurchased':
          case 'dateReceived':
          case 'dateStarted':
          case 'dateCompleted':
          case 'createdAt':
          case 'updatedAt': {
            // Handle date values - return the timestamp for proper comparison
            const dateValue = project[key] ? new Date(project[key] as string) : null;
            return dateValue ? dateValue.getTime() : 0;
          }

          default:
            return project[key];
        }
      };

      const aValue = getValue(a, sortConfig.key);
      const bValue = getValue(b, sortConfig.key);

      // Handle null values in comparison
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (aValue === bValue) return 0;

      const compareResult = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? compareResult : -compareResult;
    });

    return filtered;
  }, [projects, filters, sortConfig, showArchived, showDestashed, showMiniKits]);

  return {
    filteredProjects,
    sortConfig,
    setSortConfig,
    filters,
    setFilters,
    availableFilters,
  };
};

export default useAdvancedFilters;
