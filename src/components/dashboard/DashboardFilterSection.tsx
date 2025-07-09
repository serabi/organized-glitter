/**
 * Dashboard filter section - simplified with context architecture
 * @author @serabi
 * @created 2025-07-09
 */

import React from 'react';
import CollapsibleDashboardFilters from '@/components/dashboard/CollapsibleDashboardFilters';
import DashboardFilters from '@/components/dashboard/DashboardFilters';

interface DashboardFilterSectionProps {
  isMobile: boolean;
}

const DashboardFilterSectionComponent: React.FC<DashboardFilterSectionProps> = ({ isMobile }) => {
  if (isMobile) {
    return <CollapsibleDashboardFilters />;
  } else {
    // Desktop filters with layout wrapper
    return (
      <div className="hidden lg:col-span-1 lg:block">
        <DashboardFilters />
      </div>
    );
  }
};

export default React.memo(DashboardFilterSectionComponent);
