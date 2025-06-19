import { renderHook, act } from '@testing-library/react';
import { useAdvancedEditSelection } from '../useAdvancedEditSelection';
import type { ProjectType } from '@/types/project';

// Mock project data for testing
const mockProjects: ProjectType[] = [
  { id: 'project-1', title: 'Project 1' } as ProjectType,
  { id: 'project-2', title: 'Project 2' } as ProjectType,
  { id: 'project-3', title: 'Project 3' } as ProjectType,
];

describe('useAdvancedEditSelection', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useAdvancedEditSelection());

    expect(result.current.selectedProjects.size).toBe(0);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isAllSelected(mockProjects)).toBe(false);
  });

  it('should select and deselect individual projects', () => {
    const { result } = renderHook(() => useAdvancedEditSelection());

    // Select a project
    act(() => {
      result.current.selectProject('project-1');
    });

    expect(result.current.selectedProjects.has('project-1')).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    // Deselect the project
    act(() => {
      result.current.selectProject('project-1');
    });

    expect(result.current.selectedProjects.has('project-1')).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('should select all projects on page', () => {
    const { result } = renderHook(() => useAdvancedEditSelection());

    act(() => {
      result.current.selectAllOnPage(mockProjects);
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isAllSelected(mockProjects)).toBe(true);
    mockProjects.forEach(project => {
      expect(result.current.selectedProjects.has(project.id)).toBe(true);
    });
  });

  it('should clear all selections', () => {
    const { result } = renderHook(() => useAdvancedEditSelection());

    // First select all
    act(() => {
      result.current.selectAllOnPage(mockProjects);
    });

    expect(result.current.selectedCount).toBe(3);

    // Then clear
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedProjects.size).toBe(0);
  });

  it('should toggle select all correctly', () => {
    const { result } = renderHook(() => useAdvancedEditSelection());

    // Toggle to select all
    act(() => {
      result.current.toggleSelectAll(mockProjects);
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isAllSelected(mockProjects)).toBe(true);

    // Toggle to deselect all
    act(() => {
      result.current.toggleSelectAll(mockProjects);
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isAllSelected(mockProjects)).toBe(false);
  });
});
