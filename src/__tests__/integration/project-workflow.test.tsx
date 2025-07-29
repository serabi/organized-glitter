/**
 * Example integration test for project workflow
 * Demonstrates testing user workflows with minimal setup
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { 
  renderWithProviders, 
  screen, 
  fireEvent, 
  waitFor, 
  userEvent,
  createMockProject,
  createMockPocketBase 
} from '@/test-utils';

// Mock a simple project management component for this example
const MockProjectManager = () => {
  const [projects, setProjects] = React.useState([]);
  const [isCreating, setIsCreating] = React.useState(false);

  const createProject = async (title: string) => {
    setIsCreating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    const newProject = createMockProject({ title, id: `project-${Date.now()}` });
    setProjects(prev => [...prev, newProject]);
    setIsCreating(false);
  };

  const updateProjectStatus = (id: string, status: string) => {
    setProjects(prev => 
      prev.map(p => p.id === id ? { ...p, status } : p)
    );
  };

  return (
    <div>
      <h1>My Projects</h1>
      
      <div>
        <input 
          data-testid="project-title-input" 
          placeholder="Project title"
        />
        <button 
          data-testid="create-project-btn"
          onClick={() => {
            const input = document.querySelector('[data-testid="project-title-input"]') as HTMLInputElement;
            if (input?.value) {
              createProject(input.value);
              input.value = '';
            }
          }}
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : 'Add Project'}
        </button>
      </div>

      <div data-testid="projects-list">
        {projects.map(project => (
          <div key={project.id} data-testid={`project-${project.id}`}>
            <h3>{project.title}</h3>
            <p>Status: {project.status}</p>
            <button 
              onClick={() => updateProjectStatus(project.id, 'purchased')}
            >
              Mark as Purchased
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Project Workflow Integration', () => {
  it('allows user to create and manage projects', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<MockProjectManager />);

    // Verify initial state
    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByTestId('projects-list')).toBeEmptyDOMElement();

    // Create a new project
    await user.type(
      screen.getByTestId('project-title-input'), 
      'Beautiful Sunset'
    );
    
    await user.click(screen.getByTestId('create-project-btn'));

    // Wait for project to be created
    await waitFor(() => {
      expect(screen.getByText('Beautiful Sunset')).toBeInTheDocument();
    });

    // Verify project appears with correct initial status
    expect(screen.getByText('Status: wishlist')).toBeInTheDocument();

    // Update project status
    await user.click(screen.getByText('Mark as Purchased'));

    // Verify status change
    expect(screen.getByText('Status: purchased')).toBeInTheDocument();
  });

  it('handles multiple projects correctly', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<MockProjectManager />);

    // Create first project
    await user.type(screen.getByTestId('project-title-input'), 'Project 1');
    await user.click(screen.getByTestId('create-project-btn'));

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
    });

    // Create second project
    await user.type(screen.getByTestId('project-title-input'), 'Project 2');
    await user.click(screen.getByTestId('create-project-btn'));

    await waitFor(() => {
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });

    // Verify both projects exist
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });
});