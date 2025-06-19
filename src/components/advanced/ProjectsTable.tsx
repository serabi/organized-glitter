import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpAZ, ArrowDownAZ, Eye, Pencil } from 'lucide-react';
import { SortConfig, SortKey } from '@/hooks/useAdvancedFilters';
import { ProjectType } from '@/types/project';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/tags/TagBadge';
import ImageTableCell from './ImageTableCell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

interface ProjectsTableProps {
  projects: ProjectType[];
  loading: boolean;
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
  showImages: boolean;
}

const ProjectsTable: React.FC<ProjectsTableProps> = ({
  projects,
  loading,
  sortConfig,
  onSortChange,
  showImages,
}) => {
  // Handle column header click for sorting
  const handleSort = (key: SortKey) => {
    if (sortConfig.key === key) {
      // Toggle direction if clicking the same column
      onSortChange({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      // Default to ascending order for a new column
      onSortChange({ key, direction: 'asc' });
    }
  };

  // Render sort indicator
  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return null;

    return sortConfig.direction === 'asc' ? (
      <ArrowUpAZ className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDownAZ className="ml-1 h-4 w-4" />
    );
  };

  // Create sortable header
  const SortableHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <div
      className="flex cursor-pointer items-center justify-center"
      onClick={() => handleSort(sortKey)}
    >
      {label}
      {renderSortIcon(sortKey)}
    </div>
  );

  // Helper function to format status display text
  const formatStatus = (status: string): string => {
    switch (status) {
      case 'progress':
        return 'In Progress';
      case 'wishlist':
        return 'Wishlist';
      case 'purchased':
        return 'Purchased';
      case 'stash':
        return 'In Stash';
      case 'completed':
        return 'Completed';
      case 'archived':
        return 'Archived';
      case 'destashed':
        return 'Destashed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center py-12">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="w-full rounded-md border bg-background p-8 text-center">
        <p className="text-muted-foreground">No projects found with the current filters.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <Table className="min-w-[1500px]">
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="w-[200px] min-w-[200px] max-w-[200px] text-left">
              <SortableHeader label="Title" sortKey="title" />
            </TableHead>
            <TableHead className="w-[140px] min-w-[140px] max-w-[140px] text-center">
              <SortableHeader label="Company" sortKey="company" />
            </TableHead>
            <TableHead className="text-center">
              <SortableHeader label="Artist" sortKey="artist" />
            </TableHead>
            <TableHead className="text-center">
              <SortableHeader label="Status" sortKey="status" />
            </TableHead>
            <TableHead className="text-center">
              <SortableHeader label="Tags" sortKey="tags" />
            </TableHead>
            <TableHead className="w-[90px] text-center">
              <SortableHeader label="Width" sortKey="width" />
            </TableHead>
            <TableHead className="w-[90px] text-center">
              <SortableHeader label="Height" sortKey="height" />
            </TableHead>
            <TableHead className="text-center">
              <SortableHeader label="Type" sortKey="kit_category" />
            </TableHead>
            <TableHead className="text-center">
              <SortableHeader label="Shape" sortKey="drillShape" />
            </TableHead>
            <TableHead className="text-center">
              <SortableHeader label="Purchased" sortKey="datePurchased" />
            </TableHead>
            <TableHead className="text-center">
              <SortableHeader label="Received" sortKey="dateReceived" />
            </TableHead>
            <TableHead className="text-center">
              <SortableHeader label="Started" sortKey="dateStarted" />
            </TableHead>
            <TableHead className="min-w-[120px] text-center">
              <SortableHeader label="Completed" sortKey="dateCompleted" />
            </TableHead>
            <TableHead className="min-w-[120px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map(project => (
            <TableRow key={project.id} className="group">
              <TableCell className="text-left font-medium">
                <div className="flex items-center gap-3">
                  {showImages ? (
                    <ImageTableCell imageUrl={project.imageUrl} alt={project.title} size="small" />
                  ) : null}
                  <Link to={`/projects/${project.id}`} className="text-primary hover:underline">
                    {project.title}
                  </Link>
                </div>
              </TableCell>
              <TableCell className="text-center">{project.company || '—'}</TableCell>
              <TableCell className="text-center">{project.artist || '—'}</TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={
                    project.status === 'completed'
                      ? 'default'
                      : project.status === 'progress'
                        ? 'secondary'
                        : project.status === 'stash'
                          ? 'outline'
                          : project.status === 'purchased'
                            ? 'tag'
                            : 'destructive'
                  }
                  className="capitalize"
                >
                  {formatStatus(project.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {project.tags && project.tags.length > 0 ? (
                  <div className="flex max-w-48 flex-wrap justify-center gap-1">
                    {project.tags.slice(0, 3).map(tag => (
                      <TagBadge key={tag.id} tag={tag} size="sm" />
                    ))}
                    {project.tags.length > 3 && (
                      <Badge variant="outline" className="px-1.5 py-0.5 text-xs">
                        +{project.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {project.width ? `${project.width} cm` : '—'}
              </TableCell>
              <TableCell className="text-center">
                {project.height ? `${project.height} cm` : '—'}
              </TableCell>
              <TableCell className="text-center">
                {project.kit_category === 'full'
                  ? 'Full Sized'
                  : project.kit_category === 'mini'
                    ? 'Mini'
                    : '—'}
              </TableCell>
              <TableCell className="text-center">
                {project.drillShape
                  ? project.drillShape.charAt(0).toUpperCase() + project.drillShape.slice(1)
                  : '—'}
              </TableCell>
              <TableCell className="text-center">
                {project.datePurchased ? formatDate(project.datePurchased) : '—'}
              </TableCell>
              <TableCell className="text-center">
                {project.dateReceived ? formatDate(project.dateReceived) : '—'}
              </TableCell>
              <TableCell className="text-center">
                {project.dateStarted ? formatDate(project.dateStarted) : '—'}
              </TableCell>
              <TableCell className="text-center">
                {project.dateCompleted ? formatDate(project.dateCompleted) : '—'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/projects/${project.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/projects/${project.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProjectsTable;
