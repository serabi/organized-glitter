import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProjectCard from '@/components/dashboard/ProjectCard';
import { ProjectType } from '@/types/project'; // Still needed for ProjectCard and internal logic
import { Separator } from '@/components/ui/separator';
import { useDashboardFiltersContext } from '@/hooks/useDashboardFiltersContext'; // Import context hook
import ProjectPagination from '@/components/ui/ProjectPagination';
import { useNavigateToProject, createNavigationContext } from '@/hooks/useNavigateToProject';
import { useRecentlyEdited } from '@/pages/Dashboard';

// Interface ProjectsGridProps removed as it's no longer needed.
// All data is sourced from DashboardFiltersContext.

const ProjectsGridComponent = () => {
  // Removed unused props
  const navigate = useNavigate();
  const navigateToProject = useNavigateToProject();
  const dashboardContext = useDashboardFiltersContext();
  const { recentlyEditedProjectId } = useRecentlyEdited();
  const {
    isLoadingProjects: loading, // Use from context
    processedAndPaginatedProjects: projects, // Use paginated projects instead
    viewType, // Use from context
    searchTerm, // Use from context
    sortField, // Use from context
    resetAllFilters, // Use from context
    dynamicSeparatorProps,
    // Pagination props
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    setCurrentPage,
    setPageSize,
  } = dashboardContext;

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

  // Handle project card click with navigation context
  const handleProjectClick = React.useCallback(
    async (project: ProjectType) => {
      // Create navigation context to preserve dashboard state
      const navigationContext = createNavigationContext(dashboardContext);
      
      // Navigate using enhanced navigation hook
      await navigateToProject(project.id, {
        navigationContext,
        showLoadingFeedback: false, // Keep navigation snappy
      });
    },
    [navigateToProject, dashboardContext]
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
        <p className="text-muted-foreground">No projects match your current filters.</p>
        <Button variant="outline" onClick={resetAllFilters} className="mt-2">
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
    let dividerInserted = false;
    const elements: JSX.Element[] = [];

    projects.forEach((project: ProjectType) => {
      if (
        isCurrentSortDateBased &&
        currentSortDatePropertyKey &&
        currentSortDateFriendlyName &&
        countOfItemsWithoutCurrentSortDate &&
        countOfItemsWithoutCurrentSortDate > 0 &&
        countOfItemsWithoutCurrentSortDate < projects.length && // Ensures items in both groups
        !project[currentSortDatePropertyKey] && // Current project lacks the specific date
        !dividerInserted
      ) {
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
        dividerInserted = true;
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

      {!loading && totalPages > 1 && (
        <ProjectPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
};

export default React.memo(ProjectsGridComponent);
