import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { ProjectType } from '@/types/project';
import { Tag } from '@/types/tag';
import { ArtistsResponse, CompaniesResponse } from '@/types/pocketbase.types';
import ImageTableCell from '../../ImageTableCell';
import { EditableCell } from './EditableCell';
import { EditingState } from '../types';

interface ProjectTableRowProps {
  project: ProjectType;
  showImages: boolean;
  isSelected: boolean;
  editingCell: EditingState | null;
  editValue: string;
  originalValue: string;
  onSelectProject: (projectId: string) => void;
  onStartEdit: (projectId: string, field: string, currentValue: string) => void;
  onSaveEdit: (projectId: string, field: string) => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onProjectUpdate: (projectId: string, updates: Partial<ProjectType>) => void;
  availableCompanies?: CompaniesResponse[];
  availableArtists?: ArtistsResponse[];
  availableTags?: Tag[];
  showActions?: boolean; // New prop to control actions column visibility
}

export const ProjectTableRow: React.FC<ProjectTableRowProps> = ({
  project,
  showImages,
  isSelected,
  editingCell,
  editValue,
  originalValue,
  onSelectProject,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onProjectUpdate,
  availableCompanies = [],
  availableArtists = [],
  availableTags = [],
  showActions = true, // Default to true if not provided
}) => {
  const isEditing = (field: string) =>
    editingCell?.projectId === project.id && editingCell?.field === field;

  const renderEditableCell = (field: string, value: string | number | undefined) => (
    <EditableCell
      project={project}
      field={field}
      value={value}
      isEditing={isEditing(field)}
      editValue={editValue}
      originalValue={originalValue}
      onStartEdit={onStartEdit}
      onSaveEdit={onSaveEdit}
      onCancelEdit={onCancelEdit}
      onEditValueChange={onEditValueChange}
      onProjectUpdate={onProjectUpdate}
      availableCompanies={availableCompanies}
      availableArtists={availableArtists}
      availableTags={availableTags}
    />
  );

  return (
    <TableRow className="group">
      <TableCell className="text-center">
        <Checkbox checked={isSelected} onCheckedChange={() => onSelectProject(project.id)} />
      </TableCell>
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
      <TableCell className="text-center">
        {renderEditableCell('company', project.company)}
      </TableCell>
      <TableCell className="text-center">{renderEditableCell('artist', project.artist)}</TableCell>
      <TableCell className="text-center">{renderEditableCell('status', project.status)}</TableCell>
      <TableCell className="text-center">
        {renderEditableCell('tags', project.tags?.length || 0)}
      </TableCell>
      <TableCell className="text-center">{renderEditableCell('width', project.width)}</TableCell>
      <TableCell className="text-center">{renderEditableCell('height', project.height)}</TableCell>
      <TableCell className="text-center">
        {renderEditableCell('kit_category', project.kit_category)}
      </TableCell>
      <TableCell className="text-center">
        {renderEditableCell('drillShape', project.drillShape)}
      </TableCell>
      <TableCell className="text-center">
        {renderEditableCell('datePurchased', project.datePurchased)}
      </TableCell>
      <TableCell className="text-center">
        {renderEditableCell('dateReceived', project.dateReceived)}
      </TableCell>
      <TableCell className="text-center">
        {renderEditableCell('dateStarted', project.dateStarted)}
      </TableCell>
      <TableCell className="text-center">
        {renderEditableCell('dateCompleted', project.dateCompleted)}
      </TableCell>
      {showActions && (
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
      )}
    </TableRow>
  );
};
