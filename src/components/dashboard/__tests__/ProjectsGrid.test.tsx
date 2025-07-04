import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProjectsGrid from '../ProjectsGrid';
import { ProjectType } from '@/types/project';

// Mock the updated dashboard filters context
const mockContextValue = {
  filters: {
    viewType: 'grid' as const,
    searchTerm: '',
    sortField: 'last_updated' as const,
    currentPage: 1,
    pageSize: 10,
  },
  projects: [] as ProjectType[],
  isLoadingProjects: false,
  resetAllFilters: vi.fn(),
  dynamicSeparatorProps: {
    isCurrentSortDateBased: true,
    currentSortDateFriendlyName: 'Last Updated',
    currentSortDatePropertyKey: 'last_updated',
    countOfItemsWithoutCurrentSortDate: 0,
  },
  totalItems: 0,
  totalPages: 1,
  updatePage: vi.fn(),
  updatePageSize: vi.fn(),
};

// Mock the new context imports
vi.mock('@/contexts/DashboardFiltersContext', () => ({
  useDashboardFilters: () => mockContextValue,
  useRecentlyEdited: () => ({
    recentlyEditedProjectId: null,
  }),
}));

// Mock the navigation hook
vi.mock('@/hooks/useNavigateToProject', () => ({
  useNavigateToProject: () => vi.fn(),
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
    mockContextValue.projects = [];
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
    mockContextValue.projects = [];

    render(
      <BrowserRouter>
        <ProjectsGrid />
      </BrowserRouter>
    );

    expect(screen.getByText(/no projects match your current filters/i)).toBeInTheDocument();
  });

  it('renders projects in grid view', () => {
    mockContextValue.projects = mockProjects;
    mockContextValue.filters.viewType = 'grid';
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
    mockContextValue.projects = mockProjects;
    mockContextValue.filters.viewType = 'list';
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
    mockContextValue.projects = [];
    mockContextValue.filters.searchTerm = 'test search';

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
