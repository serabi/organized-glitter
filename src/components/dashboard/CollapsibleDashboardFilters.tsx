/**
 * @fileoverview Collapsible Dashboard Filters Component for Mobile View
 *
 * This component provides a simple collapsible interface for dashboard filters on mobile devices.
 * It wraps the main DashboardFilters component and provides toggle functionality with
 * persistent state management through localStorage.
 *
 * Key Features:
 * - Mobile-only visibility (renders nothing on desktop)
 * - Simple collapsible interface with smooth transitions
 * - Persistent collapse state in localStorage
 * - Active filter count display in header
 * - Keyboard accessibility support
 * - Proper ARIA attributes for screen readers
 *
 * The component automatically consumes filter state from DashboardFiltersContext
 * and displays the active filter count in the collapsible header.
 *
 * @author serabi
 * @since 2025-07-03
 * @version 1.1.0 - Simplified mobile filters with standard CSS overflow
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import DashboardFilters from './DashboardFilters'; // DashboardFilters will also use context
// import { DashboardFiltersProps } from './DashboardFilters'; // No longer need to import props
import { useFilterActionsOnly } from '@/contexts/filterIndex';

type CollapsibleDashboardFiltersProps = Record<string, never>;

const LOCAL_STORAGE_KEY = 'dashboardFiltersMobileCollapsed';

const CollapsibleDashboardFiltersComponent: React.FC<CollapsibleDashboardFiltersProps> = () => {
  // All hooks must be called before any early returns
  const isMobile = useIsMobile();
  const { getActiveFilterCount } = useFilterActionsOnly();

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        return storedState ? JSON.parse(storedState) === true : false; // Default to closed on mobile devices (both phones & tablets)
      } catch {
        // Handle invalid JSON gracefully
        return false; // Default to closed on mobile
      }
    }
    return false; // Default to closed on server
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(isOpen));
      } catch {
        // Handle localStorage errors gracefully - removed console.warn to avoid console usage
      }
    }
  }, [isOpen]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleOpen();
      }
    },
    [toggleOpen]
  );

  // Handle SSR and mobile check - early returns after all hooks
  if (typeof window === 'undefined' || !isMobile) {
    return null;
  }

  const activeFilterCount = getActiveFilterCount ? getActiveFilterCount() : 0;

  return (
    <div className="mb-6 lg:hidden">
      <div
        id="filters-header"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls="filters-content"
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className="flex cursor-pointer items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <div className="flex items-center space-x-3">
          {isOpen ? (
            <ChevronDown size={20} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={20} className="text-muted-foreground" />
          )}
          <span className="font-semibold text-foreground">Filters</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
              {activeFilterCount} Active
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {isOpen ? 'Hide Filters' : 'Show Filters'}
        </div>
      </div>
      <div
        id="filters-content"
        role="region"
        aria-labelledby="filters-header"
        className={`overflow-y-auto transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-screen opacity-100' : 'max-h-0 overflow-hidden opacity-0'
        }`}
      >
        <div
          className={`mt-4 rounded-lg border bg-card p-3 shadow-sm transition-all duration-300 ease-in-out md:p-4 ${
            isOpen ? 'translate-y-0 transform' : '-translate-y-2 transform'
          }`}
        >
          <DashboardFilters />
        </div>
      </div>
    </div>
  );
};

// export type { DashboardValidSortField };
export default React.memo(CollapsibleDashboardFiltersComponent);
