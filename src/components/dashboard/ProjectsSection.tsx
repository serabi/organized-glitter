import React from 'react';
import StatusTabs from '@/components/dashboard/StatusTabs';
import ProjectsGrid from '@/components/dashboard/ProjectsGrid';
// ProjectFilterStatus import removed as it was unused. ProjectType also no longer needed as prop.

const ProjectsSectionComponent = () => {
  // No need to consume context here, children will do it.
  return (
    <div className="space-y-6 lg:col-span-3">
      <StatusTabs />
      {/* activeStatus and onStatusChange are now sourced from context within StatusTabs */}

      <ProjectsGrid />
      {/* All props are now sourced from context within ProjectsGrid */}
    </div>
  );
};

export default React.memo(ProjectsSectionComponent);
