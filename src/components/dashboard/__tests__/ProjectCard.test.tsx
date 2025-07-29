/**
 * Simplified tests for ProjectCard component
 * Tests user-facing functionality and rendering behavior
 * @author @serabi
 * @created 2025-07-29
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, createMockProject } from '@/test-utils';
import ProjectCard from '../ProjectCard';

// Mock hooks
vi.mock('@/hooks/useProjectStatus', () => ({
  useProjectStatus: () => ({
    getStatusColor: vi.fn().mockReturnValue('bg-green-500'),
    getStatusLabel: vi.fn().mockReturnValue('In Progress'),
  }),
}));

vi.mock('@/hooks/useConditionalImageLoader', () => ({
  useConditionalImageLoader: vi.fn(() => ({
    ref: { current: null },
    imageUrl: 'https://example.com/image.jpg',
    isLoading: false,
    error: null,
    retry: vi.fn(),
  })),
}));

describe('ProjectCard', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project card with title and company', () => {
    const project = createMockProject({
      title: 'Beautiful Sunset',
      company: 'Diamond Dotz',
      status: 'progress'
    });

    renderWithProviders(<ProjectCard project={project} onClick={mockOnClick} />);

    expect(screen.getByText('Beautiful Sunset')).toBeInTheDocument();
    expect(screen.getByText('Diamond Dotz')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const project = createMockProject({ title: 'Clickable Project' });

    renderWithProviders(<ProjectCard project={project} onClick={mockOnClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('renders without onClick handler', () => {
    const project = createMockProject({ title: 'Non-clickable Project' });

    renderWithProviders(<ProjectCard project={project} />);

    expect(screen.getByText('Non-clickable Project')).toBeInTheDocument();
  });

  it('displays status label', () => {
    const project = createMockProject({ title: 'Status Project' });

    renderWithProviders(<ProjectCard project={project} onClick={mockOnClick} />);

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('handles project without image gracefully', () => {
    const project = createMockProject({ 
      title: 'No Image Project', 
      imageUrl: undefined 
    });

    renderWithProviders(<ProjectCard project={project} onClick={mockOnClick} />);

    expect(screen.getByText('No Image Project')).toBeInTheDocument();
  });
});
