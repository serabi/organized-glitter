import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardFilterSection from '@/components/dashboard/DashboardFilterSection';
import ProjectsSection from '@/components/dashboard/ProjectsSection';
import { useIsMobile } from '@/hooks/use-mobile';
import withAuthentication from '@/components/auth/withAuthentication';
import { DashboardFiltersProvider } from '@/contexts/DashboardFiltersContext';
import { useDashboardFiltersContext } from '@/hooks/useDashboardFiltersContext';

// Removed LoadingState component - no longer needed after removing artificial delay

const DashboardInternal: React.FC = () => {
  const isMobile = useIsMobile();
  const { errorProjects } = useDashboardFiltersContext();

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

const Dashboard = withAuthentication(({ user }) => (
  <DashboardFiltersProvider user={user}>
    <DashboardInternal />
  </DashboardFiltersProvider>
));

export default Dashboard;
