import React, { useCallback, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ProjectType } from '@/types/project';
import { useSorting } from '@/contexts/FilterHooks';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';

import { useEditingState } from './hooks/useEditingState';
import { SortableHeader } from './components/SortableHeader';
import { BulkActionsToolbar } from './components/BulkActionsToolbar';
import { LoadingState, EmptyState } from './components/LoadingState';
import { ProjectTableRow } from './components/ProjectTableRow';
import { AdvancedEditTableProps } from './types';
import { isDateField, getBackendFieldName } from './constants';

const AdvancedEditTable: React.FC<AdvancedEditTableProps> = ({
  projects,
  loading,
  showImages,
  selectedProjects,
  onSelectProject,
  onSelectAll,
  onProjectUpdate,
  onBulkDelete,
  availableCompanies = [],
  availableArtists = [],
  availableTags = [],
}) => {
  // Use server-side sorting from FilterProvider
  const { sortField, sortDirection, updateSort } = useSorting();
  const {
    editingCell,
    editValue,
    originalValue,
    setEditValue,
    startEditing,
    cancelEdit,
    clearEdit,
  } = useEditingState();

  // Refs for scroll synchronization - using ScrollArea viewport refs
  const topScrollRef = useRef<React.ElementRef<typeof ScrollArea>>(null);
  const tableScrollRef = useRef<React.ElementRef<typeof ScrollArea>>(null);
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
        tags: 'last_updated', // Special case: tags are complex relations, use last_updated
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
        updateSort(dashboardSortField, sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        // Default to ascending order for a new column
        updateSort(dashboardSortField, 'asc');
      }
    },
    [sortField, sortDirection, updateSort]
  );

  const saveEdit = useCallback(
    (projectId: string, field: string) => {
      // Only save if the value has actually changed
      if (editValue === originalValue) {
        clearEdit();
        return;
      }

      const updates: Record<string, unknown> = {};

      // Handle different field types with consistent structure
      // Use camelCase internally, then convert to backend field names
      if (field === 'status') {
        updates.status = editValue as ProjectType['status'];
      } else if (field === 'width' || field === 'height') {
        const numValue = parseInt(editValue);
        if (!isNaN(numValue)) {
          updates[field] = numValue;
        }
      } else if (field === 'kit_category') {
        // This field is already snake_case in backend, no mapping needed
        updates.kit_category = editValue as 'full' | 'mini';
      } else if (field === 'drillShape') {
        // Map camelCase to snake_case for backend
        const backendField = getBackendFieldName('drillShape');
        updates[backendField] = editValue as 'round' | 'square';
      } else if (field === 'company') {
        // Map company name to ID for PocketBase foreign key
        const company = availableCompanies?.find(c => c.name === editValue);
        updates.company = company?.id || undefined;
      } else if (field === 'artist') {
        // Map artist name to ID for PocketBase foreign key
        const artist = availableArtists?.find(a => a.name === editValue);
        updates.artist = artist?.id || undefined;
      } else if (field === 'title') {
        updates.title = editValue;
      } else if (field === 'generalNotes') {
        // Map camelCase to snake_case for backend
        const backendField = getBackendFieldName('generalNotes');
        updates[backendField] = editValue || undefined;
      } else if (field === 'sourceUrl') {
        // Map camelCase to snake_case for backend
        const backendField = getBackendFieldName('sourceUrl');
        updates[backendField] = editValue || undefined;
      } else if (field === 'totalDiamonds') {
        const numValue = parseInt(editValue);
        if (!isNaN(numValue)) {
          // Map camelCase to snake_case for backend
          const backendField = getBackendFieldName('totalDiamonds');
          updates[backendField] = numValue;
        }
      } else if (isDateField(field)) {
        // Handle date fields with consistent typing and backend field mapping
        if (field === 'datePurchased') {
          const backendField = getBackendFieldName('datePurchased');
          updates[backendField] = editValue || undefined;
        } else if (field === 'dateReceived') {
          const backendField = getBackendFieldName('dateReceived');
          updates[backendField] = editValue || undefined;
        } else if (field === 'dateStarted') {
          const backendField = getBackendFieldName('dateStarted');
          updates[backendField] = editValue || undefined;
        } else if (field === 'dateCompleted') {
          const backendField = getBackendFieldName('dateCompleted');
          updates[backendField] = editValue || undefined;
        }
      }

      onProjectUpdate(projectId, updates);
      clearEdit();
    },
    [editValue, originalValue, onProjectUpdate, clearEdit, availableCompanies, availableArtists]
  );

  const allSelected = projects.length > 0 && selectedProjects.size === projects.length;
  const someSelected = selectedProjects.size > 0 && selectedProjects.size < projects.length;

  if (loading) {
    return <LoadingState />;
  }

  if (!projects.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <BulkActionsToolbar selectedCount={selectedProjects.size} onBulkDelete={onBulkDelete} />

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

      {/* Main table with scrollbar */}
      <ScrollArea ref={tableScrollRef} className="w-full rounded-md border border-border/50">
        <Table className="min-w-[1600px]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="w-[50px] text-center">
                <Checkbox
                  checked={allSelected}
                  ref={ref => {
                    if (ref && 'indeterminate' in ref) {
                      (ref as HTMLInputElement).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
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
              <TableHead className="text-center">
                <SortableHeader
                  label="Tags"
                  sortKey="tags"
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
                isSelected={selectedProjects.has(project.id)}
                editingCell={editingCell}
                editValue={editValue}
                originalValue={originalValue}
                onSelectProject={onSelectProject}
                onStartEdit={startEditing}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onEditValueChange={setEditValue}
                onProjectUpdate={onProjectUpdate}
                availableCompanies={availableCompanies}
                availableArtists={availableArtists}
                availableTags={availableTags}
                showActions={false} // Pass the new prop here
              />
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

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
