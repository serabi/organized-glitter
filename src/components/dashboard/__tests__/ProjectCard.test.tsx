import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectCard from '../ProjectCard';
import { ProjectType } from '@/types/project';

// Mock hooks
vi.mock('@/hooks/useProjectStatus', () => ({
  useProjectStatus: () => ({
    getStatusColor: vi.fn().mockReturnValue('bg-green-500'),
    getStatusLabel: vi.fn().mockReturnValue('In Progress'),
  }),
}));

vi.mock('@/hooks/useImageLoader', () => ({
  useImageLoader: vi.fn(() => ({
    imageUrl: 'https://example.com/image.jpg',
    isLoading: false,
    error: null,
    retry: vi.fn(),
  })),
}));

const mockProject: ProjectType = {
  id: '1',
  title: 'Test Project',
  company: 'Test Company',
  artist: 'Test Artist',
  status: 'progress',
  imageUrl: 'https://example.com/image.jpg',
  generalNotes: 'Test notes',
  createdAt: '2025-05-30',
  updatedAt: '2025-05-30',
  userId: 'user-1',
};

describe('ProjectCard', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project card with title and company', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('renders without onClick handler', () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('displays status label', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />);

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('handles project without image gracefully', () => {
    const projectWithoutImage = { ...mockProject, imageUrl: undefined };
    render(<ProjectCard project={projectWithoutImage} onClick={mockOnClick} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });
});
