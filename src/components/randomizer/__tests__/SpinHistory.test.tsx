import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SpinHistory } from '../SpinHistory';
import { useSpinHistory } from '@/hooks/queries/useSpinHistory';

// Mock the hooks
vi.mock('@/hooks/queries/useSpinHistory');
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockUseSpinHistory = vi.mocked(useSpinHistory);

const mockSpinHistory = [
  {
    id: '1',
    user: 'user1',
    project: 'proj1',
    project_title: 'Test Project 1',
    selected_projects: ['proj1', 'proj2', 'proj3'],
    spun_at: '2024-01-01T12:00:00Z',
    created: '2024-01-01T12:00:00Z',
    updated: '2024-01-01T12:00:00Z',
  },
  {
    id: '2',
    user: 'user1',
    project: 'proj2',
    project_title: 'Test Project 2',
    selected_projects: ['proj1', 'proj2'],
    spun_at: '2024-01-01T11:00:00Z',
    created: '2024-01-01T11:00:00Z',
    updated: '2024-01-01T11:00:00Z',
  },
  {
    id: '3',
    user: 'user1',
    project: null, // Deleted project
    project_title: 'Deleted Project',
    selected_projects: ['proj1', 'proj2', 'proj3'],
    spun_at: '2024-01-01T10:00:00Z',
    created: '2024-01-01T10:00:00Z',
    updated: '2024-01-01T10:00:00Z',
  },
];

const mockLongHistory = Array.from({ length: 12 }, (_, i) => ({
  id: `${i + 1}`,
  user: 'user1',
  project: `proj${i + 1}`,
  project_title: `Project ${i + 1}`,
  selected_projects: ['proj1', 'proj2'],
  spun_at: `2024-01-01T${String(12 - i).padStart(2, '0')}:00:00Z`,
  created: `2024-01-01T${String(12 - i).padStart(2, '0')}:00:00Z`,
  updated: `2024-01-01T${String(12 - i).padStart(2, '0')}:00:00Z`,
}));

describe('SpinHistory', () => {
  const mockOnClearHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders spin history header', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('Spin History')).toBeInTheDocument();
      expect(screen.getByText('Your recent randomizer results')).toBeInTheDocument();
    });

    it('displays spin records correctly', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
      expect(screen.getByText('Deleted Project')).toBeInTheDocument();
    });

    it('shows latest badge on most recent spin', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('Latest')).toBeInTheDocument();
    });

    it('displays project option counts', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('3 options')).toBeInTheDocument();
      expect(screen.getByText('2 options')).toBeInTheDocument();
    });

    it('shows clear history button when onClearHistory is provided', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" onClearHistory={mockOnClearHistory} />);

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats recent dates as "Just now"', () => {
      const recentSpin = {
        ...mockSpinHistory[0],
        spun_at: '2024-01-01T12:29:00Z', // 1 minute ago
      };

      mockUseSpinHistory
        .mockReturnValueOnce({
          data: [recentSpin],
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('formats dates as minutes ago', () => {
      const spinMinutesAgo = {
        ...mockSpinHistory[0],
        spun_at: '2024-01-01T12:15:00Z', // 15 minutes ago
      };

      mockUseSpinHistory
        .mockReturnValueOnce({
          data: [spinMinutesAgo],
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('15m ago')).toBeInTheDocument();
    });

    it('formats dates as hours ago', () => {
      const spinHoursAgo = {
        ...mockSpinHistory[0],
        spun_at: '2024-01-01T10:30:00Z', // 2 hours ago
      };

      mockUseSpinHistory
        .mockReturnValueOnce({
          data: [spinHoursAgo],
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    it('formats old dates as days ago', () => {
      const spinDaysAgo = {
        ...mockSpinHistory[0],
        spun_at: '2023-12-30T12:30:00Z', // 2 days ago
      };

      mockUseSpinHistory
        .mockReturnValueOnce({
          data: [spinDaysAgo],
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });

    it('formats very old dates as locale date string', () => {
      const spinWeeksAgo = {
        ...mockSpinHistory[0],
        spun_at: '2023-12-01T12:30:00Z', // Weeks ago
      };

      mockUseSpinHistory
        .mockReturnValueOnce({
          data: [spinWeeksAgo],
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('12/1/2023')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading skeletons when initial load is loading', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: [],
          isLoading: true,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      const skeletons = screen.getAllByTestId('spin-skeleton');
      expect(skeletons).toHaveLength(3);
    });

    it('shows loading state in Show More button', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockLongHistory.slice(0, 8),
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: true,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      const showMoreButton = screen.getByRole('button', { name: /loading/i });
      expect(showMoreButton).toBeDisabled();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no spins exist', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('No spins yet')).toBeInTheDocument();
      expect(screen.getByText('Your spin history will appear here')).toBeInTheDocument();
    });

    it('shows empty state icon', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      // History icon should be present in empty state
      expect(document.querySelector('.w-12.h-12')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows Show More button when there are 8 or more recent records', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockLongHistory.slice(0, 8),
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByRole('button', { name: /show more history/i })).toBeInTheDocument();
    });

    it('does not show Show More button when less than 8 records', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.queryByRole('button', { name: /show more history/i })).not.toBeInTheDocument();
    });

    it('expands to show full history when Show More is clicked', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({});

      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockLongHistory.slice(0, 8),
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: mockLongHistory,
          isLoading: false,
          refetch: mockRefetch,
        } as any);

      render(<SpinHistory userId="user1" />);

      const showMoreButton = screen.getByRole('button', { name: /show more history/i });
      fireEvent.click(showMoreButton);

      await waitFor(() => {
        expect(screen.getByText('Showing all 12 spins')).toBeInTheDocument();
      });
    });

    it('updates footer text based on view state', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('Showing last 3 spins')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClearHistory when clear button is clicked', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" onClearHistory={mockOnClearHistory} />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      expect(mockOnClearHistory).toHaveBeenCalledTimes(1);
    });

    it('navigates to project when project link is clicked', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      const projectLinks = screen.getAllByRole('link');
      expect(projectLinks[0]).toHaveAttribute('href', '/projects/proj1');
    });
  });

  describe('Responsive Design', () => {
    it('renders ScrollArea for handling overflow', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(document.querySelector('[data-radix-scroll-area-viewport]')).toBeInTheDocument();
    });

    it('applies proper height constraints to scroll area', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(document.querySelector('.h-80')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid date strings gracefully', () => {
      const spinWithInvalidDate = {
        ...mockSpinHistory[0],
        spun_at: 'invalid-date',
      };

      mockUseSpinHistory
        .mockReturnValueOnce({
          data: [spinWithInvalidDate],
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper headings and structure', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('provides accessible button labels', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" onClearHistory={mockOnClearHistory} />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toHaveAttribute('aria-label', expect.stringContaining('Clear'));
    });

    it('provides accessible links to projects', () => {
      mockUseSpinHistory
        .mockReturnValueOnce({
          data: mockSpinHistory,
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      const projectLinks = screen.getAllByRole('link');
      expect(projectLinks[0]).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Test Project 1')
      );
    });
  });

  describe('Deleted Projects', () => {
    it('handles deleted projects gracefully', () => {
      const spinWithDeletedProject = {
        ...mockSpinHistory[0],
        project: null,
        project_title: 'Deleted Project',
      };

      mockUseSpinHistory
        .mockReturnValueOnce({
          data: [spinWithDeletedProject],
          isLoading: false,
        } as any)
        .mockReturnValueOnce({
          data: [],
          isLoading: false,
          refetch: vi.fn(),
        } as any);

      render(<SpinHistory userId="user1" />);

      expect(screen.getByText('Deleted Project')).toBeInTheDocument();
      // Link should still work even with null project ID
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/projects/null');
    });
  });
});
