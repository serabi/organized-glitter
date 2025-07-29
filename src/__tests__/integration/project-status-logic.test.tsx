/**
 * Simple integration tests for project status business logic
 * Tests critical business rules and workflows
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

// Simple component that demonstrates business logic for project status
const ProjectStatusManager = () => {
  const [project, setProject] = React.useState(
    createMockProject({
      id: 'test-project',
      title: 'Test Diamond Painting',
      status: 'wishlist',
      datePurchased: undefined,
      dateStarted: undefined,
      dateCompleted: undefined,
    })
  );
  const [validationError, setValidationError] = React.useState('');

  const updateStatus = (newStatus: string) => {
    setValidationError('');

    // Business rules for status transitions
    const currentDate = new Date().toISOString();

    try {
      const updatedProject = { ...project };

      // Business Logic: Status transition rules
      switch (newStatus) {
        case 'purchased':
          if (project.status !== 'wishlist') {
            throw new Error('Can only purchase projects from wishlist');
          }
          updatedProject.status = 'purchased';
          updatedProject.datePurchased = currentDate;
          break;

        case 'progress':
          if (!['purchased', 'stash'].includes(project.status)) {
            throw new Error('Can only start projects that are purchased or in stash');
          }
          updatedProject.status = 'progress';
          updatedProject.dateStarted = currentDate;
          if (!updatedProject.datePurchased) {
            updatedProject.datePurchased = currentDate; // Auto-set if missing
          }
          break;

        case 'completed':
          if (project.status !== 'progress') {
            throw new Error('Can only complete projects that are in progress');
          }
          updatedProject.status = 'completed';
          updatedProject.dateCompleted = currentDate;
          break;

        case 'stash':
          if (!['purchased', 'progress'].includes(project.status)) {
            throw new Error('Can only stash purchased projects or pause in-progress ones');
          }
          updatedProject.status = 'stash';
          break;

        case 'wishlist':
          // Can always move back to wishlist, but clear dates
          updatedProject.status = 'wishlist';
          updatedProject.datePurchased = undefined;
          updatedProject.dateStarted = undefined;
          updatedProject.dateCompleted = undefined;
          break;

        default:
          updatedProject.status = newStatus;
      }

      setProject(updatedProject);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Status update failed');
    }
  };

  const getValidTransitions = () => {
    switch (project.status) {
      case 'wishlist':
        return ['purchased'];
      case 'purchased':
        return ['progress', 'stash', 'wishlist'];
      case 'stash':
        return ['progress', 'wishlist'];
      case 'progress':
        return ['completed', 'stash', 'wishlist'];
      case 'completed':
        return ['wishlist']; // Can start over
      default:
        return [];
    }
  };

  return (
    <div>
      <h1>Project Status Manager</h1>

      <div data-testid="project-info">
        <h2>{project.title}</h2>
        <div data-testid="current-status">Current Status: {project.status}</div>

        {project.datePurchased && (
          <div data-testid="date-purchased">
            Purchased: {new Date(project.datePurchased).toLocaleDateString()}
          </div>
        )}

        {project.dateStarted && (
          <div data-testid="date-started">
            Started: {new Date(project.dateStarted).toLocaleDateString()}
          </div>
        )}

        {project.dateCompleted && (
          <div data-testid="date-completed">
            Completed: {new Date(project.dateCompleted).toLocaleDateString()}
          </div>
        )}
      </div>

      {validationError && (
        <div data-testid="validation-error" style={{ color: 'red' }}>
          {validationError}
        </div>
      )}

      <div data-testid="status-actions">
        <h3>Available Actions:</h3>
        {getValidTransitions().map(status => (
          <button
            key={status}
            data-testid={`action-${status}`}
            onClick={() => updateStatus(status)}
            style={{ margin: '4px' }}
          >
            Move to {status}
          </button>
        ))}

        {/* Test invalid transitions */}
        <button
          data-testid="invalid-action"
          onClick={() => updateStatus('completed')}
          style={{ margin: '4px', backgroundColor: '#ffebee' }}
        >
          Try Invalid: Complete
        </button>
      </div>
    </div>
  );
};

describe('Project Status Business Logic Integration', () => {
  it('should start with wishlist status and show correct actions', () => {
    renderWithProviders(<ProjectStatusManager />);

    expect(screen.getByTestId('current-status')).toHaveTextContent('Current Status: wishlist');
    expect(screen.getByTestId('action-purchased')).toBeInTheDocument();
    expect(screen.queryByTestId('action-progress')).not.toBeInTheDocument();
    expect(screen.queryByTestId('date-purchased')).not.toBeInTheDocument();
  });

  it('should transition from wishlist to purchased', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectStatusManager />);

    await user.click(screen.getByTestId('action-purchased'));

    expect(screen.getByTestId('current-status')).toHaveTextContent('Current Status: purchased');
    expect(screen.getByTestId('date-purchased')).toBeInTheDocument();

    // Should now show different available actions
    expect(screen.getByTestId('action-progress')).toBeInTheDocument();
    expect(screen.getByTestId('action-stash')).toBeInTheDocument();
    expect(screen.getByTestId('action-wishlist')).toBeInTheDocument();
  });

  it('should transition from purchased to progress and set start date', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectStatusManager />);

    // First move to purchased
    await user.click(screen.getByTestId('action-purchased'));

    // Then move to progress
    await user.click(screen.getByTestId('action-progress'));

    expect(screen.getByTestId('current-status')).toHaveTextContent('Current Status: progress');
    expect(screen.getByTestId('date-purchased')).toBeInTheDocument();
    expect(screen.getByTestId('date-started')).toBeInTheDocument();

    // Should now show completion and stash options
    expect(screen.getByTestId('action-completed')).toBeInTheDocument();
    expect(screen.getByTestId('action-stash')).toBeInTheDocument();
  });

  it('should complete the full project lifecycle', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectStatusManager />);

    // Wishlist -> Purchased
    await user.click(screen.getByTestId('action-purchased'));
    expect(screen.getByTestId('current-status')).toHaveTextContent('Current Status: purchased');

    // Purchased -> Progress
    await user.click(screen.getByTestId('action-progress'));
    expect(screen.getByTestId('current-status')).toHaveTextContent('Current Status: progress');

    // Progress -> Completed
    await user.click(screen.getByTestId('action-completed'));
    expect(screen.getByTestId('current-status')).toHaveTextContent('Current Status: completed');

    // Should have all dates set
    expect(screen.getByTestId('date-purchased')).toBeInTheDocument();
    expect(screen.getByTestId('date-started')).toBeInTheDocument();
    expect(screen.getByTestId('date-completed')).toBeInTheDocument();

    // From completed, should only be able to restart
    expect(screen.getByTestId('action-wishlist')).toBeInTheDocument();
    expect(screen.queryByTestId('action-progress')).not.toBeInTheDocument();
  });

  it('should prevent invalid status transitions', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectStatusManager />);

    // Try to complete a wishlist project (invalid)
    await user.click(screen.getByTestId('invalid-action'));

    await waitFor(() => {
      expect(screen.getByTestId('validation-error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('validation-error')).toHaveTextContent(
      'Can only complete projects that are in progress'
    );

    // Status should remain unchanged
    expect(screen.getByTestId('current-status')).toHaveTextContent('Current Status: wishlist');
  });

  it('should handle stash workflow correctly', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectStatusManager />);

    // Move to purchased then to progress
    await user.click(screen.getByTestId('action-purchased'));
    await user.click(screen.getByTestId('action-progress'));

    // Move to stash
    await user.click(screen.getByTestId('action-stash'));

    expect(screen.getByTestId('current-status')).toHaveTextContent('Current Status: stash');

    // From stash, should be able to resume progress or return to wishlist
    expect(screen.getByTestId('action-progress')).toBeInTheDocument();
    expect(screen.getByTestId('action-wishlist')).toBeInTheDocument();

    // Resume progress
    await user.click(screen.getByTestId('action-progress'));
    expect(screen.getByTestId('current-status')).toHaveTextContent('Current Status: progress');
  });

  it('should reset dates when returning to wishlist', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectStatusManager />);

    // Go through some status changes
    await user.click(screen.getByTestId('action-purchased'));
    await user.click(screen.getByTestId('action-progress'));

    // Verify dates are set
    expect(screen.getByTestId('date-purchased')).toBeInTheDocument();
    expect(screen.getByTestId('date-started')).toBeInTheDocument();

    // Return to wishlist
    await user.click(screen.getByTestId('action-wishlist'));

    expect(screen.getByTestId('current-status')).toHaveTextContent('Current Status: wishlist');

    // Dates should be cleared
    expect(screen.queryByTestId('date-purchased')).not.toBeInTheDocument();
    expect(screen.queryByTestId('date-started')).not.toBeInTheDocument();
    expect(screen.queryByTestId('date-completed')).not.toBeInTheDocument();
  });

  it('should show appropriate actions for each status', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectStatusManager />);

    // Wishlist: can only purchase
    expect(screen.getByTestId('action-purchased')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2); // purchased + invalid test button

    // Purchased: can progress, stash, or return to wishlist
    await user.click(screen.getByTestId('action-purchased'));
    expect(screen.getByTestId('action-progress')).toBeInTheDocument();
    expect(screen.getByTestId('action-stash')).toBeInTheDocument();
    expect(screen.getByTestId('action-wishlist')).toBeInTheDocument();

    // Progress: can complete, stash, or return to wishlist
    await user.click(screen.getByTestId('action-progress'));
    expect(screen.getByTestId('action-completed')).toBeInTheDocument();
    expect(screen.getByTestId('action-stash')).toBeInTheDocument();
    expect(screen.getByTestId('action-wishlist')).toBeInTheDocument();

    // Completed: can only return to wishlist
    await user.click(screen.getByTestId('action-completed'));
    expect(screen.getByTestId('action-wishlist')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2); // wishlist + invalid test button
  });
});
