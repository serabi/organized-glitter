import { useMemo } from 'react';
import { ProjectType } from '@/types/project';

interface OverviewStats {
  completedCount: number;
  estimatedDrills: number;
  startedCount: number;
  inProgressCount: number;
  totalDiamonds: number;
}

/**
 * Created 2025-05-26 while refactoring Overview.tsx
 * Custom hook to calculate overview statistics from projects data
 * @param projects - Array of projects to calculate stats from
 * @returns Object containing calculated stats and in-progress projects
 */
export function useOverviewStats(projects: ProjectType[]) {
  return useMemo(() => {
    // Initialize with defaults in case of empty or undefined projects
    const defaultStats: OverviewStats = {
      completedCount: 0,
      estimatedDrills: 0,
      startedCount: 0,
      inProgressCount: 0,
      totalDiamonds: 0,
    };

    if (!projects || projects.length === 0) {
      return { stats: defaultStats, inProgressProjects: [] };
    }

    const currentYear = new Date().getFullYear();

    // Filter projects completed this year
    const projectsCompletedThisYear = projects.filter(project => {
      const completedDate = project.dateCompleted ? new Date(project.dateCompleted) : null;
      return completedDate && completedDate.getFullYear() === currentYear;
    });

    // Debug log for completed projects (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        'Completed projects this year:',
        projectsCompletedThisYear.map(p => ({
          count: 1, // Just show count instead of sensitive data
          hasDiamonds: !!p.totalDiamonds,
          diamondsType: typeof p.totalDiamonds,
        }))
      );
    }

    // Filter projects started this year
    const projectsStartedThisYear = projects.filter(project => {
      const startedDate = project.dateStarted ? new Date(project.dateStarted) : null;
      return startedDate && startedDate.getFullYear() === currentYear;
    });

    // Calculate stats
    const completedCount = projectsCompletedThisYear.length;
    const startedCount = projectsStartedThisYear.length;

    // Calculate total diamonds for completed projects
    let totalDiamonds = 0;
    projectsCompletedThisYear.forEach(project => {
      if (project.totalDiamonds) {
        const diamonds = project.totalDiamonds.toString();
        totalDiamonds += diamonds ? parseInt(diamonds.replace(/[^0-9]/g, '')) || 0 : 0;
      }
    });

    // Get in-progress projects with debugging
    const inProgressProjects = projects.filter(project => project.status === 'progress');

    // Debug log for in-progress projects (development only, no sensitive data)
    if (process.env.NODE_ENV === 'development') {
      console.log('All projects stats:', {
        totalCount: projects.length,
        statusBreakdown: projects.reduce(
          (acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      });
      console.log('In-progress projects found:', {
        count: inProgressProjects.length,
        status: 'progress',
      });
    }

    try {
      return {
        stats: {
          completedCount,
          estimatedDrills: totalDiamonds,
          startedCount,
          inProgressCount: inProgressProjects?.length || 0,
          totalDiamonds,
        },
        inProgressProjects: (inProgressProjects || []).slice(0, 3), // Safely limit to 3 projects
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return { stats: defaultStats, inProgressProjects: [] };
    }
  }, [projects]); // Only depend on projects array
}
