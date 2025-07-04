import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatusTabs from '../StatusTabs';
import { ProjectFilterStatus } from '@/types/project';

// Mock the dashboard filters context
const mockUpdateStatus = vi.fn();
const mockGetCountsForTabs = vi.fn();

const mockContextValue = {
  filters: {
    activeStatus: 'all' as ProjectFilterStatus,
  },
  updateStatus: mockUpdateStatus,
  getCountsForTabs: mockGetCountsForTabs,
};

vi.mock('@/contexts/DashboardFiltersContext', () => ({
  useDashboardFilters: () => mockContextValue,
}));

describe('StatusTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default counts
    mockGetCountsForTabs.mockReturnValue({
      all: 15,
      wishlist: 3,
      purchased: 4,
      stash: 2,
      progress: 2,
      completed: 3,
      destashed: 1,
      archived: 0,
    });

    mockContextValue.filters.activeStatus = 'all';
  });

  describe('rendering', () => {
    it('should render all status tabs with correct labels', () => {
      render(<StatusTabs />);

      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /wishlist/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /purchased/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /in stash/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /in progress/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /completed/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /destashed/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /archived/i })).toBeInTheDocument();
    });

    it('should display correct counts for each status', () => {
      render(<StatusTabs />);

      expect(screen.getByText('15')).toBeInTheDocument(); // all
      expect(screen.getByText('3')).toBeInTheDocument(); // wishlist
      expect(screen.getByText('4')).toBeInTheDocument(); // purchased
      expect(screen.getByText('2')).toBeInTheDocument(); // stash and progress (both have 2)
      expect(screen.getByText('1')).toBeInTheDocument(); // destashed
      expect(screen.getByText('0')).toBeInTheDocument(); // archived
    });

    it('should mark the active status tab as selected', () => {
      mockContextValue.filters.activeStatus = 'wishlist';

      render(<StatusTabs />);

      const wishlistTab = screen.getByRole('tab', { name: /wishlist/i });
      expect(wishlistTab).toHaveAttribute('data-state', 'active');
    });

    it('should have proper responsive grid classes', () => {
      render(<StatusTabs />);

      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toHaveClass(
        'grid',
        'h-auto',
        'grid-cols-2',
        'gap-2',
        'md:grid-cols-4',
        'lg:grid-cols-8'
      );
    });
  });

  describe('interactions', () => {
    it('should call updateStatus when a tab is clicked', () => {
      render(<StatusTabs />);

      const wishlistTab = screen.getByRole('tab', { name: /wishlist/i });
      fireEvent.click(wishlistTab);

      expect(mockUpdateStatus).toHaveBeenCalledWith('wishlist');
    });

    it('should call updateStatus for each status tab', () => {
      render(<StatusTabs />);

      const statusTabs = [
        { name: /all/i, value: 'all' },
        { name: /wishlist/i, value: 'wishlist' },
        { name: /purchased/i, value: 'purchased' },
        { name: /in stash/i, value: 'stash' },
        { name: /in progress/i, value: 'progress' },
        { name: /completed/i, value: 'completed' },
        { name: /destashed/i, value: 'destashed' },
        { name: /archived/i, value: 'archived' },
      ];

      statusTabs.forEach(({ name, value }) => {
        const tab = screen.getByRole('tab', { name });
        fireEvent.click(tab);
        expect(mockUpdateStatus).toHaveBeenCalledWith(value);
      });

      expect(mockUpdateStatus).toHaveBeenCalledTimes(statusTabs.length);
    });

    it('should support keyboard navigation', () => {
      render(<StatusTabs />);

      const wishlistTab = screen.getByRole('tab', { name: /wishlist/i });

      // Focus the tab
      wishlistTab.focus();
      expect(wishlistTab).toHaveFocus();

      // Press Enter to activate
      fireEvent.keyDown(wishlistTab, { key: 'Enter', code: 'Enter' });
      expect(mockUpdateStatus).toHaveBeenCalledWith('wishlist');
    });

    it('should support arrow key navigation between tabs', () => {
      render(<StatusTabs />);

      const allTab = screen.getByRole('tab', { name: /all/i });
      const wishlistTab = screen.getByRole('tab', { name: /wishlist/i });

      // Focus first tab
      allTab.focus();
      expect(allTab).toHaveFocus();

      // Press arrow right to move to next tab
      fireEvent.keyDown(allTab, { key: 'ArrowRight', code: 'ArrowRight' });
      expect(wishlistTab).toHaveFocus();
    });
  });

  describe('dynamic counts', () => {
    it('should update counts when context changes', () => {
      const { rerender } = render(<StatusTabs />);

      // Initial counts
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      // Update counts
      mockGetCountsForTabs.mockReturnValue({
        all: 20,
        wishlist: 5,
        purchased: 4,
        stash: 3,
        progress: 2,
        completed: 4,
        destashed: 1,
        archived: 1,
      });

      rerender(<StatusTabs />);

      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should handle zero counts correctly', () => {
      mockGetCountsForTabs.mockReturnValue({
        all: 0,
        wishlist: 0,
        purchased: 0,
        stash: 0,
        progress: 0,
        completed: 0,
        destashed: 0,
        archived: 0,
      });

      render(<StatusTabs />);

      // Should display 0 for all tabs
      const countElements = screen.getAllByText('0');
      expect(countElements).toHaveLength(8); // All 8 status tabs should show 0
    });

    it('should handle large numbers correctly', () => {
      mockGetCountsForTabs.mockReturnValue({
        all: 9999,
        wishlist: 1000,
        purchased: 500,
        stash: 250,
        progress: 100,
        completed: 8149,
        destashed: 50,
        archived: 49,
      });

      render(<StatusTabs />);

      expect(screen.getByText('9999')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('8149')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<StatusTabs />);

      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(8);

      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('role', 'tab');
        expect(tab).toHaveAttribute('data-state');
      });
    });

    it('should have tab panels for accessibility', () => {
      render(<StatusTabs />);

      // The Tabs component requires TabsContent for proper accessibility
      const tabPanels = screen.getAllByRole('tabpanel', { hidden: true });
      expect(tabPanels).toHaveLength(8);
    });

    it('should have meaningful accessible names', () => {
      render(<StatusTabs />);

      expect(screen.getByRole('tab', { name: /all.*15/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /wishlist.*3/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /purchased.*4/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /in stash.*2/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /in progress.*2/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /completed.*3/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /destashed.*1/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /archived.*0/i })).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('should be memoized to prevent unnecessary re-renders', () => {
      const { rerender } = render(<StatusTabs />);

      // Component should be wrapped with React.memo
      expect(StatusTabs.displayName).toBe('StatusTabsComponent');

      // Re-render with same props should not cause issues
      rerender(<StatusTabs />);

      // Context should only be called once per render
      expect(mockGetCountsForTabs).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined counts gracefully', () => {
      mockGetCountsForTabs.mockReturnValue({
        all: undefined,
        wishlist: null,
        purchased: NaN,
        stash: 0,
        progress: 1,
        completed: 2,
        destashed: 3,
        archived: 4,
      });

      render(<StatusTabs />);

      // Should not crash and should handle undefined/null/NaN values
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should handle context errors gracefully', () => {
      mockGetCountsForTabs.mockImplementation(() => {
        throw new Error('Context error');
      });

      // Should not crash when context throws error
      expect(() => render(<StatusTabs />)).not.toThrow();
    });
  });
});
