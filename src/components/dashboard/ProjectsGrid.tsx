/**
 * @fileoverview Projects Grid Component with Smart Date Separators
 *
 * This component renders the main grid/list view of projects with intelligent sorting
 * and visual separators. It handles both grid and list layouts with responsive design
 * and provides pagination controls for large project collections.
 *
 * Key Features:
 * - Responsive grid layout (1-3 columns based on screen size)
 * - Smart date-based separators for chronological sorting
 * - Recently edited project highlighting
 * - Loading states with skeleton placeholders
 * - Empty state with filter reset option
 * - Integrated pagination controls
 * - Memorized rendering for performance
 *
 * Date Separator Logic:
 * - Automatically detects date-based sorting fields
 * - Inserts separators between dated and undated projects
 * - Shows count of projects without the relevant date
 * - Adapts separator labels to current sort field
 *
 * State Management:
 * - Consumes all data from DashboardFiltersContext
 * - Handles project click navigation with context preservation
 * - Integrates with recently edited highlighting system
 *
 * @author serabi
 * @since 2025-07-03
 * @version 1.0.0 - Context-based grid with smart separators
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import ProjectCard from '@/components/dashboard/ProjectCard';
import { ProjectType } from '@/types/project'; // Still needed for ProjectCard and internal logic
import { Separator } from '@/components/ui/separator';
import { useFilters } from '@/contexts/FilterProvider';
// import { useDashboardData } from '@/hooks/useDashboardData'; // Now passed as prop
import { useDynamicSeparatorProps } from '@/hooks/useDynamicSeparatorProps';
import { useAuth } from '@/hooks/useAuth';
import ProjectPagination from '@/components/ui/ProjectPagination';
import { useNavigateToProject } from '@/hooks/useNavigateToProject';
import { useRecentlyEdited } from '@/contexts/RecentlyEditedContext';
import { secureLogger } from '@/utils/secureLogger';
import { useTabAwareErrorMessage } from '@/hooks/useTabAwareErrorMessage';

// Interface for ProjectsGrid props - now accepts dashboard data to prevent duplicate calls
interface ProjectsGridProps {
  dashboardData: {
    projects: ProjectType[];
    totalItems: number;
    totalPages: number;
    isLoadingProjects: boolean;
    errorProjects: Error | null;
    refetchProjects: () => void;
  };
}

const ProjectsGridComponent: React.FC<ProjectsGridProps> = ({ dashboardData }) => {
  const navigateToProject = useNavigateToProject();
  const { user } = useAuth();
  const { recentlyEditedProjectId } = useRecentlyEdited();
  const { filters, debouncedSearchTerm, resetAllFilters, updatePage, updatePageSize } =
    useFilters();

  // Get dynamic error message based on active tab
  const tabAwareErrorMessage = useTabAwareErrorMessage();

  // Dashboard data is now passed as prop to avoid duplicate useProjects calls
  const { projects, isLoadingProjects: loading, totalItems, totalPages } = dashboardData;

  // Extract individual properties from filters
  const viewType = filters.viewType;
  const searchTerm = filters.searchTerm;
  const sortField = filters.sortField;
  const currentPage = filters.currentPage;
  const pageSize = filters.pageSize;

  // Compute dynamic separator props
  const dynamicSeparatorProps = useDynamicSeparatorProps(filters.sortField, projects);

  // Debug log: print all project statuses in the grid for the Purchased section
  React.useEffect(() => {
    if (filters.activeStatus === 'purchased' && !loading) {
      secureLogger.debug(
        '[Debug] Projects rendered in Purchased section:',
        projects.map(p => ({ id: p.id, status: p.status, title: p.title }))
      );
    }
  }, [filters.activeStatus, loading, projects]);

  // Debug log: pagination visibility debugging
  React.useEffect(() => {
    secureLogger.debug('🔍 Pagination Debug:', {
      loading,
      totalItems,
      totalPages,
      currentPage,
      pageSize,
      projectsLength: projects.length,
      paginationCondition: !loading && totalItems > 0,
      willShowPagination: !loading && totalItems > 0,
    });
  }, [loading, totalItems, totalPages, currentPage, pageSize, projects.length]);

  // Debug log: Track data source and query params
  React.useEffect(() => {
    secureLogger.debug('📊 ProjectsGrid Data Source Debug:', {
      userId: user?.id,
      dashboardDataResult: {
        projects: projects.length,
        totalItems,
        totalPages,
        loading,
        currentPage,
        pageSize,
      },
      filtersContext: {
        activeStatus: filters.activeStatus,
        searchTerm: filters.searchTerm,
        debouncedSearchTerm,
        sortField: filters.sortField,
        sortDirection: filters.sortDirection,
        selectedCompany: filters.selectedCompany,
        selectedArtist: filters.selectedArtist,
        selectedDrillShape: filters.selectedDrillShape,
        selectedYearFinished: filters.selectedYearFinished,
        includeMiniKits: filters.includeMiniKits,
        includeDestashed: filters.includeDestashed,
        includeArchived: filters.includeArchived,
        selectedTags: filters.selectedTags,
      },
      expectedQueryKey: `projects.list(${user?.id}, filters=${JSON.stringify({
        status: filters.activeStatus,
        company: filters.selectedCompany,
        artist: filters.selectedArtist,
        drillShape: filters.selectedDrillShape,
        yearFinished: filters.selectedYearFinished,
        includeMiniKits: filters.includeMiniKits,
        includeDestashed: filters.includeDestashed,
        includeArchived: filters.includeArchived,
        searchTerm: debouncedSearchTerm,
        selectedTags: filters.selectedTags,
      })}, sort=${filters.sortField}:${filters.sortDirection}, page=${currentPage}, size=${pageSize})`,
      firstThreeProjects: projects
        .slice(0, 3)
        .map(p => ({ id: p.id, title: p.title, status: p.status })),
      uniqueStatuses: [...new Set(projects.map(p => p.status))],
      timestamp: new Date().toISOString(),
    });
  }, [
    user?.id,
    projects,
    totalItems,
    totalPages,
    loading,
    currentPage,
    pageSize,
    filters,
    debouncedSearchTerm,
  ]);

  const {
    isCurrentSortDateBased,
    currentSortDateFriendlyName,
    currentSortDatePropertyKey,
    countOfItemsWithoutCurrentSortDate,
  } = dynamicSeparatorProps;

  // Track projects grid render with different states
  React.useEffect(() => {
    if (!loading) {
      // addBreadcrumb removed
    }
  }, [loading, projects.length, viewType, searchTerm, sortField]); // Changed sortBy to sortField

  // Handle project card click with simple navigation
  const handleProjectClick = React.useCallback(
    (project: ProjectType) => {
      // Simple navigation - dashboard filters will be saved automatically on navigation
      navigateToProject(project.id);
    },
    [navigateToProject]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse overflow-hidden rounded-lg bg-white shadow-md">
            <div className="h-48 bg-gray-200" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-200" />
              <div className="mt-4 h-8 w-full rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0 && !loading) {
    // Condition updated as per task, though !loading is implicit due to prior check
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">{tabAwareErrorMessage}</p>
        <Button variant="outline" onClick={() => resetAllFilters('user')} className="mt-2">
          Clear Filters
        </Button>
      </div>
    );
  }

  // If projects.length is 0 but it's not due to filters (e.g. no projects at all and no search term)
  // The original empty state might be desired. However, the task specifies this new UI
  // for `filteredProjects.length === 0 && !loading`.
  // For now, adhering strictly to the task, the old empty state for "no projects at all" is removed.
  // If a distinction is needed, further logic would be required here.

  const renderProjectsWithDivider = () => {
    const elements: JSX.Element[] = [];

    // Calculate the separator position before rendering
    let separatorIndex = -1;
    if (
      isCurrentSortDateBased &&
      currentSortDatePropertyKey &&
      currentSortDateFriendlyName &&
      countOfItemsWithoutCurrentSortDate &&
      countOfItemsWithoutCurrentSortDate > 0 &&
      countOfItemsWithoutCurrentSortDate < projects.length
    ) {
      // Find the first project without the date - this is where separator should go
      separatorIndex = projects.findIndex(project => !project[currentSortDatePropertyKey]);
    }

    projects.forEach((project: ProjectType, index: number) => {
      // Insert separator before the first undated project
      if (separatorIndex === index) {
        elements.push(
          <Separator
            key={`separator-${currentSortDatePropertyKey}`}
            className="col-span-full my-4" // Ensure separator spans full width in grid
          />
        );
        elements.push(
          <h4
            key={`message-${currentSortDatePropertyKey}`}
            className="col-span-full mb-4 text-lg font-medium text-card-foreground" // Ensure message spans full width and styled as subheading
          >
            Kits with no {currentSortDateFriendlyName} ({countOfItemsWithoutCurrentSortDate} kits):
          </h4>
        );
      }

      elements.push(
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => handleProjectClick(project)}
          isRecentlyEdited={project.id === recentlyEditedProjectId}
        />
      );
    });
    return elements;
  };

  return (
    <div className="space-y-6">
      <div
        className={
          viewType === 'grid' ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
        }
      >
        {renderProjectsWithDivider()}
      </div>

      {!loading && totalItems > 0 && (
        <ProjectPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={updatePage}
          onPageSizeChange={updatePageSize}
          disabled={totalPages <= 1}
        />
      )}
    </div>
  );
};

export default React.memo(ProjectsGridComponent);
