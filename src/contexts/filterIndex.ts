/**
 * Filter system re-exports - Central index for all filter-related hooks and types
 * @author @serabi
 * @created 2025-08-02
 */

// Re-export all types and interfaces
export * from '@/contexts/filterState';
export * from '@/contexts/filterActions';

// Re-export hooks
export { useFilterState } from '@/contexts/useFilterState';
export { useFilterActions } from '@/contexts/useFilterActions';

// Re-export all FilterHooks for compatibility
export {
  useFilters,
  useFilterStateOnly,
  usePagination,
  useSorting,
  useFilterActionsOnly,
  useStatusFilter,
  useFiltersFull,
  useFilterActionsAndMeta,
} from '@/contexts/FilterHooks';

// Re-export FilterProvider for backward compatibility
export { FilterProvider } from '@/contexts/FilterProvider';
