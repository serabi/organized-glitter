import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { createLogger } from '@/utils/logger';
import { DashboardStats, StatusBreakdown } from '@/types/dashboard';

const logger = createLogger('statsService');

export async function calculateDashboardStats(
  userId: string,
  year: number
): Promise<DashboardStats> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  logger.debug(
    `🔍 Starting dashboard stats calculation for user ${userId}, year ${year} using count-based queries`
  );

  try {
    const statusCountPromises = [
      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "wishlist"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'wishlist', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "purchased"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'purchased', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "stash"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'stash', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "progress"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'progress', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "completed"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'completed', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "archived"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'archived', count: result.totalItems })),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter('user = {:userId} && status = "destashed"', { userId }),
          skipTotal: false,
        })
        .then(result => ({ status: 'destashed', count: result.totalItems })),
    ];

    const yearSpecificPromises = [
      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter(
            'user = {:userId} && status = "completed" && date_completed >= {:yearStart} && date_completed < {:yearEnd}',
            { userId, yearStart, yearEnd }
          ),
          skipTotal: false,
        })
        .then(result => result.totalItems),

      pb
        .collection(Collections.Projects)
        .getList(1, 1, {
          filter: pb.filter(
            'user = {:userId} && date_started >= {:yearStart} && date_started < {:yearEnd}',
            { userId, yearStart, yearEnd }
          ),
          skipTotal: false,
        })
        .then(result => result.totalItems),

      pb.collection(Collections.Projects).getFullList({
        filter: pb.filter(
          'user = {:userId} && status = "completed" && date_completed >= {:yearStart} && date_completed < {:yearEnd}',
          { userId, yearStart, yearEnd }
        ),
        fields: 'total_diamonds',
        requestKey: `dashboard-diamonds-${userId}-${year}`,
      }),

      pb.collection(Collections.Projects).getFullList({
        filter: pb.filter('user = {:userId} && date_completed != ""', { userId }),
        fields: 'date_completed',
        requestKey: `dashboard-years-${userId}`,
      }),
    ];

    const [statusCounts, yearSpecificResults] = await Promise.all([
      Promise.all(statusCountPromises),
      Promise.all(yearSpecificPromises),
    ]);

    const completedThisYear = yearSpecificResults[0] as number;
    const startedThisYear = yearSpecificResults[1] as number;
    const completedProjectsThisYear = yearSpecificResults[2] as Array<{ total_diamonds?: number }>;
    const projectsWithDates = yearSpecificResults[3] as Array<{ date_completed?: string }>;

    const statusBreakdown: StatusBreakdown = {
      wishlist: 0,
      purchased: 0,
      stash: 0,
      progress: 0,
      completed: 0,
      archived: 0,
      destashed: 0,
    };

    for (const { status, count } of statusCounts) {
      statusBreakdown[status as keyof StatusBreakdown] = count;
    }

    const totalDiamonds = completedProjectsThisYear.reduce(
      (sum, project) => sum + (project.total_diamonds || 0),
      0
    );

    const completionYears = new Set<number>();
    for (const project of projectsWithDates) {
      if (project.date_completed && project.date_completed.trim() !== '') {
        try {
          const completionYear = new Date(project.date_completed).getFullYear();
          if (completionYear >= 1900 && completionYear <= 2100) {
            completionYears.add(completionYear);
          }
        } catch {
          // Invalid date, skip
        }
      }
    }

    const availableYears = Array.from(completionYears).sort((a, b) => b - a);

    const stats: DashboardStats = {
      completed_count: completedThisYear,
      started_count: startedThisYear,
      in_progress_count: statusBreakdown.progress,
      total_diamonds: totalDiamonds,
      estimated_drills: totalDiamonds,
      status_breakdown: statusBreakdown,
      available_years: availableYears,
    };

    return stats;
  } catch (error) {
    logger.error('Failed to calculate dashboard stats:', error);
    throw error;
  }
}
