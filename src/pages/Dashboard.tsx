import React, { useEffect, useState, createContext, useContext } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardFilterSection from '@/components/dashboard/DashboardFilterSection';
import ProjectsSection from '@/components/dashboard/ProjectsSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { DashboardFiltersProvider } from '@/contexts/DashboardFiltersContext';
import { useDashboardFiltersContext } from '@/hooks/useDashboardFiltersContext';
import { NavigationContext } from '@/hooks/useNavigateToProject';
import { useNavigationFallback } from '@/hooks/queries/useNavigationFallback';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { errorProjects } = useDashboardFiltersContext();
  const { setRecentlyEditedProjectId } = useRecentlyEdited();
  const { user } = useAuth();
  
  // Get fallback navigation context from database for filter restoration
  const { navigationContext: fallbackContext, isLoadingFallback } = useNavigationFallback({ 
    userId: user?.id 
  });

  // Check for edit return state in location
  const editReturnState = location.state as {
    fromEdit?: boolean;
    editedProjectId?: string;
    editedProjectData?: unknown;
    timestamp?: number;
    navigationContext?: NavigationContext;
    preservePosition?: boolean;
  } | null;

  // Check if we need to restore filters from database (no router state)
  useEffect(() => {
    // Only apply fallback if:
    // 1. No edit return state (not returning from project edit)
    // 2. No search params in URL (fresh dashboard load)
    // 3. We have fallback context from database
    // 4. Not currently loading fallback data
    const hasEditReturnState = location.state?.fromEdit;
    const hasUrlParams = searchParams.toString().length > 0;
    
    if (!hasEditReturnState && !hasUrlParams && fallbackContext && !isLoadingFallback) {
      logger.info('🔄 Restoring dashboard filters from database fallback');
      
      try {
        const newSearchParams = new URLSearchParams();
        
        // Apply saved filter state
        if (fallbackContext.filters.status !== 'all') {
          newSearchParams.set('status', fallbackContext.filters.status);
        }
        if (fallbackContext.filters.company !== 'all') {
          newSearchParams.set('company', fallbackContext.filters.company);
        }
        if (fallbackContext.filters.artist !== 'all') {
          newSearchParams.set('artist', fallbackContext.filters.artist);
        }
        if (fallbackContext.filters.drillShape !== 'all') {
          newSearchParams.set('drillShape', fallbackContext.filters.drillShape);
        }
        if (fallbackContext.filters.yearFinished !== 'all') {
          newSearchParams.set('yearFinished', fallbackContext.filters.yearFinished);
        }
        if (!fallbackContext.filters.includeMiniKits) {
          newSearchParams.set('includeMiniKits', 'false');
        }
        if (fallbackContext.filters.searchTerm) {
          newSearchParams.set('search', fallbackContext.filters.searchTerm);
        }
        if (fallbackContext.filters.selectedTags?.length > 0) {
          newSearchParams.set('tags', fallbackContext.filters.selectedTags.join(','));
        }
        
        // Apply saved sort state
        if (fallbackContext.sortField !== 'last_updated') {
          newSearchParams.set('sort', fallbackContext.sortField);
        }
        if (fallbackContext.sortDirection !== 'desc') {
          newSearchParams.set('sortDirection', fallbackContext.sortDirection);
        }
        
        // Apply saved pagination
        if (fallbackContext.currentPage !== 1) {
          newSearchParams.set('page', fallbackContext.currentPage.toString());
        }
        if (fallbackContext.pageSize !== 25) {
          newSearchParams.set('pageSize', fallbackContext.pageSize.toString());
        }
        
        // Update URL to trigger filter restoration
        setSearchParams(newSearchParams, { replace: true });
        
        logger.info('✅ Dashboard filters restored from database');
      } catch (error) {
        logger.error('❌ Error restoring dashboard filters from database:', error);
      }
    }
  }, [location.state, searchParams, fallbackContext, isLoadingFallback, setSearchParams]);

  // Handle position restoration after edit return
  useEffect(() => {
    if (editReturnState?.fromEdit && editReturnState?.preservePosition && editReturnState?.navigationContext) {
      logger.info('🔄 Processing edit return with position restoration');
      
      const { navigationContext } = editReturnState;
      
      try {
        // 1. Restore filters and pagination via URL parameters
        const newSearchParams = new URLSearchParams();
        
        // Restore filter state
        if (navigationContext.filters.status !== 'all') {
          newSearchParams.set('status', navigationContext.filters.status);
        }
        if (navigationContext.filters.company !== 'all') {
          newSearchParams.set('company', navigationContext.filters.company);
        }
        if (navigationContext.filters.artist !== 'all') {
          newSearchParams.set('artist', navigationContext.filters.artist);
        }
        if (navigationContext.filters.drillShape !== 'all') {
          newSearchParams.set('drillShape', navigationContext.filters.drillShape);
        }
        if (navigationContext.filters.yearFinished !== 'all') {
          newSearchParams.set('yearFinished', navigationContext.filters.yearFinished);
        }
        if (!navigationContext.filters.includeMiniKits) {
          newSearchParams.set('includeMiniKits', 'false');
        }
        if (navigationContext.filters.searchTerm) {
          newSearchParams.set('search', navigationContext.filters.searchTerm);
        }
        if (navigationContext.filters.selectedTags?.length > 0) {
          newSearchParams.set('tags', navigationContext.filters.selectedTags.join(','));
        }
        
        // Restore sort state
        if (navigationContext.sortField !== 'last_updated') {
          newSearchParams.set('sort', navigationContext.sortField);
        }
        if (navigationContext.sortDirection !== 'desc') {
          newSearchParams.set('sortDirection', navigationContext.sortDirection);
        }
        
        // Restore pagination
        if (navigationContext.currentPage !== 1) {
          newSearchParams.set('page', navigationContext.currentPage.toString());
        }
        if (navigationContext.pageSize !== 25) {
          newSearchParams.set('pageSize', navigationContext.pageSize.toString());
        }
        
        // Update URL parameters to trigger filter restoration
        setSearchParams(newSearchParams, { replace: true });
        
        // 2. Schedule scroll position restoration after React renders
        const scrollPosition = navigationContext.preservationContext?.scrollPosition || 0;
        setTimeout(() => {
          window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
          logger.debug('Scroll position restored to:', scrollPosition);
        }, 100);
        
        // 3. Mark recently edited project for visual highlighting
        if (editReturnState.editedProjectId) {
          setRecentlyEditedProjectId(editReturnState.editedProjectId);
          
          // Clear the highlight after 3 seconds
          setTimeout(() => {
            setRecentlyEditedProjectId(null);
          }, 3000);
        }
        
        // 4. Show user feedback
        toast({
          title: 'Position Restored',
          description: 'Returned to your previous location after editing.',
        });
        
        // 5. Clear location state to prevent re-triggering
        navigate(location.pathname + location.search, { 
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
  }, [editReturnState, navigate, location.pathname, location.search, setSearchParams, toast]);

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
