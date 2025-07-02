import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardFilterSection from '@/components/dashboard/DashboardFilterSection';
import ProjectsSection from '@/components/dashboard/ProjectsSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { DashboardFiltersProvider } from '@/contexts/DashboardFiltersContext';
import { useDashboardFiltersContext } from '@/hooks/useDashboardFiltersContext';
import { NavigationContext } from '@/hooks/useNavigateToProject';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('Dashboard');

// Removed LoadingState component - no longer needed after removing artificial delay

const DashboardInternal: React.FC = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { errorProjects } = useDashboardFiltersContext();

  // Check for edit return state in location
  const editReturnState = location.state as {
    fromEdit?: boolean;
    editedProjectId?: string;
    editedProjectData?: unknown;
    timestamp?: number;
    navigationContext?: NavigationContext;
    preservePosition?: boolean;
  } | null;

  // Handle position restoration after edit return
  useEffect(() => {
    if (editReturnState?.fromEdit && editReturnState?.preservePosition) {
      logger.debug('Processing edit return with position restoration:', editReturnState);
      
      // TODO: Implement position restoration logic here
      // This would involve:
      // 1. Restoring filters from navigationContext
      // 2. Restoring pagination state
      // 3. Scrolling to the preserved position
      // 4. Highlighting the recently edited project
      
      // For now, log the intention
      logger.info('Edit return detected - position restoration will be implemented in next iteration');
    }
  }, [editReturnState]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader />

        {isMobile && <DashboardFilterSection isMobile={isMobile} />}

        <div className={`grid grid-cols-1 ${!isMobile ? 'lg:grid-cols-4' : ''} mt-4 gap-8`}>
          {!isMobile && (
            <div className="lg:col-span-1">
              <DashboardFilterSection isMobile={isMobile} />
            </div>
          )}
          <div className={`${isMobile ? 'col-span-1' : 'lg:col-span-3'}`}>
            {errorProjects && (
              <div className="rounded-md border border-red-500 p-4 text-red-500">
                <p>Error loading projects: {errorProjects.message}</p>
                <p>Please try refreshing the page or contact support if the issue persists.</p>
              </div>
            )}
            <ProjectsSection />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <DashboardFiltersProvider user={user}>
      <DashboardInternal />
    </DashboardFiltersProvider>
  );
};

export default Dashboard;
