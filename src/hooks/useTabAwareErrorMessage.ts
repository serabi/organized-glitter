/**
 * @fileoverview Tab-Aware Error Message Hook
 *
 * Custom hook for generating dynamic error messages based on the currently active tab.
 * Uses react-use patterns for optimal performance with memoization to prevent unnecessary re-renders.
 *
 * The hook integrates with FiltersContext to get the active tab status and generates
 * contextual error messages that help users understand which tab context they're in
 * when no projects match their current filters.
 *
 * Performance optimizations:
 * - Uses useMemo to memoize error message generation
 * - Minimal dependency array to prevent unnecessary recalculations
 * - Direct object lookup for O(1) display name resolution
 *
 * @author serabi
 * @since 2025-07-08
 * @version 1.0.0
 */

import { useMemo } from 'react';
import { useStatusFilter } from '@/contexts/FilterProvider';
import { getTabDisplayName } from '@/utils/tabDisplayNames';

/**
 * Custom hook for generating dynamic tab-aware error messages
 *
 * Generates contextual error messages based on the currently active tab status.
 * For the "All" tab, returns a generic message. For specific tabs, includes
 * the tab name in the message for better user context.
 *
 * @returns Memoized error message string
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const errorMessage = useTabAwareErrorMessage();
 *
 *   if (projects.length === 0) {
 *     return <p>{errorMessage}</p>;
 *   }
 *
 *   return <ProjectsList projects={projects} />;
 * };
 * ```
 */
export const useTabAwareErrorMessage = (): string => {
  const { activeStatus } = useStatusFilter();

  // Memoize error message generation for performance
  // Only recalculates when activeStatus changes
  const errorMessage = useMemo(() => {
    // Special case for "All" tab - use generic message
    if (activeStatus === 'all') {
      return 'No projects match your current filters.';
    }

    // Get user-friendly display name for the active tab
    const tabDisplayName = getTabDisplayName(activeStatus);

    // Generate dynamic message with tab context
    return `No projects in ${tabDisplayName} match your current filters.`;
  }, [activeStatus]);

  return errorMessage;
};
