import React from 'react';
import { Button } from '@/components/ui/button';
import { ProjectType } from '@/types/project';

interface AdvancedEditSummaryProps {
  totalItems: number;
  paginatedProjects: ProjectType[];
  selectedCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
}

/**
 * Summary component for the Advanced Edit page
 * Shows results count, selection info, and selection controls
 */
export const AdvancedEditSummary: React.FC<AdvancedEditSummaryProps> = ({
  totalItems,
  paginatedProjects,
  selectedCount,
  onClearSelection,
  onSelectAll,
}) => {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Showing {paginatedProjects.length} of {totalItems} project{totalItems !== 1 ? 's' : ''}
        {selectedCount > 0 && <span className="ml-2 font-medium">({selectedCount} selected)</span>}
      </span>
      <div className="flex items-center space-x-2">
        {selectedCount > 0 && (
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            Clear Selection
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onSelectAll}>
          Select All on Page
        </Button>
      </div>
    </div>
  );
};
