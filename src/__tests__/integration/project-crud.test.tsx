/**
 * Simple integration tests for project CRUD operations
 * Tests essential project functionality with realistic user interactions
 * @author @serabi
 * @created 2025-07-29
 */

import {
  describe,
  it,
  expect,
  // vi,
  waitFor,
  renderWithProviders,
  screen,
  userEvent,
  createMockProject,
} from '@/test-utils';
import React from 'react';

// Simple mock project manager component for testing
const ProjectManagerComponent = () => {
  const [projects, setProjects] = React.useState([
    createMockProject({ id: 'project-1', title: 'Diamond Art Kit 1', status: 'wishlist' }),
    createMockProject({ id: 'project-2', title: 'Diamond Art Kit 2', status: 'progress' }),
  ]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const createProject = async (title: string) => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      const newProject = createMockProject({
        id: `project-${Date.now()}`,
        title: title.trim(),
        status: 'wishlist',
      });
      setProjects(prev => [...prev, newProject]);
    } catch (_err) {
      setError('Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProjectStatus = async (id: string, newStatus: string) => {
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 50));
      setProjects(prev => prev.map(p => (p.id === id ? { ...p, status: newStatus } : p)));
    } catch (_err) {
      setError('Failed to update project');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 50));
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (_err) {
      setError('Failed to delete project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>My Diamond Painting Projects</h1>

      {error && <div data-testid="error-message">{error}</div>}

      {/* Create Project Form */}
      <div data-testid="create-form">
        <input
          data-testid="project-title-input"
          placeholder="Enter project title"
          disabled={isLoading}
        />
        <button
          data-testid="create-project-btn"
          disabled={isLoading}
          onClick={() => {
            const input = screen.getByTestId('project-title-input') as HTMLInputElement;
            createProject(input.value);
            input.value = '';
          }}
        >
          {isLoading ? 'Creating...' : 'Create Project'}
        </button>
      </div>

      {/* Projects List */}
      <div data-testid="projects-list">
        {projects.length === 0 ? (
          <div data-testid="no-projects">No projects yet</div>
        ) : (
          projects.map(project => (
            <div key={project.id} data-testid={`project-${project.id}`}>
              <h3>{project.title}</h3>
              <div data-testid={`status-${project.id}`}>Status: {project.status}</div>

              <select
                data-testid={`status-select-${project.id}`}
                value={project.status}
                onChange={e => updateProjectStatus(project.id, e.target.value)}
                disabled={isLoading}
              >
                <option value="wishlist">Wishlist</option>
                <option value="purchased">Purchased</option>
                <option value="progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>

              <button
                data-testid={`delete-btn-${project.id}`}
                disabled={isLoading}
                onClick={() => deleteProject(project.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

describe('Project CRUD Integration', () => {
  it('should display existing projects on load', () => {
    renderWithProviders(<ProjectManagerComponent />);

    expect(screen.getByText('My Diamond Painting Projects')).toBeInTheDocument();
    expect(screen.getByTestId('project-project-1')).toBeInTheDocument();
    expect(screen.getByTestId('project-project-2')).toBeInTheDocument();
    expect(screen.getByText('Diamond Art Kit 1')).toBeInTheDocument();
    expect(screen.getByText('Diamond Art Kit 2')).toBeInTheDocument();
  });

  it('should create a new project', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectManagerComponent />);

    // Enter project title
    await user.type(screen.getByTestId('project-title-input'), 'New Diamond Painting');

    // Create project
    await user.click(screen.getByTestId('create-project-btn'));

    // Wait for project to be created
    await waitFor(() => {
      expect(screen.getByText('New Diamond Painting')).toBeInTheDocument();
    });

    // Should have 3 projects now (2 initial + 1 new)
    const projectElements = screen.getAllByTestId(/^project-project-/);
    expect(projectElements).toHaveLength(3);

    // Input should be cleared
    expect(screen.getByTestId('project-title-input')).toHaveValue('');
  });

  it('should show error when creating project without title', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectManagerComponent />);

    // Try to create without title
    await user.click(screen.getByTestId('create-project-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error-message')).toHaveTextContent('Title is required');
  });

  it('should update project status', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectManagerComponent />);

    // Change status of first project
    const statusSelect = screen.getByTestId('status-select-project-1');
    await user.selectOptions(statusSelect, 'completed');

    await waitFor(() => {
      expect(screen.getByTestId('status-project-1')).toHaveTextContent('Status: completed');
    });
  });

  it('should delete a project', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectManagerComponent />);

    // Verify project exists initially
    expect(screen.getByTestId('project-project-1')).toBeInTheDocument();

    // Delete the project
    await user.click(screen.getByTestId('delete-btn-project-1'));

    await waitFor(() => {
      expect(screen.queryByTestId('project-project-1')).not.toBeInTheDocument();
    });

    // Should still have the second project
    expect(screen.getByTestId('project-project-2')).toBeInTheDocument();
  });

  it('should show loading states during operations', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectManagerComponent />);

    // Test create loading state
    await user.type(screen.getByTestId('project-title-input'), 'Loading Test Project');
    await user.click(screen.getByTestId('create-project-btn'));

    // Should show loading state
    expect(screen.getByTestId('create-project-btn')).toHaveTextContent('Creating...');
    expect(screen.getByTestId('create-project-btn')).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Loading Test Project')).toBeInTheDocument();
    });
  });

  it('should handle complete project lifecycle', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectManagerComponent />);

    // Create project
    await user.type(screen.getByTestId('project-title-input'), 'Lifecycle Test Project');
    await user.click(screen.getByTestId('create-project-btn'));

    await waitFor(() => {
      expect(screen.getByText('Lifecycle Test Project')).toBeInTheDocument();
    });

    // Find the new project element
    const projectElements = screen.getAllByTestId(/^project-project-\d+$/);
    const newProjectElement = projectElements.find(el =>
      el.textContent?.includes('Lifecycle Test Project')
    );
    expect(newProjectElement).toBeDefined();

    // Get the project ID from the element
    const projectId = newProjectElement?.getAttribute('data-testid')?.replace('project-', '');

    // Update status to progress
    const statusSelect = screen.getByTestId(`status-select-${projectId}`);
    await user.selectOptions(statusSelect, 'progress');

    await waitFor(() => {
      expect(screen.getByTestId(`status-${projectId}`)).toHaveTextContent('Status: progress');
    });

    // Complete the project
    await user.selectOptions(statusSelect, 'completed');

    await waitFor(() => {
      expect(screen.getByTestId(`status-${projectId}`)).toHaveTextContent('Status: completed');
    });

    // Delete the project
    await user.click(screen.getByTestId(`delete-btn-${projectId}`));

    await waitFor(() => {
      expect(screen.queryByText('Lifecycle Test Project')).not.toBeInTheDocument();
    });
  });

  it('should show empty state when all projects are deleted', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectManagerComponent />);

    // Delete first project
    await user.click(screen.getByTestId('delete-btn-project-1'));

    await waitFor(() => {
      expect(screen.queryByTestId('project-project-1')).not.toBeInTheDocument();
    });

    // Delete second project
    await user.click(screen.getByTestId('delete-btn-project-2'));

    await waitFor(() => {
      expect(screen.getByTestId('no-projects')).toBeInTheDocument();
    });

    expect(screen.getByTestId('no-projects')).toHaveTextContent('No projects yet');
  });
});
