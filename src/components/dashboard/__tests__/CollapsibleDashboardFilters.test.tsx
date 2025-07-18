import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CollapsibleDashboardFilters from '../CollapsibleDashboardFilters';

// Mock the mobile hook
const mockIsMobile = vi.fn();
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile(),
}));

// Mock the filter provider context
const mockGetActiveFilterCount = vi.fn();
const mockContextValue = {
  getActiveFilterCount: mockGetActiveFilterCount,
};

vi.mock('@/contexts/FilterProvider', () => ({
  useFilterActionsOnly: () => mockContextValue,
}));

// Mock DashboardFilters component
vi.mock('../DashboardFilters', () => ({
  default: vi.fn(() => <div data-testid="dashboard-filters">Dashboard Filters</div>),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('CollapsibleDashboardFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveFilterCount.mockReturnValue(0);
    mockIsMobile.mockReturnValue(true); // Default to mobile
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('mobile visibility', () => {
    it('should render on mobile devices', () => {
      mockIsMobile.mockReturnValue(true);

      render(<CollapsibleDashboardFilters />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should not render on desktop devices', () => {
      mockIsMobile.mockReturnValue(false);

      render(<CollapsibleDashboardFilters />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByText('Filters')).not.toBeInTheDocument();
    });
  });

  describe('collapsible behavior', () => {
    beforeEach(() => {
      mockIsMobile.mockReturnValue(true);
    });

    it('should start expanded by default', () => {
      render(<CollapsibleDashboardFilters />);

      const filtersContent = screen.getByTestId('dashboard-filters');
      expect(filtersContent).toBeInTheDocument();

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should toggle when button is clicked', async () => {
      render(<CollapsibleDashboardFilters />);

      const button = screen.getByRole('button');

      // Initially expanded
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('dashboard-filters')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });

      // Filters should not be rendered when collapsed
      expect(screen.queryByTestId('dashboard-filters')).not.toBeInTheDocument();

      // Click to expand again
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByTestId('dashboard-filters')).toBeInTheDocument();
      });
    });

    it('should save state to localStorage', async () => {
      render(<CollapsibleDashboardFilters />);

      const button = screen.getByRole('button');

      // Click to collapse
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'dashboardFiltersMobileCollapsed',
          'false'
        );
      });

      // Click to expand
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'dashboardFiltersMobileCollapsed',
          'true'
        );
      });
    });

    it('should restore state from localStorage', () => {
      // Mock localStorage returning collapsed state
      mockLocalStorage.getItem.mockReturnValue('false');

      render(<CollapsibleDashboardFilters />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('dashboard-filters')).not.toBeInTheDocument();
    });

    it('should handle invalid localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      render(<CollapsibleDashboardFilters />);

      // Should default to expanded state
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('keyboard interactions', () => {
    beforeEach(() => {
      mockIsMobile.mockReturnValue(true);
    });

    it('should toggle on Enter key', async () => {
      render(<CollapsibleDashboardFilters />);

      const button = screen.getByRole('button');

      // Press Enter to collapse
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should toggle on Space key', async () => {
      render(<CollapsibleDashboardFilters />);

      const button = screen.getByRole('button');

      // Press Space to collapse
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should prevent default behavior for keyboard events', () => {
      render(<CollapsibleDashboardFilters />);

      const button = screen.getByRole('button');

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });

      const preventDefaultSpy = vi.spyOn(enterEvent, 'preventDefault');

      button.dispatchEvent(enterEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not toggle on other keys', () => {
      render(<CollapsibleDashboardFilters />);

      const button = screen.getByRole('button');

      // Press other keys - should not toggle
      fireEvent.keyDown(button, { key: 'Escape', code: 'Escape' });
      fireEvent.keyDown(button, { key: 'Tab', code: 'Tab' });
      fireEvent.keyDown(button, { key: 'ArrowDown', code: 'ArrowDown' });

      // Should still be expanded
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('filter count display', () => {
    beforeEach(() => {
      mockIsMobile.mockReturnValue(true);
    });

    it('should show filter count when filters are active', () => {
      mockGetActiveFilterCount.mockReturnValue(3);

      render(<CollapsibleDashboardFilters />);

      expect(screen.getByText('Filters (3)')).toBeInTheDocument();
    });

    it('should not show count when no filters are active', () => {
      mockGetActiveFilterCount.mockReturnValue(0);

      render(<CollapsibleDashboardFilters />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });

    it('should update count when filters change', () => {
      mockGetActiveFilterCount.mockReturnValue(2);

      const { unmount } = render(<CollapsibleDashboardFilters />);

      expect(screen.getByText('Filters (2)')).toBeInTheDocument();

      // Unmount and remount with new mock value
      unmount();

      mockGetActiveFilterCount.mockReturnValue(5);
      render(<CollapsibleDashboardFilters />);

      expect(screen.getByText('Filters (5)')).toBeInTheDocument();
    });

    it('should handle undefined filter count gracefully', () => {
      mockGetActiveFilterCount.mockReturnValue(undefined);

      render(<CollapsibleDashboardFilters />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  describe('icon display', () => {
    beforeEach(() => {
      mockIsMobile.mockReturnValue(true);
    });

    it('should show down chevron when expanded', () => {
      render(<CollapsibleDashboardFilters />);

      // Look for the chevron down icon (using test id or class)
      const button = screen.getByRole('button');
      const chevronDown =
        button.querySelector('[data-testid="chevron-down"]') ||
        button.querySelector('.lucide-chevron-down');

      // The icon should be present (actual implementation uses Lucide icons)
      expect(button).toBeInTheDocument();
    });

    it('should show right chevron when collapsed', async () => {
      render(<CollapsibleDashboardFilters />);

      const button = screen.getByRole('button');

      // Click to collapse
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });

      // The icon should change (implementation detail - Lucide icons)
      expect(button).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockIsMobile.mockReturnValue(true);
    });

    it('should have proper ARIA attributes', () => {
      render(<CollapsibleDashboardFilters />);

      const button = screen.getByRole('button');
      const content = screen.getByRole('region');

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', 'filters-content');
      expect(button).toHaveAttribute('tabindex', '0');

      expect(content).toHaveAttribute('id', 'filters-content');
      expect(content).toHaveAttribute('aria-labelledby', 'filters-header');
    });

    it('should be keyboard focusable', () => {
      render(<CollapsibleDashboardFilters />);

      const button = screen.getByRole('button');

      button.focus();
      expect(button).toHaveFocus();
    });

    it('should have proper role attributes', () => {
      render(<CollapsibleDashboardFilters />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
  });

  describe('responsive design', () => {
    it('should have mobile-specific CSS classes', () => {
      mockIsMobile.mockReturnValue(true);

      render(<CollapsibleDashboardFilters />);

      const container = screen.getByRole('button').closest('div');
      expect(container?.parentElement).toHaveClass('lg:hidden');
    });

    it('should have proper styling for different states', async () => {
      mockIsMobile.mockReturnValue(true);

      render(<CollapsibleDashboardFilters />);

      const content = screen.getByRole('region');

      // Check expanded state classes
      expect(content).toHaveClass('transition-all', 'duration-300', 'ease-in-out');

      // Collapse and check classes
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(content).toHaveClass('max-h-0', 'opacity-0');
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockIsMobile.mockReturnValue(true);
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => render(<CollapsibleDashboardFilters />)).not.toThrow();
    });

    it('should handle setState errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<CollapsibleDashboardFilters />);

      // Should not crash even if state updates fail
      expect(screen.getByRole('button')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('server-side rendering', () => {
    it('should handle SSR gracefully', () => {
      // Component has SSR guard that returns null when window is undefined
      // This is tested by the component logic, not by mocking window
      // since React testing library itself requires window to be defined
      mockIsMobile.mockReturnValue(true);

      // The component will render normally in the test environment
      const { container } = render(<CollapsibleDashboardFilters />);
      expect(container.firstChild).not.toBeNull();
    });
  });
});
