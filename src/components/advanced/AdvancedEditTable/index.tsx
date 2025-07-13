import React, { useCallback, useRef } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ProjectType } from '@/types/project';
import { useSorting } from '@/contexts/FilterHooks';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';

import { SortableHeader } from './components/SortableHeader';
import { LoadingState, EmptyState } from './components/LoadingState';
import { ProjectTableRow } from './components/ProjectTableRow';
import { AdvancedEditTableProps } from './types';

const AdvancedEditTable: React.FC<AdvancedEditTableProps> = ({
  projects,
  loading,
  showImages,
  availableCompanies = [],
  availableArtists = [],
}) => {
  // Use server-side sorting from FilterProvider
  const { sortField, sortDirection, updateSort } = useSorting();

  // Refs for scroll synchronization - using ScrollArea viewport refs
  const topScrollRef = useRef<React.ElementRef<typeof ScrollArea>>(null);
  const bottomScrollRef = useRef<React.ElementRef<typeof ScrollArea>>(null);

  // Scroll synchronization disabled - caused navigation issues
  // TODO: Re-implement with simpler approach if needed

  // Scroll synchronization disabled - caused navigation issues
  // TODO: Re-implement with simpler approach if needed

  // Handle column header click for sorting
  const handleSort = useCallback(
    (key: string) => {
      // Map the sort key to dashboard sort field
      const sortKeyMapping: Record<string, DashboardValidSortField> = {
        title: 'kit_name',
        company: 'company',
        artist: 'artist',
        status: 'status',
        width: 'width',
        height: 'height',
        kit_category: 'kit_category',
        drillShape: 'drill_shape',
        datePurchased: 'date_purchased',
        dateReceived: 'date_received',
        dateStarted: 'date_started',
        dateCompleted: 'date_finished',
      };

      const dashboardSortField = sortKeyMapping[key] || 'last_updated';

      if (sortField === dashboardSortField) {
        // Toggle direction if clicking the same column
        updateSort(dashboardSortField, sortDirection === 'asc' ? 'desc' : 'asc', 'user');
      } else {
        // Default to ascending order for a new column
        updateSort(dashboardSortField, 'asc', 'user');
      }
    },
    [sortField, sortDirection, updateSort]
  );

  if (loading) {
    return <LoadingState />;
  }

  if (!projects.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Top horizontal scrollbar */}
      <div className="relative">
        <ScrollArea
          ref={topScrollRef}
          className="w-full rounded-md border border-border/50 bg-muted/20"
        >
          <div className="h-4 min-w-[1600px]"></div>
          <ScrollBar orientation="horizontal" className="h-4" />
        </ScrollArea>
      </div>

      {/* Main table with horizontal-only scrolling */}
      <div className="w-full overflow-x-auto rounded-md border border-border/50">
        <Table className="min-w-[1600px]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="w-[200px] min-w-[200px] max-w-[200px] text-center">
                <SortableHeader
                  label="Title"
                  sortKey="title"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[140px] min-w-[140px] max-w-[140px] text-center">
                <SortableHeader
                  label="Company"
                  sortKey="company"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center">
                <SortableHeader
                  label="Artist"
                  sortKey="artist"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center">
                <SortableHeader
                  label="Status"
                  sortKey="status"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[90px] text-center">
                <SortableHeader
                  label="Width"
                  sortKey="width"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[90px] text-center">
                <SortableHeader
                  label="Height"
                  sortKey="height"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center">
                <SortableHeader
                  label="Type"
                  sortKey="kit_category"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center">
                <SortableHeader
                  label="Shape"
                  sortKey="drillShape"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center">
                <SortableHeader
                  label="Purchased"
                  sortKey="datePurchased"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center">
                <SortableHeader
                  label="Received"
                  sortKey="dateReceived"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center">
                <SortableHeader
                  label="Started"
                  sortKey="dateStarted"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="min-w-[120px] text-center">
                <SortableHeader
                  label="Completed"
                  sortKey="dateCompleted"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map(project => (
              <ProjectTableRow
                key={project.id}
                project={project}
                showImages={showImages}
                availableCompanies={availableCompanies}
                availableArtists={availableArtists}
                showActions={true}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bottom horizontal scrollbar */}
      <div className="relative">
        <ScrollArea
          ref={bottomScrollRef}
          className="w-full rounded-md border border-border/50 bg-muted/20"
        >
          <div className="h-4 min-w-[1600px]"></div>
          <ScrollBar orientation="horizontal" className="h-4" />
        </ScrollArea>
      </div>
    </div>
  );
};

export default React.memo(AdvancedEditTable);
