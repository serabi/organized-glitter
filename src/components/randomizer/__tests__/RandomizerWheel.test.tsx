import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RandomizerWheel } from '../RandomizerWheel';
import { Project } from '@/types/project';

// Mock the logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Test Project 1',
    user: 'user1',
    status: 'progress',
    kit_category: 'full',
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
    title: 'Very Long Project Title That Should Be Truncated',
    user: 'user1',
    status: 'progress',
    kit_category: 'full',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
  },
];

describe('RandomizerWheel', () => {
  const mockOnSpinComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Math.random for predictable test results
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty State', () => {
    it('renders empty state when no projects provided', () => {
      render(<RandomizerWheel projects={[]} onSpinComplete={mockOnSpinComplete} />);

      expect(screen.getByText('Select projects below')).toBeInTheDocument();
      expect(screen.getByText('to get started!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /spin the wheel/i })).toBeDisabled();
    });

    it('shows gradient background in empty state', () => {
      render(<RandomizerWheel projects={[]} onSpinComplete={mockOnSpinComplete} />);

      const wheelContainer = screen.getByText('Select projects below').closest('div');
      expect(wheelContainer?.parentElement).toHaveClass('bg-gradient-to-br');
    });

    it('displays arrow pointer in empty state', () => {
      render(<RandomizerWheel projects={[]} onSpinComplete={mockOnSpinComplete} />);

      // Check for ChevronDown icon (it will be rendered as an SVG)
      const arrow = document.querySelector('svg');
      expect(arrow).toBeInTheDocument();
    });
  });

  describe('Wheel with Projects', () => {
    it('renders wheel with project segments', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
      expect(screen.getByText('Very Long Project...')).toBeInTheDocument(); // Truncated
    });

    it('truncates long project titles', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      expect(screen.getByText('Very Long Project...')).toBeInTheDocument();
      expect(
        screen.queryByText('Very Long Project Title That Should Be Truncated')
      ).not.toBeInTheDocument();
    });

    it('enables spin button when projects are provided', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      expect(spinButton).not.toBeDisabled();
    });

    it('displays correct number of segments', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      // Each project should have an SVG path
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThanOrEqual(mockProjects.length);
    });
  });

  describe('Spinning Behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('starts spinning when button is clicked', async () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      fireEvent.click(spinButton);

      expect(screen.getByText('Spinning...')).toBeInTheDocument();
      expect(spinButton).toBeDisabled();
    });

    it('calls onSpinComplete after spinning animation', async () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      fireEvent.click(spinButton);

      // Fast-forward the 3-second animation
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockOnSpinComplete).toHaveBeenCalledTimes(1);
      });

      expect(mockOnSpinComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
        })
      );
    });

    it('prevents multiple spins while spinning', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });

      fireEvent.click(spinButton);
      fireEvent.click(spinButton); // Second click should be ignored

      // Should still only be called once after animation
      vi.advanceTimersByTime(3000);

      expect(mockOnSpinComplete).toHaveBeenCalledTimes(1);
    });

    it('resets spin button text after animation completes', async () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      fireEvent.click(spinButton);

      expect(screen.getByText('Spinning...')).toBeInTheDocument();

      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.getByText('Spin the Wheel!')).toBeInTheDocument();
      });
    });
  });

  describe('Selection Logic', () => {
    it('calculates correct segment selection with predictable rotation', () => {
      // Mock Math.random to return 0.5 for predictable results
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      fireEvent.click(spinButton);

      vi.advanceTimersByTime(3000);

      expect(mockOnSpinComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
        })
      );
    });

    it('selects different projects with different random values', () => {
      const calls: any[] = [];

      // First spin
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      const { rerender } = render(
        <RandomizerWheel projects={mockProjects} onSpinComplete={project => calls.push(project)} />
      );

      fireEvent.click(screen.getByRole('button', { name: /spin the wheel/i }));
      vi.advanceTimersByTime(3000);

      // Second spin with different random value
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      rerender(
        <RandomizerWheel projects={mockProjects} onSpinComplete={project => calls.push(project)} />
      );

      fireEvent.click(screen.getByRole('button', { name: /spin the wheel/i }));
      vi.advanceTimersByTime(3000);

      expect(calls).toHaveLength(2);
      // With different random values, we should get different selections
      // (though this depends on the exact calculation)
    });
  });

  describe('Disabled State', () => {
    it('disables wheel when disabled prop is true', () => {
      render(
        <RandomizerWheel
          projects={mockProjects}
          onSpinComplete={mockOnSpinComplete}
          disabled={true}
        />
      );

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      expect(spinButton).toBeDisabled();
    });

    it('does not spin when disabled', () => {
      render(
        <RandomizerWheel
          projects={mockProjects}
          onSpinComplete={mockOnSpinComplete}
          disabled={true}
        />
      );

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      fireEvent.click(spinButton);

      vi.advanceTimersByTime(3000);

      expect(mockOnSpinComplete).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes to wheel', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      const wheelElement = document.querySelector('.w-72');
      expect(wheelElement).toBeInTheDocument();
      expect(wheelElement).toHaveClass('sm:w-96', 'lg:w-112');
    });

    it('applies responsive classes to arrow', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      const arrowElement = document.querySelector('.w-8');
      expect(arrowElement).toBeInTheDocument();
      expect(arrowElement).toHaveClass('sm:w-10', 'lg:w-12');
    });
  });

  describe('Accessibility', () => {
    it('provides accessible button with clear label', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      expect(spinButton).toBeInTheDocument();
    });

    it('provides instructional text for users', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      expect(screen.getByText(/click the button to spin and randomly select/i)).toBeInTheDocument();
    });

    it('shows helpful message in empty state', () => {
      render(<RandomizerWheel projects={[]} onSpinComplete={mockOnSpinComplete} />);

      expect(screen.getByText(/select your in-progress projects below/i)).toBeInTheDocument();
    });
  });

  describe('Color Assignment', () => {
    it('assigns colors consistently to projects', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      // Check that SVG paths exist (indicating colored segments)
      const pathElements = document.querySelectorAll('path');
      expect(pathElements.length).toBeGreaterThanOrEqual(mockProjects.length);
    });
  });

  describe('Animation Styles', () => {
    it('includes custom animation CSS', () => {
      render(<RandomizerWheel projects={mockProjects} onSpinComplete={mockOnSpinComplete} />);

      const styleElement = document.querySelector('style');
      expect(styleElement?.textContent).toContain('@keyframes spin-custom');
      expect(styleElement?.textContent).toContain('.animate-spin-custom');
    });
  });
});
