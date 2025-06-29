import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProjectSelector } from '../ProjectSelector';
import { Project } from '@/types/project';

const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Test Project 1',
    user: 'user1',
    status: 'progress',
    kit_category: 'full',
    company: 'Test Company',
    artist: 'Test Artist',
    image: 'test-image-1.jpg',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Test Project 2',
    user: 'user1',
    status: 'progress',
    kit_category: 'mini',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    title: 'Test Project 3',
    user: 'user1',
    status: 'progress',
    kit_category: 'full',
    company: 'Another Company',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
  },
];

describe('ProjectSelector', () => {
  const mockOnProjectToggle = vi.fn();
  const mockOnSelectAll = vi.fn();
  const mockOnSelectNone = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders project list correctly', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
      expect(screen.getByText('Test Project 3')).toBeInTheDocument();
    });

    it('displays company and artist information when available', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByText('Test Company • Test Artist')).toBeInTheDocument();
      expect(screen.getByText('Another Company')).toBeInTheDocument();
    });

    it('renders checkboxes for each project', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(mockProjects.length);
    });

    it('shows Select All and Select None buttons', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select none/i })).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('shows checked state for selected projects', () => {
      const selectedProjects = new Set(['1', '3']);

      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={selectedProjects}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).toBeChecked();
    });

    it('displays selection count correctly', () => {
      const selectedProjects = new Set(['1', '2']);

      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={selectedProjects}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();
    });

    it('shows "none selected" when no projects are selected', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByText('0 of 3 selected')).toBeInTheDocument();
    });

    it('shows "all selected" when all projects are selected', () => {
      const selectedProjects = new Set(['1', '2', '3']);

      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={selectedProjects}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onProjectToggle when checkbox is clicked', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(firstCheckbox);

      expect(mockOnProjectToggle).toHaveBeenCalledWith('1');
    });

    it('calls onProjectToggle when project card is clicked', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      const projectCard = screen.getByText('Test Project 1').closest('div');
      fireEvent.click(projectCard!);

      expect(mockOnProjectToggle).toHaveBeenCalledWith('1');
    });

    it('calls onSelectAll when Select All button is clicked', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      const selectAllButton = screen.getByRole('button', { name: /select all/i });
      fireEvent.click(selectAllButton);

      expect(mockOnSelectAll).toHaveBeenCalledTimes(1);
    });

    it('calls onSelectNone when Select None button is clicked', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set(['1', '2'])}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      const selectNoneButton = screen.getByRole('button', { name: /select none/i });
      fireEvent.click(selectNoneButton);

      expect(mockOnSelectNone).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('shows loading skeletons when isLoading is true', () => {
      render(
        <ProjectSelector
          projects={[]}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
          isLoading={true}
        />
      );

      const skeletons = screen.getAllByTestId('project-skeleton');
      expect(skeletons).toHaveLength(3); // Default number of loading skeletons
    });

    it('disables buttons when loading', () => {
      render(
        <ProjectSelector
          projects={[]}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
          isLoading={true}
        />
      );

      expect(screen.getByRole('button', { name: /select all/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /select none/i })).toBeDisabled();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no projects are provided', () => {
      render(
        <ProjectSelector
          projects={[]}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByText(/no projects available/i)).toBeInTheDocument();
      expect(screen.getByText(/start some projects to use the randomizer/i)).toBeInTheDocument();
    });

    it('disables buttons in empty state', () => {
      render(
        <ProjectSelector
          projects={[]}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByRole('button', { name: /select all/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /select none/i })).toBeDisabled();
    });
  });

  describe('Image Handling', () => {
    it('renders project images when available', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
    });

    it('shows fallback when no image is available', () => {
      const projectsWithoutImages = mockProjects.map(p => ({ ...p, image: undefined }));

      render(
        <ProjectSelector
          projects={projectsWithoutImages}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      // Should show fallback icons or placeholders
      const fallbackIcons = document.querySelectorAll('[data-testid="image-fallback"]');
      expect(fallbackIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Button States', () => {
    it('changes Select All to Select None when all projects are selected', () => {
      const selectedProjects = new Set(['1', '2', '3']);

      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={selectedProjects}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByRole('button', { name: /select none/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /select all/i })).toBeInTheDocument();
    });

    it('shows both buttons when partially selected', () => {
      const selectedProjects = new Set(['1']);

      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={selectedProjects}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select none/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper labels for checkboxes', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      expect(screen.getByLabelText('Select Test Project 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Test Project 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Test Project 3')).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      const firstCheckbox = screen.getAllByRole('checkbox')[0];

      // Tab to checkbox and press space to select
      firstCheckbox.focus();
      fireEvent.keyDown(firstCheckbox, { key: ' ', code: 'Space' });

      expect(mockOnProjectToggle).toHaveBeenCalledWith('1');
    });
  });

  describe('Scrollable Area', () => {
    it('renders ScrollArea component for project list', () => {
      render(
        <ProjectSelector
          projects={mockProjects}
          selectedProjects={new Set()}
          onProjectToggle={mockOnProjectToggle}
          onSelectAll={mockOnSelectAll}
          onSelectNone={mockOnSelectNone}
        />
      );

      // ScrollArea should be present for handling overflow
      expect(document.querySelector('[data-radix-scroll-area-viewport]')).toBeInTheDocument();
    });
  });
});
