import React from 'react';
import { ProjectType } from '@/types/project';

interface AdvancedEditSummaryProps {
  totalItems: number;
  paginatedProjects: ProjectType[];
}

/**
 * Summary component for the Advanced Edit page
 * Shows results count
 */
export const AdvancedEditSummary: React.FC<AdvancedEditSummaryProps> = ({
  totalItems,
  paginatedProjects,
}) => {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Showing {paginatedProjects.length} of {totalItems} project{totalItems !== 1 ? 's' : ''}
      </span>
    </div>
  );
};
