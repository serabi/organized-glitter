/**
 * @fileoverview Collapsible Dashboard Filters Component for Mobile View
 *
 * This component provides a mobile-optimized collapsible interface for dashboard filters.
 * It wraps the main DashboardFilters component and provides toggle functionality with
 * persistent state management through localStorage.
 *
 * Key Features:
 * - Mobile-only visibility (renders nothing on desktop)
 * - Collapsible interface with smooth transitions
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
 * @version 1.0.0 - Mobile-optimized collapsible filters
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import DashboardFilters from './DashboardFilters'; // DashboardFilters will also use context
// import { DashboardFiltersProps } from './DashboardFilters'; // No longer need to import props
import { useFilters } from '@/contexts/FiltersContext';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CollapsibleDashboardFiltersProps {
  // No props needed as everything comes from context or is local state
}

const LOCAL_STORAGE_KEY = 'dashboardFiltersMobileCollapsed';

const CollapsibleDashboardFiltersComponent: React.FC<CollapsibleDashboardFiltersProps> = () => {
  const isMobile = useIsMobile();
  const { getActiveFilterCount } = useFilters();

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      return storedState ? JSON.parse(storedState) === true : true; // Default to closed
    }
    return true; // Default to closed on server
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(isOpen));
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

  const activeFilterCount = getActiveFilterCount ? getActiveFilterCount() : 0;

  if (!isMobile) {
    return null; // On desktop, this component renders nothing
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 shadow-sm dark:border-gray-700 lg:hidden">
      <div
        id="filters-header"
        role="button"
        tabIndex={0}
        aria-expanded={!isOpen}
        aria-controls="filters-content"
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className="flex cursor-pointer items-center justify-between rounded-t-lg bg-gray-50 p-3 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        <div className="flex items-center">
          {!isOpen ? (
            <ChevronDown size={20} className="mr-2 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight size={20} className="mr-2 text-gray-600 dark:text-gray-400" />
          )}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </span>
        </div>
      </div>
      <div
        id="filters-content"
        role="region"
        aria-labelledby="filters-header"
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          !isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {!isOpen && (
          <div className="border-t border-gray-200 p-0 dark:border-gray-700">
            {/* DashboardFilters will consume context internally */}
            <DashboardFilters />
          </div>
        )}
      </div>
    </div>
  );
};

// No need to re-export ValidSortField, can be imported from context directly
// export type { DashboardValidSortField };
export default React.memo(CollapsibleDashboardFiltersComponent);
