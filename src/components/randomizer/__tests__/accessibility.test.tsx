/**
 * @fileoverview Accessibility Tests for Randomizer Components
 *
 * Comprehensive test suite to ensure WCAG 2.1 AA compliance for all
 * randomizer components including keyboard navigation, screen reader
 * support, and mobile accessibility.
 *
 * @author serabi
 * @version 1.0.0
 * @since 2025-07-19
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { axe, toHaveNoViolations } from 'vitest-axe';
import { RandomizerWheel } from '../RandomizerWheel';
import { OptimizedWheel } from '../OptimizedWheel';
import { ProjectSelector } from '../ProjectSelector';
import type { Project } from '@/types/project';

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

// Mock hooks
vi.mock('@/hooks/useAccessibilityAnnouncements', () => ({
  useAccessibilityAnnouncements: () => ({
    announce: vi.fn(),
    announceSpinStart: vi.fn(),
    announceSpinResult: vi.fn(),
    announceKeyboardInstructions: vi.fn(),
    announceTouchInstructions: vi.fn(),
    liveRegionRef: { current: null },
    statusRef: { current: null },
  }),
  useFocusManagement: () => ({
    removeFocus: vi.fn(),
    setFocus: vi.fn(),
    isFocusable: vi.fn(() => true),
    getFocusableElements: vi.fn(() => []),
  }),
}));

vi.mock('@/hooks/useTouchGestures', () => ({
  useWheelTouchGestures: () => ({
    wheelTouchHandlers: {},
    isTouch: false,
    touchFeedback: '',
    triggerHapticFeedback: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
  useIsTouchDevice: () => false,
}));

vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock projects data
const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Diamond Painting Project 1',
    company: 'Test Company',
    artist: 'Test Artist',
    status: 'progress',
    imageUrl: 'https://example.com/image1.jpg',
  },
  {
    id: '2',
    title: 'Diamond Painting Project 2',
    company: 'Another Company',
    artist: 'Another Artist',
    status: 'progress',
    imageUrl: 'https://example.com/image2.jpg',
  },
  {
    id: '3',
    title: 'Very Long Project Title That Should Be Truncated For Display',
    company: 'Long Company Name',
    artist: 'Long Artist Name',
    status: 'progress',
  },
];

describe('Randomizer Accessibility Tests', () => {
  describe('RandomizerWheel Component', () => {
    const defaultProps = {
      projects: mockProjects,
      onSpinComplete: vi.fn(),
      disabled: false,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(<RandomizerWheel {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', () => {
      render(<RandomizerWheel {...defaultProps} />);

      const wheelContainer = screen.getByRole('application');
      expect(wheelContainer).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Project randomizer wheel')
      );
      expect(wheelContainer).toHaveAttribute('aria-describedby');
      expect(wheelContainer).toHaveAttribute('tabIndex', '0');
    });

    it('should have live regions for screen reader announcements', () => {
      render(<RandomizerWheel {...defaultProps} />);

      // Check for ARIA live regions (they're visually hidden but present)
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThanOrEqual(2);

      const politeRegion = document.querySelector('[aria-live="polite"]');
      const assertiveRegion = document.querySelector('[aria-live="assertive"]');

      expect(politeRegion).toBeInTheDocument();
      expect(assertiveRegion).toBeInTheDocument();
    });

    it('should support comprehensive keyboard navigation', async () => {
      const user = userEvent.setup();
      const onSpinComplete = vi.fn();

      render(<RandomizerWheel {...defaultProps} onSpinComplete={onSpinComplete} />);

      const wheelContainer = screen.getByRole('application');

      // Focus the wheel
      await user.tab();
      expect(wheelContainer).toHaveFocus();

      // Test Enter key
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(onSpinComplete).toHaveBeenCalled();
      });

      // Test Space key
      vi.clearAllMocks();
      await user.keyboard(' ');
      await waitFor(() => {
        expect(onSpinComplete).toHaveBeenCalled();
      });

      // Test Escape key
      await user.keyboard('{Escape}');

      // Test arrow keys (should provide feedback)
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowRight}');

      // Test Home and End keys
      await user.keyboard('{Home}');
      await user.keyboard('{End}');

      // Test help keys
      await user.keyboard('{F1}');
      await user.keyboard('?');

      // Test shortcut keys
      await user.keyboard('h');
      await user.keyboard('r');
    });

    it('should handle disabled state accessibly', () => {
      render(<RandomizerWheel {...defaultProps} disabled={true} />);

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      expect(spinButton).toBeDisabled();
      expect(spinButton).toHaveAttribute('aria-label', expect.stringContaining('disabled'));
    });

    it('should handle empty state accessibly', () => {
      render(<RandomizerWheel {...defaultProps} projects={[]} />);

      const emptyWheel = screen.getByRole('img', { name: /empty project randomizer wheel/i });
      expect(emptyWheel).toBeInTheDocument();

      const disabledButton = screen.getByRole('button', { name: /spin the wheel.*disabled/i });
      expect(disabledButton).toBeDisabled();
    });

    it('should provide alternative content for screen readers', () => {
      render(<RandomizerWheel {...defaultProps} />);

      // Check for screen reader only content
      const instructions = document.querySelector('#wheel-instructions');
      const alternatives = document.querySelector('#project-alternatives');

      expect(instructions).toBeInTheDocument();
      expect(alternatives).toBeInTheDocument();

      // Verify project list is available for screen readers
      mockProjects.forEach(project => {
        expect(alternatives).toHaveTextContent(project.title);
      });
    });

    it('should support reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<RandomizerWheel {...defaultProps} />);

      // Component should render without issues with reduced motion
      const wheelContainer = screen.getByRole('application');
      expect(wheelContainer).toBeInTheDocument();
    });
  });

  describe('ProjectSelector Component', () => {
    const defaultProps = {
      projects: mockProjects,
      selectedProjects: new Set<string>(),
      onProjectToggle: vi.fn(),
      onSelectAll: vi.fn(),
      onSelectNone: vi.fn(),
      isLoading: false,
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<ProjectSelector {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels for project items', () => {
      render(<ProjectSelector {...defaultProps} />);

      mockProjects.forEach(project => {
        const projectButton = screen.getByRole('button', {
          name: new RegExp(`Select project: ${project.title}`, 'i'),
        });
        expect(projectButton).toBeInTheDocument();
        expect(projectButton).toHaveAttribute('aria-describedby');
      });
    });

    it('should support keyboard navigation between projects', async () => {
      const user = userEvent.setup();
      render(<ProjectSelector {...defaultProps} />);

      // Focus first project
      const firstProject = screen.getByRole('button', {
        name: new RegExp(mockProjects[0].title, 'i'),
      });

      await user.tab();
      await user.tab(); // Skip "Select All" button
      await user.tab(); // Skip "Select None" button

      expect(firstProject).toHaveFocus();

      // Test arrow key navigation
      await user.keyboard('{ArrowDown}');
      const secondProject = screen.getByRole('button', {
        name: new RegExp(mockProjects[1].title, 'i'),
      });
      expect(secondProject).toHaveFocus();

      // Test Home and End keys
      await user.keyboard('{Home}');
      expect(firstProject).toHaveFocus();

      await user.keyboard('{End}');
      const lastProject = screen.getByRole('button', {
        name: new RegExp(mockProjects[2].title, 'i'),
      });
      expect(lastProject).toHaveFocus();
    });

    it('should provide detailed information for screen readers', () => {
      render(<ProjectSelector {...defaultProps} />);

      mockProjects.forEach(project => {
        const detailsElement = document.querySelector(`#project-${project.id}-details`);
        expect(detailsElement).toBeInTheDocument();
        expect(detailsElement).toHaveClass('sr-only');
        expect(detailsElement).toHaveTextContent(project.title);
        if (project.company) {
          expect(detailsElement).toHaveTextContent(project.company);
        }
        if (project.artist) {
          expect(detailsElement).toHaveTextContent(project.artist);
        }
      });
    });

    it('should handle selection state changes accessibly', async () => {
      const user = userEvent.setup();
      const onProjectToggle = vi.fn();
      const selectedProjects = new Set(['1']);

      render(
        <ProjectSelector
          {...defaultProps}
          selectedProjects={selectedProjects}
          onProjectToggle={onProjectToggle}
        />
      );

      // Check selected project has correct ARIA label
      const selectedProject = screen.getByRole('button', {
        name: new RegExp(`Deselect project: ${mockProjects[0].title}`, 'i'),
      });
      expect(selectedProject).toBeInTheDocument();

      // Test selection toggle
      await user.click(selectedProject);
      expect(onProjectToggle).toHaveBeenCalledWith('1');
    });

    it('should handle loading state accessibly', () => {
      render(<ProjectSelector {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should show loading skeletons
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should handle empty state accessibly', () => {
      render(<ProjectSelector {...defaultProps} projects={[]} />);

      expect(screen.getByText('No projects in progress')).toBeInTheDocument();
      expect(screen.getByText(/start some projects/i)).toBeInTheDocument();
    });

    it('should have accessible batch operation buttons', async () => {
      const user = userEvent.setup();
      const onSelectAll = vi.fn();
      const onSelectNone = vi.fn();

      render(
        <ProjectSelector {...defaultProps} onSelectAll={onSelectAll} onSelectNone={onSelectNone} />
      );

      const selectAllButton = screen.getByRole('button', {
        name: /select all.*projects for randomizer/i,
      });
      const selectNoneButton = screen.getByRole('button', {
        name: /deselect all projects/i,
      });

      expect(selectAllButton).toBeInTheDocument();
      expect(selectNoneButton).toBeInTheDocument();

      await user.click(selectAllButton);
      expect(onSelectAll).toHaveBeenCalled();

      await user.click(selectNoneButton);
      expect(onSelectNone).toHaveBeenCalled();
    });
  });

  describe('Touch and Mobile Accessibility', () => {
    beforeEach(() => {
      // Mock touch device
      vi.mocked(vi.importMock('@/hooks/use-mobile')).useIsTouchDevice.mockReturnValue(true);
      vi.mocked(vi.importMock('@/hooks/use-mobile')).useIsMobile.mockReturnValue(true);
    });

    it('should have appropriate touch target sizes', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={vi.fn()} />);

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });

      // Check computed styles for minimum touch target size
      const styles = window.getComputedStyle(spinButton);
      const minHeight = parseInt(styles.minHeight);
      const minWidth = parseInt(styles.minWidth);

      // WCAG 2.1 AA requires minimum 44x44px touch targets
      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    });

    it('should provide touch-specific instructions', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={vi.fn()} />);

      // Should show touch-specific hints
      expect(screen.getByText(/swipe ↑/i)).toBeInTheDocument();
      expect(screen.getByText(/tap the button above or swipe up/i)).toBeInTheDocument();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should support high contrast mode', () => {
      // Mock high contrast preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<RandomizerWheel projects={mockProjects} onSpinComplete={vi.fn()} />);

      // Component should render without issues in high contrast mode
      const wheelContainer = screen.getByRole('application');
      expect(wheelContainer).toBeInTheDocument();
    });

    it('should support forced colors mode', () => {
      // Mock forced colors mode (Windows High Contrast)
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(forced-colors: active)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<OptimizedWheel projects={mockProjects} onSpinComplete={vi.fn()} />);

      const wheelContainer = screen.getByRole('application');
      expect(wheelContainer).toBeInTheDocument();
    });
  });

  describe('Error Handling Accessibility', () => {
    it('should handle network errors accessibly', async () => {
      const user = userEvent.setup();
      const onSpinComplete = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<RandomizerWheel projects={mockProjects} onSpinComplete={onSpinComplete} />);

      const wheelContainer = screen.getByRole('application');
      await user.tab();
      await user.keyboard('{Enter}');

      // Should handle error gracefully without breaking accessibility
      expect(wheelContainer).toBeInTheDocument();
    });
  });
});
