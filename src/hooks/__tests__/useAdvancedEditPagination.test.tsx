import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAdvancedEditPagination } from '../useAdvancedEditPagination';
import type { ProjectType } from '@/types/project';

// Mock project data for testing
const createMockProjects = (count: number): ProjectType[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `project-${i + 1}`,
    title: `Project ${i + 1}`,
  })) as ProjectType[];
};

// Wrapper component to provide router context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('useAdvancedEditPagination', () => {
  it('should initialize with correct default values', () => {
    const mockProjects = createMockProjects(50);
    const { result } = renderHook(() => useAdvancedEditPagination(mockProjects), { wrapper });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalItems).toBe(50);
    expect(result.current.totalPages).toBe(3); // Math.ceil(50 / 20)
    expect(result.current.paginatedProjects).toHaveLength(20);
  });

  it('should return correct paginated projects for first page', () => {
    const mockProjects = createMockProjects(25);
    const { result } = renderHook(() => useAdvancedEditPagination(mockProjects), { wrapper });

    expect(result.current.paginatedProjects).toHaveLength(20);
    expect(result.current.paginatedProjects[0].id).toBe('project-1');
    expect(result.current.paginatedProjects[19].id).toBe('project-20');
  });

  it('should handle empty project list', () => {
    const { result } = renderHook(() => useAdvancedEditPagination([]), { wrapper });

    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.paginatedProjects).toHaveLength(0);
  });

  it('should handle projects count less than page size', () => {
    const mockProjects = createMockProjects(5);
    const { result } = renderHook(() => useAdvancedEditPagination(mockProjects), { wrapper });

    expect(result.current.totalItems).toBe(5);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedProjects).toHaveLength(5);
  });
});
