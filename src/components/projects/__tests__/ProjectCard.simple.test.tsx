/**
 * Example test showing simplified approach with providers when needed
 * Demonstrates testing components that need React Query context
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, createMockProject } from '@/test-utils';

// Simple mock component for demonstration
const ProjectCard = ({ project, onStatusChange }: {
  project: any;
  onStatusChange?: (id: string, status: string) => void;
}) => (
  <div data-testid="project-card">
    <h3>{project.title}</h3>
    <p data-testid="project-status">Status: {project.status}</p>
    <p>Company: {project.company}</p>
    <button 
      onClick={() => onStatusChange?.(project.id, 'purchased')}
      data-testid="purchase-button"
    >
      Mark as Purchased
    </button>
  </div>
);

describe('ProjectCard (with providers)', () => {
  it('displays project information correctly', () => {
    const project = createMockProject({
      title: 'Beautiful Landscape',
      status: 'wishlist',
      company: 'Diamond Dotz',
    });

    renderWithProviders(<ProjectCard project={project} />);

    expect(screen.getByText('Beautiful Landscape')).toBeInTheDocument();
    expect(screen.getByTestId('project-status')).toHaveTextContent('Status: wishlist');
    expect(screen.getByText('Company: Diamond Dotz')).toBeInTheDocument();
  });

  it('calls onStatusChange when purchase button is clicked', () => {
    const project = createMockProject({ id: 'project-123' });
    const onStatusChange = vi.fn();

    renderWithProviders(
      <ProjectCard project={project} onStatusChange={onStatusChange} />
    );

    fireEvent.click(screen.getByTestId('purchase-button'));

    expect(onStatusChange).toHaveBeenCalledWith('project-123', 'purchased');
  });

  it('renders without crashing when no status change handler provided', () => {
    const project = createMockProject();

    renderWithProviders(<ProjectCard project={project} />);

    expect(screen.getByTestId('project-card')).toBeInTheDocument();
    
    // Should not crash when clicking without handler
    fireEvent.click(screen.getByTestId('purchase-button'));
  });

  it('works with different project statuses', () => {
    const completedProject = createMockProject({
      title: 'Finished Project',
      status: 'completed',
    });

    renderWithProviders(<ProjectCard project={completedProject} />);

    expect(screen.getByTestId('project-status')).toHaveTextContent('Status: completed');
  });
});