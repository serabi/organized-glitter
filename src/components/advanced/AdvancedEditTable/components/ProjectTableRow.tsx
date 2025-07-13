import React from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { ProjectType } from '@/types/project';
import { ArtistsResponse, CompaniesResponse } from '@/types/pocketbase.types';
import ImageTableCell from '../../ImageTableCell';

interface ProjectTableRowProps {
  project: ProjectType;
  showImages: boolean;
  availableCompanies?: CompaniesResponse[];
  availableArtists?: ArtistsResponse[];
  showActions?: boolean;
}

export const ProjectTableRow: React.FC<ProjectTableRowProps> = ({
  project,
  showImages,
  availableCompanies = [],
  availableArtists = [],
  showActions = true,
}) => {
  const renderDisplayCell = (value: string | number | undefined) => (
    <span className="text-sm">{value || '-'}</span>
  );

  const renderDateCell = (dateValue: string | undefined) => {
    if (!dateValue) return <span className="text-sm">-</span>;

    // Format date to show only YYYY-MM-DD
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return <span className="text-sm">-</span>;

      const formattedDate = date.toISOString().split('T')[0];
      return <span className="text-sm">{formattedDate}</span>;
    } catch {
      return <span className="text-sm">-</span>;
    }
  };

  return (
    <TableRow className="group">
      <TableCell className="text-center font-medium">
        <div className="flex items-center justify-center gap-3">
          {showImages && (
            <ImageTableCell imageUrl={project.imageUrl} alt={project.title} size="small" />
          )}
          <Link
            to={`/projects/${project.id}`}
            className="text-primary transition-colors hover:text-primary/80 hover:underline"
          >
            {project.title}
          </Link>
        </div>
      </TableCell>
      <TableCell className="text-center">{renderDisplayCell(project.company)}</TableCell>
      <TableCell className="text-center">{renderDisplayCell(project.artist)}</TableCell>
      <TableCell className="text-center">{renderDisplayCell(project.status)}</TableCell>
      <TableCell className="text-center">{renderDisplayCell(project.width)}</TableCell>
      <TableCell className="text-center">{renderDisplayCell(project.height)}</TableCell>
      <TableCell className="text-center">{renderDisplayCell(project.kit_category)}</TableCell>
      <TableCell className="text-center">{renderDisplayCell(project.drillShape)}</TableCell>
      <TableCell className="text-center">{renderDateCell(project.datePurchased)}</TableCell>
      <TableCell className="text-center">{renderDateCell(project.dateReceived)}</TableCell>
      <TableCell className="text-center">{renderDateCell(project.dateStarted)}</TableCell>
      <TableCell className="text-center">{renderDateCell(project.dateCompleted)}</TableCell>
      {showActions && (
        <TableCell className="text-right">
          <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/projects/${project.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
};
