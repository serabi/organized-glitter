/**
 * @fileoverview Main Randomizer Hook
 *
 * Provides comprehensive state management and business logic for the randomizer feature.
 * Handles project selection, wheel spinning, result recording, and data synchronization
 * with the backend. Integrates multiple React Query hooks and provides a unified API.
 *
 * @author @serabi
 * @version 1.0.0
 * @since 2024-06-28
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Project } from '@/types/project';
import { useProjects } from '@/hooks/queries/useProjects';
import { useCreateSpin } from '@/hooks/mutations/useCreateSpin';
import { useSpinHistoryCount } from '@/hooks/queries/useSpinHistoryCount';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useRandomizer');

/**
 * Main randomizer hook providing state management and business logic
 *
 * Centralized hook that orchestrates the entire randomizer feature including
 * project selection, wheel spinning, result recording, and data management.
 * Integrates with React Query for server state and provides optimized callbacks.
 *
 * @returns {Object} Comprehensive randomizer state and actions
 *
 * @example
 * ```tsx
 * function RandomizerPage() {
 *   const {
 *     availableProjects,
 *     selectedProjects,
 *     selectedProjectIds,
 *     stats,
 *     isLoading,
 *     toggleProject,
 *     selectAllProjects,
 *     handleSpinComplete
 *   } = useRandomizer();
 *
 *   return (
 *     <div>
 *       <ProjectSelector
 *         projects={availableProjects}
 *         selectedProjects={selectedProjectIds}
 *         onProjectToggle={toggleProject}
 *         onSelectAll={selectAllProjects}
 *       />
 *       {stats.canSpin && (
 *         <RandomizerWheel
 *           projects={selectedProjects}
 *           onSpinComplete={handleSpinComplete}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns {Object} Hook return value with the following properties:
 *
 * **Data:**
 * - `availableProjects: Project[]` - All in-progress projects available for selection
 * - `selectedProjects: Project[]` - Currently selected projects for the wheel
 * - `selectedProjectIds: Set<string>` - Set of selected project IDs for efficient lookup
 * - `lastSpinResult: Project | null` - Most recent spin result
 * - `stats: Object` - Statistics about project counts and spin eligibility
 *
 * **Loading States:**
 * - `isLoading: boolean` - Overall loading state
 * - `isLoadingProjects: boolean` - Projects data loading state
 * - `isCreatingSpin: boolean` - Spin recording in progress
 *
 * **Error States:**
 * - `error: Error | null` - Projects loading error
 * - `spinError: Error | null` - Spin recording error
 *
 * **Actions:**
 * - `toggleProject: (id: string) => void` - Toggle individual project selection
 * - `selectAllProjects: () => void` - Select all available projects
 * - `selectNoProjects: () => void` - Deselect all projects
 * - `handleSpinComplete: (project: Project) => Promise<void>` - Handle spin completion
 * - `clearLastResult: () => void` - Clear the last spin result
 *
 * **Utilities:**
 * - `formatProjectsForWheel: () => Project[]` - Get formatted projects for wheel display
 *
 * @performance
 * - Uses React.useMemo for expensive computations
 * - React.useCallback for stable function references
 * - Efficient Set operations for project selection
 * - Minimal re-renders through optimized dependencies
 *
 * @businesslogic
 * - Only fetches in-progress projects (status: 'progress')
 * - Requires minimum 2 projects for spinning
 * - Automatically records spin results to database
 * - Provides comprehensive statistics for UI decisions
 */
export const useRandomizer = () => {
  const { user } = useAuth();

  /** Set of currently selected project IDs for efficient lookup and updates */
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  /** The most recent spin result for display purposes */
  const [lastSpinResult, setLastSpinResult] = useState<Project | null>(null);

  // Fetch in-progress projects
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useProjects({
    userId: user?.id,
    filters: { status: 'progress' }, // Only in-progress projects
    sortField: 'last_updated',
    sortDirection: 'desc',
    currentPage: 1,
    pageSize: 100, // Get all in-progress projects
  });

  // Fetch spin history count for stats (efficient count-only query)
  const { data: totalSpinCount = 0 } = useSpinHistoryCount({
    userId: user?.id,
    enabled: !!user?.id,
  });

  // Create spin mutation
  const createSpinMutation = useCreateSpin();

  // Get available projects and selected projects
  const availableProjects = useMemo(() => {
    return projectsData?.projects || [];
  }, [projectsData?.projects]);

  const selectedProjects = useMemo(() => {
    return availableProjects.filter(project => selectedProjectIds.has(project.id));
  }, [availableProjects, selectedProjectIds]);

  // URL parameter handling for deep linking
  const updateUrlParams = useCallback((projectIds: Set<string>) => {
    const url = new URL(window.location.href);
    if (projectIds.size > 0) {
      url.searchParams.set('projects', Array.from(projectIds).join(','));
    } else {
      url.searchParams.delete('projects');
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Initialize selected projects from URL parameters
  useEffect(() => {
    if (availableProjects.length === 0) return;

    const urlParams = new URLSearchParams(window.location.search);
    const projectsParam = urlParams.get('projects');

    if (projectsParam) {
      const projectIds = projectsParam.split(',').filter(id => id.trim());
      const validProjectIds = projectIds.filter(id =>
        availableProjects.some(project => project.id === id)
      );

      if (validProjectIds.length > 0) {
        const newSelectedIds = new Set(validProjectIds);
        setSelectedProjectIds(newSelectedIds);
        logger.debug('Loaded selected projects from URL', {
          urlProjectIds: projectIds,
          validProjectIds: validProjectIds,
        });
      }
    }
  }, [availableProjects]);

  // Project selection handlers
  const toggleProject = useCallback(
    (projectId: string) => {
      setSelectedProjectIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(projectId)) {
          newSet.delete(projectId);
          logger.debug('Project deselected', { projectId });
        } else {
          newSet.add(projectId);
          logger.debug('Project selected', { projectId });
        }
        updateUrlParams(newSet);
        return newSet;
      });
    },
    [updateUrlParams]
  );

  const selectAllProjects = useCallback(() => {
    const allIds = new Set(availableProjects.map(p => p.id));
    setSelectedProjectIds(allIds);
    updateUrlParams(allIds);
    logger.debug('All projects selected', { count: allIds.size });
  }, [availableProjects, updateUrlParams]);

  const selectNoProjects = useCallback(() => {
    const emptySet = new Set<string>();
    setSelectedProjectIds(emptySet);
    updateUrlParams(emptySet);
    logger.debug('All projects deselected');
  }, [updateUrlParams]);

  // Spin handler
  const handleSpinComplete = useCallback(
    async (selectedProject: Project) => {
      if (!user?.id) {
        logger.error('No user ID available for spin recording');
        return;
      }

      setLastSpinResult(selectedProject);

      try {
        // Record the spin in history
        await createSpinMutation.mutateAsync({
          user: user.id,
          project: selectedProject.id,
          project_title: selectedProject.title,
          selected_projects: Array.from(selectedProjectIds),
        });

        logger.info('Spin completed and recorded', {
          selectedProjectId: selectedProject.id,
          selectedProjectTitle: selectedProject.title,
          optionsCount: selectedProjectIds.size,
        });
      } catch (error) {
        logger.error('Failed to record spin', {
          error,
          selectedProjectId: selectedProject.id,
        });
      }
    },
    [user?.id, selectedProjectIds, createSpinMutation]
  );

  // Clear last result
  const clearLastResult = useCallback(() => {
    setLastSpinResult(null);
    logger.debug('Last spin result cleared');
  }, []);

  // Statistics
  const stats = useMemo(() => {
    const totalProjects = availableProjects.length;
    const selectedCount = selectedProjectIds.size;
    const canSpin = selectedCount >= 2; // Need at least 2 projects for randomization

    return {
      totalProjects,
      selectedCount,
      canSpin,
      recentSpins: totalSpinCount, // Keep the property name for backward compatibility
      hasProjects: totalProjects > 0,
      hasSelection: selectedCount > 0,
    };
  }, [availableProjects.length, selectedProjectIds.size, totalSpinCount]);

  // Loading and error states
  const isLoading = isLoadingProjects;
  const error = projectsError;

  return {
    // Data
    availableProjects,
    selectedProjects,
    selectedProjectIds,
    lastSpinResult,
    stats,

    // Loading states
    isLoading,
    isLoadingProjects,
    isCreatingSpin: createSpinMutation.isPending,

    // Error states
    error,
    spinError: createSpinMutation.error,

    // Actions
    toggleProject,
    selectAllProjects,
    selectNoProjects,
    handleSpinComplete,
    clearLastResult,

    // Utilities
    formatProjectsForWheel: useCallback(() => {
      return selectedProjects;
    }, [selectedProjects]),

    // URL sharing
    getShareableUrl: useCallback(() => {
      const url = new URL(window.location.href);
      if (selectedProjectIds.size > 0) {
        url.searchParams.set('projects', Array.from(selectedProjectIds).join(','));
      } else {
        url.searchParams.delete('projects');
      }
      return url.toString();
    }, [selectedProjectIds]),
  };
};
