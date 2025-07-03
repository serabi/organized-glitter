/**
 * @fileoverview Dashboard page with database-only state management
 * 
 * Main dashboard page that displays user projects with comprehensive filtering,
 * sorting, and search capabilities. Uses database as the single source of truth
 * for all filter state, eliminating URL parameter synchronization complexity.
 * 
 * Key Features:
 * - Database-first filter state management (no URL dependencies)
 * - Automatic state restoration from database on page load
 * - Smooth position restoration after project editing
 * - Recently edited project visual highlighting
 * - Mobile-responsive layout with adaptive filter sections
 * 
 * State Management:
 * - All filter/sort/search state handled by DashboardFiltersContext
 * - Immediate auto-save to database prevents state loss
 * - Navigation context preserved for project detail arrows
 * - Edit return handling with scroll position restoration
 * 
 * @author serabi
 * @since 2025-07-02
 * @version 3.0.0 - Database-only implementation (simplified)
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardFilterSection from '@/components/dashboard/DashboardFilterSection';
import ProjectsSection from '@/components/dashboard/ProjectsSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { DashboardFiltersProvider, useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import { NavigationContext } from '@/hooks/useNavigateToProject';
import { createLogger } from '@/utils/secureLogger';
import { useToast } from '@/hooks/use-toast';

// Context for tracking recently edited projects
interface RecentlyEditedContextValue {
  recentlyEditedProjectId: string | null;
  setRecentlyEditedProjectId: (id: string | null) => void;
}

const RecentlyEditedContext = createContext<RecentlyEditedContextValue | undefined>(undefined);

export const useRecentlyEdited = () => {
  const context = useContext(RecentlyEditedContext);
  if (context === undefined) {
    throw new Error('useRecentlyEdited must be used within a RecentlyEditedProvider');
  }
  return context;
};

const logger = createLogger('Dashboard');

// Removed LoadingState component - no longer needed after removing artificial delay

const DashboardInternal: React.FC = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { errorProjects } = useDashboardFilters();
  const { setRecentlyEditedProjectId } = useRecentlyEdited();

  // Check for edit return state in location
  const editReturnState = location.state as {
    fromEdit?: boolean;
    editedProjectId?: string;
    editedProjectData?: unknown;
    timestamp?: number;
    navigationContext?: NavigationContext;
    preservePosition?: boolean;
  } | null;


  // Handle position restoration after edit return (database-only approach)
  useEffect(() => {
    if (editReturnState?.fromEdit && editReturnState?.preservePosition && editReturnState?.navigationContext) {
      logger.info('🔄 Processing edit return with position restoration');
      
      const { navigationContext } = editReturnState;
      
      try {
        // 1. Schedule scroll position restoration after React renders
        // Filter state restoration is handled automatically by DashboardFiltersContext from database
        const scrollPosition = navigationContext.preservationContext?.scrollPosition || 0;
        setTimeout(() => {
          window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
          logger.debug('Scroll position restored to:', scrollPosition);
        }, 100);
        
        // 2. Mark recently edited project for visual highlighting
        if (editReturnState.editedProjectId) {
          setRecentlyEditedProjectId(editReturnState.editedProjectId);
          
          // Clear the highlight after 3 seconds
          setTimeout(() => {
            setRecentlyEditedProjectId(null);
          }, 3000);
        }
        
        // 3. Show user feedback
        toast({
          title: 'Position Restored',
          description: 'Returned to your previous location after editing.',
        });
        
        // 4. Clear location state to prevent re-triggering
        navigate(location.pathname, { 
          replace: true, 
          state: null 
        });
        
        logger.info('✅ Position restoration completed successfully');
      } catch (error) {
        logger.error('❌ Error during position restoration:', error);
        toast({
          title: 'Restoration Issue',
          description: 'There was an issue restoring your previous position.',
          variant: 'destructive',
        });
      }
    }
  }, [editReturnState, navigate, location.pathname, toast, setRecentlyEditedProjectId]);

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
  const [recentlyEditedProjectId, setRecentlyEditedProjectId] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  return (
    <RecentlyEditedContext.Provider value={{ recentlyEditedProjectId, setRecentlyEditedProjectId }}>
      <DashboardFiltersProvider user={user}>
        <DashboardInternal />
      </DashboardFiltersProvider>
    </RecentlyEditedContext.Provider>
  );
};

export default Dashboard;
