import { ProjectType } from '@/types/project';

interface OverviewStats {
  completedCount: number;
  estimatedDrills: number;
  startedCount: number;
  inProgressCount: number;
  totalDiamonds: number;
}

/**
 * Calculate the total number of diamonds from completed projects
 * @param projects - Array of completed projects
 * @returns Total diamond count
 */
function calculateTotalDiamonds(projects: ProjectType[]): number {
  let totalDiamonds = 0;
  projects.forEach(project => {
    if (project.totalDiamonds) {
      const diamonds = project.totalDiamonds.toString();
      totalDiamonds += diamonds ? parseInt(diamonds.replace(/[^0-9]/g, '')) || 0 : 0;
    }
  });
  return totalDiamonds;
}

/**
 * Filter projects by year based on date completed
 * @param projects - Array of projects
 * @param year - Year to filter by
 * @returns Filtered projects
 */
function filterProjectsByCompletedYear(projects: ProjectType[], year: number): ProjectType[] {
  return projects.filter(project => {
    const completedDate = project.dateCompleted ? new Date(project.dateCompleted) : null;
    return completedDate && completedDate.getFullYear() === year;
  });
}

/**
 * Filter projects by year based on date started
 * @param projects - Array of projects
 * @param year - Year to filter by
 * @returns Filtered projects
 */
function filterProjectsByStartedYear(projects: ProjectType[], year: number): ProjectType[] {
  return projects.filter(project => {
    const startedDate = project.dateStarted ? new Date(project.dateStarted) : null;
    return startedDate && startedDate.getFullYear() === year;
  });
}

/**
 * Calculate overview statistics for the current year
 * @param projects - Array of all projects
 * @returns Overview statistics object
 */
export function calculateOverviewStats(projects: ProjectType[] | null | undefined): {
  stats: OverviewStats;
  inProgressProjects: ProjectType[];
} {
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

  // Filter projects for current year
  const projectsCompletedThisYear = filterProjectsByCompletedYear(projects, currentYear);
  const projectsStartedThisYear = filterProjectsByStartedYear(projects, currentYear);

  // Debug log for completed projects
  console.log(
    'Completed projects this year:',
    projectsCompletedThisYear.map(p => ({
      id: p.id,
      title: p.title,
      totalDiamonds: p.totalDiamonds,
      type: typeof p.totalDiamonds,
    }))
  );

  // Calculate stats
  const completedCount = projectsCompletedThisYear.length;
  const startedCount = projectsStartedThisYear.length;
  const totalDiamonds = calculateTotalDiamonds(projectsCompletedThisYear);

  // Get in-progress projects
  const inProgressProjects = projects.filter(project => project.status === 'progress');

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
}
