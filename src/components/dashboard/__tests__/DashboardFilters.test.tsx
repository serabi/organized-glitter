import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardFilters from '../DashboardFilters';
import { DashboardValidSortField } from '../../../features/dashboard/dashboard.constants';

// Mock child components
// Mock SearchProjects component
interface MockSearchProjectsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isPending?: boolean;
}

vi.mock('../SearchProjects', () => ({
  default: ({ searchTerm, onSearchChange, isPending }: MockSearchProjectsProps) => (
    <div data-testid="search-projects">
      <input
        data-testid="search-input"
        value={searchTerm}
        onChange={e => onSearchChange(e.target.value)}
      />
      {isPending && <span data-testid="search-pending">Searching...</span>}
    </div>
  ),
}));

// Mock FilterDropdown component
interface MockFilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ label: string; value: string }> | string[];
  placeholder?: string;
}

vi.mock('../FilterDropdown', () => ({
  default: ({ label, value, onChange, options, placeholder }: MockFilterDropdownProps) => (
    <div
      data-testid={`filter-dropdown-${label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+$/, '')}`}
    >
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="all">{placeholder}</option>
        {options?.map(option => {
          const isString = typeof option === 'string';
          const key = isString ? option : option.value;
          const displayValue = isString ? option : option.label;
          return (
            <option key={key} value={key}>
              {displayValue}
            </option>
          );
        })}
      </select>
    </div>
  ),
}));

// Mock ViewToggle component
type ViewType = 'grid' | 'list';

interface MockViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

vi.mock('../ViewToggle', () => ({
  default: ({ activeView, onViewChange }: MockViewToggleProps) => (
    <div data-testid="view-toggle">
      <button
        onClick={() => onViewChange('grid')}
        className={activeView === 'grid' ? 'active' : ''}
      >
        Grid
      </button>
      <button
        onClick={() => onViewChange('list')}
        className={activeView === 'list' ? 'active' : ''}
      >
        List
      </button>
    </div>
  ),
}));

// Mock the dashboard filters context
const mockFilters = {
  activeStatus: 'all',
  selectedCompany: 'all',
  selectedArtist: 'all',
  selectedDrillShape: 'all',
  selectedTags: [] as string[],
  selectedYearFinished: 'all',
  includeMiniKits: true,
  includeDestashed: true,
  viewType: 'grid',
  sortField: 'last_updated' as DashboardValidSortField,
  sortDirection: 'desc' as const,
  searchTerm: '',
};

const mockUpdateSearchTerm = vi.fn();
const mockUpdateCompany = vi.fn();
const mockUpdateArtist = vi.fn();
const mockUpdateDrillShape = vi.fn();
const mockToggleTag = vi.fn();
const mockClearAllTags = vi.fn();
const mockUpdateYearFinished = vi.fn();
const mockUpdateIncludeMiniKits = vi.fn();
const mockUpdateIncludeDestashed = vi.fn();
const mockUpdateViewType = vi.fn();
const mockUpdateSort = vi.fn();
const mockResetAllFilters = vi.fn();
const mockGetActiveFilterCount = vi.fn();

const mockContextValue = {
  filters: mockFilters,
  updateSearchTerm: mockUpdateSearchTerm,
  updateCompany: mockUpdateCompany,
  updateArtist: mockUpdateArtist,
  updateDrillShape: mockUpdateDrillShape,
  toggleTag: mockToggleTag,
  clearAllTags: mockClearAllTags,
  updateYearFinished: mockUpdateYearFinished,
  updateIncludeMiniKits: mockUpdateIncludeMiniKits,
  updateIncludeDestashed: mockUpdateIncludeDestashed,
  updateViewType: mockUpdateViewType,
  updateSort: mockUpdateSort,
  resetAllFilters: mockResetAllFilters,
  getActiveFilterCount: mockGetActiveFilterCount,
  companies: [
    { label: 'Company 1', value: 'company1' },
    { label: 'Company 2', value: 'company2' },
  ],
  artists: [
    { label: 'Artist 1', value: 'artist1' },
    { label: 'Artist 2', value: 'artist2' },
  ],
  drillShapes: ['round', 'square'],
  allTags: [
    { id: 'tag1', name: 'Tag 1' },
    { id: 'tag2', name: 'Tag 2' },
  ],
  yearFinishedOptions: ['2023', '2022', '2021'],
  isLoadingProjects: false,
  searchInputRef: { current: null },
  isSearchPending: false,
};

vi.mock('@/contexts/DashboardFiltersContext', () => ({
  useDashboardFilters: () => mockContextValue,
}));

describe('DashboardFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveFilterCount.mockReturnValue(0);

    // Reset filters to defaults
    Object.assign(mockFilters, {
      activeStatus: 'all',
      selectedCompany: 'all',
      selectedArtist: 'all',
      selectedDrillShape: 'all',
      selectedTags: [],
      selectedYearFinished: 'all',
      includeMiniKits: true,
      includeDestashed: true,
      viewType: 'grid',
      sortField: 'last_updated',
      sortDirection: 'desc',
      searchTerm: '',
    });
  });

  describe('rendering', () => {
    it('should render all filter components', () => {
      render(<DashboardFilters />);

      expect(screen.getByTestId('search-projects')).toBeInTheDocument();
      expect(screen.getByTestId('filter-dropdown-company')).toBeInTheDocument();
      expect(screen.getByTestId('filter-dropdown-artist')).toBeInTheDocument();
      expect(screen.getByTestId('filter-dropdown-drill-shape')).toBeInTheDocument();
      expect(screen.getByTestId('filter-dropdown-tag')).toBeInTheDocument();
      expect(screen.getByTestId('filter-dropdown-year-finished')).toBeInTheDocument();
      expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
    });

    it('should render filters header', () => {
      render(<DashboardFilters />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should render include mini kits checkbox', () => {
      render(<DashboardFilters />);

      expect(screen.getByLabelText(/include mini kits/i)).toBeInTheDocument();
    });

    it('should render include destashed kits checkbox', () => {
      render(<DashboardFilters />);

      expect(screen.getByLabelText(/include destashed kits/i)).toBeInTheDocument();
    });

    it('should render reset filters button', () => {
      render(<DashboardFilters />);

      expect(screen.getByTestId('reset-filters-button')).toBeInTheDocument();
      expect(screen.getByText('Reset Filters')).toBeInTheDocument();
    });

    it('should render sorting controls', () => {
      render(<DashboardFilters />);

      expect(screen.getByTestId('filter-dropdown-sort-by')).toBeInTheDocument();
      expect(screen.getByTestId('filter-dropdown-order')).toBeInTheDocument();
    });
  });

  describe('active filter count badge', () => {
    it('should show active filter count when filters are applied', () => {
      mockGetActiveFilterCount.mockReturnValue(3);

      render(<DashboardFilters />);

      expect(screen.getByText('3 Active')).toBeInTheDocument();
    });

    it('should not show badge when no filters are active', () => {
      mockGetActiveFilterCount.mockReturnValue(0);

      render(<DashboardFilters />);

      expect(screen.queryByText(/active/i)).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading message when projects are loading', () => {
      mockContextValue.isLoadingProjects = true;

      render(<DashboardFilters />);

      expect(screen.getByText('Loading filters...')).toBeInTheDocument();
    });

    it('should not show loading message when not loading', () => {
      mockContextValue.isLoadingProjects = false;

      render(<DashboardFilters />);

      expect(screen.queryByText('Loading filters...')).not.toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should render search component with correct props', () => {
      mockFilters.searchTerm = 'test search';
      mockContextValue.isSearchPending = true;

      render(<DashboardFilters />);

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveValue('test search');
      expect(screen.getByTestId('search-pending')).toBeInTheDocument();
    });

    it('should call updateSearchTerm when search changes', () => {
      render(<DashboardFilters />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'new search' } });

      expect(mockUpdateSearchTerm).toHaveBeenCalledWith('new search');
    });
  });

  describe('filter dropdowns', () => {
    it('should render company filter with correct options', () => {
      render(<DashboardFilters />);

      const companySelect = screen.getByTestId('filter-dropdown-company').querySelector('select');
      expect(companySelect).toHaveValue('all');

      const options = Array.from(companySelect!.options).map(opt => opt.textContent);
      expect(options).toContain('Company 1');
      expect(options).toContain('Company 2');
    });

    it('should call updateCompany when company filter changes', () => {
      render(<DashboardFilters />);

      const companySelect = screen.getByTestId('filter-dropdown-company').querySelector('select');
      fireEvent.change(companySelect!, { target: { value: 'company1' } });

      expect(mockUpdateCompany).toHaveBeenCalledWith('company1');
    });

    it('should render artist filter with correct options', () => {
      render(<DashboardFilters />);

      const artistSelect = screen.getByTestId('filter-dropdown-artist').querySelector('select');
      const options = Array.from(artistSelect!.options).map(opt => opt.textContent);
      expect(options).toContain('Artist 1');
      expect(options).toContain('Artist 2');
    });

    it('should render drill shape filter', () => {
      render(<DashboardFilters />);

      const drillShapeSelect = screen
        .getByTestId('filter-dropdown-drill-shape')
        .querySelector('select');
      const options = Array.from(drillShapeSelect!.options).map(opt => opt.textContent);
      expect(options).toContain('round');
      expect(options).toContain('square');
    });

    it('should render year filter', () => {
      render(<DashboardFilters />);

      const yearSelect = screen
        .getByTestId('filter-dropdown-year-finished')
        .querySelector('select');
      const options = Array.from(yearSelect!.options).map(opt => opt.textContent);
      expect(options).toContain('2023');
      expect(options).toContain('2022');
      expect(options).toContain('2021');
    });
  });

  describe('tag filtering', () => {
    it('should render tag dropdown with available tags', () => {
      render(<DashboardFilters />);

      const tagSelect = screen.getByTestId('filter-dropdown-tag').querySelector('select');
      const options = Array.from(tagSelect!.options).map(opt => opt.textContent);
      expect(options).toContain('Tag 1');
      expect(options).toContain('Tag 2');
    });

    it('should show first selected tag in dropdown', () => {
      mockFilters.selectedTags = ['tag1', 'tag2'];

      render(<DashboardFilters />);

      const tagSelect = screen.getByTestId('filter-dropdown-tag').querySelector('select');
      expect(tagSelect).toHaveValue('tag1');
    });

    it('should clear all tags when "all" is selected', () => {
      render(<DashboardFilters />);

      const tagSelect = screen.getByTestId('filter-dropdown-tag').querySelector('select');
      fireEvent.change(tagSelect!, { target: { value: 'all' } });

      expect(mockClearAllTags).toHaveBeenCalled();
    });

    it('should clear and set new tag when specific tag is selected', () => {
      render(<DashboardFilters />);

      const tagSelect = screen.getByTestId('filter-dropdown-tag').querySelector('select');
      fireEvent.change(tagSelect!, { target: { value: 'tag2' } });

      expect(mockClearAllTags).toHaveBeenCalled();
      expect(mockToggleTag).toHaveBeenCalledWith('tag2');
    });
  });

  describe('mini kits checkbox', () => {
    it('should be checked when includeMiniKits is true', () => {
      mockFilters.includeMiniKits = true;

      render(<DashboardFilters />);

      const checkbox = screen.getByTestId('include-mini-kits-checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should not be checked when includeMiniKits is false', () => {
      mockFilters.includeMiniKits = false;

      render(<DashboardFilters />);

      const checkbox = screen.getByTestId('include-mini-kits-checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should call updateIncludeMiniKits when toggled', () => {
      render(<DashboardFilters />);

      const checkbox = screen.getByTestId('include-mini-kits-checkbox');
      fireEvent.click(checkbox);

      expect(mockUpdateIncludeMiniKits).toHaveBeenCalledWith(false);
    });
  });

  describe('destashed kits checkbox', () => {
    it('should be checked when includeDestashed is true', () => {
      mockFilters.includeDestashed = true;

      render(<DashboardFilters />);

      const checkbox = screen.getByTestId('include-destashed-checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should not be checked when includeDestashed is false', () => {
      mockFilters.includeDestashed = false;

      render(<DashboardFilters />);

      const checkbox = screen.getByTestId('include-destashed-checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should call updateIncludeDestashed when toggled', () => {
      render(<DashboardFilters />);

      const checkbox = screen.getByTestId('include-destashed-checkbox');
      fireEvent.click(checkbox);

      expect(mockUpdateIncludeDestashed).toHaveBeenCalledWith(false);
    });
  });

  describe('view toggle', () => {
    it('should show current view type', () => {
      mockFilters.viewType = 'grid';

      render(<DashboardFilters />);

      const gridButton = screen.getByText('Grid');
      expect(gridButton).toHaveClass('active');
    });

    it('should call updateViewType when view changes', () => {
      render(<DashboardFilters />);

      const listButton = screen.getByText('List');
      fireEvent.click(listButton);

      expect(mockUpdateViewType).toHaveBeenCalledWith('list');
    });
  });

  describe('sorting controls', () => {
    it('should render sort field dropdown with correct options', () => {
      render(<DashboardFilters />);

      const sortSelect = screen.getByTestId('filter-dropdown-sort-by').querySelector('select');
      const options = Array.from(sortSelect!.options).map(opt => opt.textContent);

      expect(options).toContain('Default');
      expect(options).toContain('Alphabetical by Kit Name');
      expect(options).toContain('Date Purchased');
      expect(options).toContain('Date Finished');
    });

    it('should show correct sort direction options for kit_name field', () => {
      mockFilters.sortField = 'kit_name';

      render(<DashboardFilters />);

      const orderSelect = screen.getByTestId('filter-dropdown-order').querySelector('select');
      const options = Array.from(orderSelect!.options).map(opt => opt.textContent);

      expect(options).toContain('Z-A');
      expect(options).toContain('A-Z');
    });

    it('should show correct sort direction options for date fields', () => {
      mockFilters.sortField = 'date_purchased';

      render(<DashboardFilters />);

      const orderSelect = screen.getByTestId('filter-dropdown-order').querySelector('select');
      const options = Array.from(orderSelect!.options).map(opt => opt.textContent);

      expect(options).toContain('Newest First');
      expect(options).toContain('Oldest First');
    });

    it('should show correct sort direction options for last_updated field', () => {
      mockFilters.sortField = 'last_updated';

      render(<DashboardFilters />);

      const orderSelect = screen.getByTestId('filter-dropdown-order').querySelector('select');
      const options = Array.from(orderSelect!.options).map(opt => opt.textContent);

      expect(options).toContain('Most Recently Modified');
      expect(options).toContain('Least Recently Modified');
    });

    it('should call updateSort when sort field changes', () => {
      render(<DashboardFilters />);

      const sortSelect = screen.getByTestId('filter-dropdown-sort-by').querySelector('select');
      fireEvent.change(sortSelect!, { target: { value: 'kit_name' } });

      expect(mockUpdateSort).toHaveBeenCalledWith('kit_name', 'desc');
    });

    it('should call updateSort when sort direction changes', () => {
      render(<DashboardFilters />);

      const orderSelect = screen.getByTestId('filter-dropdown-order').querySelector('select');
      fireEvent.change(orderSelect!, { target: { value: 'asc' } });

      expect(mockUpdateSort).toHaveBeenCalledWith('last_updated', 'asc');
    });

    it('should handle invalid sort direction gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(<DashboardFilters />);

      const orderSelect = screen.getByTestId('filter-dropdown-order').querySelector('select');
      fireEvent.change(orderSelect!, { target: { value: 'invalid' } });

      expect(consoleSpy).toHaveBeenCalledWith(
        '',
        expect.stringContaining('DashboardFilters: Invalid sort direction value received:')
      );
      expect(mockUpdateSort).toHaveBeenCalledWith('last_updated', 'desc');

      consoleSpy.mockRestore();
    });
  });

  describe('reset filters', () => {
    it('should call resetAllFilters when reset button is clicked', () => {
      render(<DashboardFilters />);

      const resetButton = screen.getByTestId('reset-filters-button');
      fireEvent.click(resetButton);

      expect(mockResetAllFilters).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper data-testid attributes', () => {
      render(<DashboardFilters />);

      expect(screen.getByTestId('dashboard-filters')).toBeInTheDocument();
      expect(screen.getByTestId('include-mini-kits-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('include-destashed-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('reset-filters-button')).toBeInTheDocument();
    });

    it('should have proper labels for form controls', () => {
      render(<DashboardFilters />);

      expect(screen.getByLabelText(/include mini kits/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/include destashed kits/i)).toBeInTheDocument();
    });
  });

  describe('responsive design', () => {
    it('should have sticky positioning', () => {
      render(<DashboardFilters />);

      const container = screen.getByTestId('dashboard-filters');
      expect(container).toHaveClass('sticky', 'top-20');
    });

    it('should have proper spacing and layout classes', () => {
      render(<DashboardFilters />);

      const container = screen.getByTestId('dashboard-filters');
      expect(container).toHaveClass('rounded-lg', 'bg-white', 'p-6', 'shadow');
    });
  });

  describe('memoization', () => {
    it('should be memoized to prevent unnecessary re-renders', () => {
      expect(DashboardFilters.displayName).toBe('DashboardFilters');
    });
  });
});
