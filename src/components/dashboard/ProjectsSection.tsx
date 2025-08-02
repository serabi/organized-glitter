import React from 'react';
import ProjectsGrid from '@/components/dashboard/ProjectsGrid';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/hooks/useAuth';
import { useFilterStateOnly } from '@/contexts/filterIndex';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProjectsSection');

const ProjectsSectionComponent = () => {
  const { user } = useAuth();
  const { filters, debouncedSearchTerm, isInitialized } = useFilterStateOnly();

  // Single shared dashboard data call to prevent duplicate useProjects calls
  // Only fetch data once filter initialization is complete
  const dashboardData = useDashboardData(
    user?.id || 'guest',
    filters,
    debouncedSearchTerm,
    isInitialized
  );

  // Log when dashboard data is fetched
  React.useEffect(() => {
    logger.debug('ProjectsSection dashboard data updated:', {
      projectsCount: dashboardData.projects.length,
      totalItems: dashboardData.totalItems,
      isLoading: dashboardData.isLoadingProjects,
      userId: user?.id,
    });
  }, [
    dashboardData.projects.length,
    dashboardData.totalItems,
    dashboardData.isLoadingProjects,
    user?.id,
  ]);

  return (
    <div className="space-y-6 lg:col-span-3">
      {dashboardData.errorProjects && (
        <div className="rounded-md border border-red-500 p-4 text-red-500">
          <p>Error loading projects: {dashboardData.errorProjects.message}</p>
          <p>Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      )}

      <ProjectsGrid dashboardData={dashboardData} />
      {/* Dashboard data passed as props to avoid duplicate calls */}
    </div>
  );
};

export default React.memo(ProjectsSectionComponent);
