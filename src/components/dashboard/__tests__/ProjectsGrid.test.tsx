import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProjectsGrid from '../ProjectsGrid';
import { ProjectType } from '@/types/project';

// Mock the context with proper types
const mockContextValue: {
  isLoadingProjects: boolean;
  processedAndPaginatedProjects: ProjectType[];
  viewType: 'grid' | 'list';
  searchTerm: string;
  sortField: string;
  resetAllFilters: () => void;
  dynamicSeparatorProps: {
    isCurrentSortDateBased: boolean;
    currentSortDateFriendlyName: string;
    currentSortDatePropertyKey: string;
    countOfItemsWithoutCurrentSortDate: number;
  };
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  setCurrentPage: () => void;
  setPageSize: () => void;
} = {
  isLoadingProjects: false,
  processedAndPaginatedProjects: [], // Fixed property name
  viewType: 'grid',
  searchTerm: '',
  sortField: 'updatedAt',
  resetAllFilters: vi.fn(),
  dynamicSeparatorProps: {
    isCurrentSortDateBased: true,
    currentSortDateFriendlyName: 'Last Updated',
    currentSortDatePropertyKey: 'updatedAt',
    countOfItemsWithoutCurrentSortDate: 0,
  },
  // Add missing pagination props
  currentPage: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1,
  setCurrentPage: vi.fn(),
  setPageSize: vi.fn(),
};

vi.mock('@/hooks/useDashboardFiltersContext', () => ({
  useDashboardFiltersContext: () => mockContextValue,
}));

// Mock ProjectCard
vi.mock('@/components/dashboard/ProjectCard', () => ({
  default: ({ project, onClick }: { project: ProjectType; onClick: () => void }) => (
    <div data-testid={`project-card-${project.id}`} onClick={onClick}>
      {project.title}
    </div>
  ),
}));

const mockProjects: ProjectType[] = [
  {
    id: '1',
    title: 'Project 1',
    company: 'Company 1',
    artist: 'Artist 1',
    status: 'completed',
    imageUrl: 'https://example.com/image1.jpg',
    generalNotes: 'Notes 1',
    createdAt: '2025-05-29',
    updatedAt: '2025-05-30',
    userId: 'user-1',
  },
  {
    id: '2',
    title: 'Project 2',
    company: 'Company 2',
    artist: 'Artist 2',
    status: 'progress',
    imageUrl: 'https://example.com/image2.jpg',
    generalNotes: 'Notes 2',
    createdAt: '2025-05-28',
    updatedAt: '2025-05-29',
    userId: 'user-1',
  },
];

describe('ProjectsGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextValue.isLoadingProjects = false;
    mockContextValue.processedAndPaginatedProjects = [];
    mockContextValue.totalItems = 0;
    mockContextValue.totalPages = 1;
  });

  it('renders loading state', () => {
    mockContextValue.isLoadingProjects = true;

    render(
      <BrowserRouter>
        <ProjectsGrid />
      </BrowserRouter>
    );

    // Check for skeleton loading cards instead of text
    const skeletonCards = document.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it('renders empty state when no projects', () => {
    mockContextValue.processedAndPaginatedProjects = [];

    render(
      <BrowserRouter>
        <ProjectsGrid />
      </BrowserRouter>
    );

    expect(screen.getByText(/no projects match your current filters/i)).toBeInTheDocument();
  });

  it('renders projects in grid view', () => {
    mockContextValue.processedAndPaginatedProjects = mockProjects;
    mockContextValue.viewType = 'grid';
    mockContextValue.totalItems = mockProjects.length;

    render(
      <BrowserRouter>
        <ProjectsGrid />
      </BrowserRouter>
    );

    expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('project-card-2')).toBeInTheDocument();
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('renders projects in list view', () => {
    mockContextValue.processedAndPaginatedProjects = mockProjects;
    mockContextValue.viewType = 'list';
    mockContextValue.totalItems = mockProjects.length;

    render(
      <BrowserRouter>
        <ProjectsGrid />
      </BrowserRouter>
    );

    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('shows reset filters button when filters are applied', () => {
    mockContextValue.processedAndPaginatedProjects = [];
    mockContextValue.searchTerm = 'test search';

    render(
      <BrowserRouter>
        <ProjectsGrid />
      </BrowserRouter>
    );

    const resetButton = screen.getByText(/clear filters/i);
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);
    expect(mockContextValue.resetAllFilters).toHaveBeenCalled();
  });
});
