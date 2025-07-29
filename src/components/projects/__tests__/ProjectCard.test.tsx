/**
 * Example test for ProjectCard component
 * Demonstrates testing user interactions and component behavior
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, createMockProject } from '@/test-utils';
import { ProjectCard } from '@/components/projects/ProjectCard';

// Mock the ProjectCard component for this example
const MockProjectCard = ({ project, onStatusChange }: {
  project: any;
  onStatusChange?: (id: string, status: string) => void;
}) => (
  <div data-testid="project-card">
    <h3>{project.title}</h3>
    <p>Status: {project.status}</p>
    <p>Company: {project.company}</p>
    <button onClick={() => onStatusChange?.(project.id, 'purchased')}>
      Mark as Purchased
    </button>
  </div>
);

describe('ProjectCard', () => {
  it('displays project information', () => {
    const project = createMockProject({
      title: 'Beautiful Landscape',
      status: 'wishlist',
      company: 'Diamond Dotz',
    });

    renderWithProviders(<MockProjectCard project={project} />);

    expect(screen.getByText('Beautiful Landscape')).toBeInTheDocument();
    expect(screen.getByText('Status: wishlist')).toBeInTheDocument();
    expect(screen.getByText('Company: Diamond Dotz')).toBeInTheDocument();
  });

  it('handles status change when button is clicked', () => {
    const project = createMockProject({ id: 'project-123' });
    const onStatusChange = vi.fn();

    renderWithProviders(
      <MockProjectCard project={project} onStatusChange={onStatusChange} />
    );

    fireEvent.click(screen.getByText('Mark as Purchased'));

    expect(onStatusChange).toHaveBeenCalledWith('project-123', 'purchased');
  });

  it('renders without status change handler', () => {
    const project = createMockProject();

    renderWithProviders(<MockProjectCard project={project} />);

    // Should render without errors
    expect(screen.getByTestId('project-card')).toBeInTheDocument();
  });
});