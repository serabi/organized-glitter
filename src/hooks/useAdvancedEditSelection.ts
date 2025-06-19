import { useState, useCallback } from 'react';
import { ProjectType } from '@/types/project';

export interface UseAdvancedEditSelectionReturn {
  selectedProjects: Set<string>;
  selectedCount: number;
  selectProject: (projectId: string) => void;
  clearSelection: () => void;
  selectAllOnPage: (projects: ProjectType[]) => void;
  toggleSelectAll: (projects: ProjectType[]) => void;
  isAllSelected: (projects: ProjectType[]) => boolean;
}

/**
 * Custom hook for managing project selection state in the Advanced Edit view
 *
 * @returns Selection state and handlers
 */
export const useAdvancedEditSelection = (): UseAdvancedEditSelectionReturn => {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  const selectProject = useCallback((projectId: string) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProjects(new Set());
  }, []);

  const selectAllOnPage = useCallback((projects: ProjectType[]) => {
    const allProjectIds = new Set(projects.map(p => p.id));
    setSelectedProjects(allProjectIds);
  }, []);

  const isAllSelected = useCallback(
    (projects: ProjectType[]) => {
      if (projects.length === 0) return false;
      return projects.every(project => selectedProjects.has(project.id));
    },
    [selectedProjects]
  );

  const toggleSelectAll = useCallback(
    (projects: ProjectType[]) => {
      if (isAllSelected(projects)) {
        clearSelection();
      } else {
        selectAllOnPage(projects);
      }
    },
    [isAllSelected, clearSelection, selectAllOnPage]
  );

  return {
    selectedProjects,
    selectedCount: selectedProjects.size,
    selectProject,
    clearSelection,
    selectAllOnPage,
    toggleSelectAll,
    isAllSelected,
  };
};
