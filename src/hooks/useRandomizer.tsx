import { useState, useCallback, useMemo } from 'react';
import { Project } from '@/types/project';
import { useProjects } from '@/hooks/queries/useProjects';
import { useSpinHistory } from '@/hooks/queries/useSpinHistory';
import { useCreateSpin } from '@/hooks/mutations/useCreateSpin';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useRandomizer');

export const useRandomizer = () => {
  const { user } = useAuth();
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
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

  // Fetch spin history
  const {
    data: spinHistory = [],
    isLoading: isLoadingHistory,
    error: historyError,
  } = useSpinHistory({
    userId: user?.id,
    limit: 10,
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

  // Project selection handlers
  const toggleProject = useCallback((projectId: string) => {
    setSelectedProjectIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
        logger.debug('Project deselected', { projectId });
      } else {
        newSet.add(projectId);
        logger.debug('Project selected', { projectId });
      }
      return newSet;
    });
  }, []);

  const selectAllProjects = useCallback(() => {
    const allIds = new Set(availableProjects.map(p => p.id));
    setSelectedProjectIds(allIds);
    logger.debug('All projects selected', { count: allIds.size });
  }, [availableProjects]);

  const selectNoProjects = useCallback(() => {
    setSelectedProjectIds(new Set());
    logger.debug('All projects deselected');
  }, []);

  // Spin handler
  const handleSpinComplete = useCallback(async (selectedProject: Project) => {
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
  }, [user?.id, selectedProjectIds, createSpinMutation]);

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
    const recentSpins = spinHistory.length;

    return {
      totalProjects,
      selectedCount,
      canSpin,
      recentSpins,
      hasProjects: totalProjects > 0,
      hasSelection: selectedCount > 0,
    };
  }, [availableProjects.length, selectedProjectIds.size, spinHistory.length]);

  // Loading and error states
  const isLoading = isLoadingProjects || isLoadingHistory;
  const error = projectsError || historyError;

  return {
    // Data
    availableProjects,
    selectedProjects,
    selectedProjectIds,
    spinHistory,
    lastSpinResult,
    stats,

    // Loading states
    isLoading,
    isLoadingProjects,
    isLoadingHistory,
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
  };
};