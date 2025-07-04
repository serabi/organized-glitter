import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TagBadge } from '@/components/tags/TagBadge';
import { ProjectType } from '@/types/project';
import { formatDate } from '@/lib/utils';
import { secureLogger } from '@/utils/secureLogger';
import { SelectField } from './SelectField';
import { TagSelector } from './TagSelector';
import { EditCellProps } from '../types';
import {
  STATUS_OPTIONS,
  KIT_CATEGORY_OPTIONS,
  DRILL_SHAPE_OPTIONS,
  formatStatus,
  getStatusBadgeVariant,
  isValidProjectStatus,
  isValidKitCategory,
  isValidDrillShape,
  isDateField,
} from '../constants';

export const EditableCell: React.FC<EditCellProps> = ({
  project,
  field,
  value,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onProjectUpdate,
  availableCompanies = [],
  availableArtists = [],
  availableTags = [],
}) => {
  const displayValue = value?.toString() || '';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveEdit(project.id, field);
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  const handleSelectChange = (newValue: string, fieldName: string) => {
    const updates: Partial<ProjectType> = {};

    // Map display names to record IDs for foreign key fields
    if (fieldName === 'company') {
      if (newValue) {
        const company = availableCompanies?.find(c => c.name === newValue);
        if (!company) {
          secureLogger.criticalError('Company not found in available options:', { newValue });
          onCancelEdit();
          return;
        }
        updates.company = company.id;
      } else {
        updates.company = '';
      }
    } else if (fieldName === 'artist') {
      if (newValue) {
        const artist = availableArtists?.find(a => a.name === newValue);
        if (!artist) {
          secureLogger.criticalError('Artist not found in available options:', { newValue });
          onCancelEdit();
          return;
        }
        updates.artist = artist.id;
      } else {
        updates.artist = '';
      }
    } else {
      // For non-foreign key fields, use the value directly
      if (fieldName === 'status') {
        updates.status = newValue as ProjectType['status'];
      } else if (fieldName === 'kit_category') {
        updates.kit_category = newValue as ProjectType['kit_category'];
      } else if (fieldName === 'drillShape') {
        updates.drillShape = newValue as ProjectType['drillShape'];
      }
    }

    console.log('SelectField update:', fieldName, 'displayValue:', newValue, 'updates:', updates);
    onProjectUpdate(project.id, updates);
    onCancelEdit();
  };

  if (isEditing) {
    switch (field) {
      case 'status':
        return (
          <SelectField
            value={editValue}
            options={STATUS_OPTIONS}
            onChange={newValue => {
              if (isValidProjectStatus(newValue)) {
                handleSelectChange(newValue, 'status');
              } else {
                secureLogger.criticalError('Invalid project status:', { newValue });
                onCancelEdit();
              }
            }}
          />
        );

      case 'kit_category':
        return (
          <SelectField
            value={editValue}
            options={KIT_CATEGORY_OPTIONS}
            onChange={newValue => {
              if (isValidKitCategory(newValue)) {
                handleSelectChange(newValue, 'kit_category');
              } else {
                secureLogger.criticalError('Invalid kit category:', { newValue });
                onCancelEdit();
              }
            }}
          />
        );

      case 'drillShape':
        return (
          <SelectField
            value={editValue}
            options={DRILL_SHAPE_OPTIONS}
            onChange={newValue => {
              if (isValidDrillShape(newValue)) {
                handleSelectChange(newValue, 'drillShape');
              } else {
                secureLogger.criticalError('Invalid drill shape:', { newValue });
                onCancelEdit();
              }
            }}
          />
        );

      case 'company':
        return (
          <SelectField
            value={editValue}
            options={availableCompanies.map(c => ({ value: c.name, label: c.name }))}
            placeholder="Select company..."
            includeNoneOption
            noneLabel="No Company"
            onChange={newValue => handleSelectChange(newValue, 'company')}
          />
        );

      case 'artist':
        return (
          <SelectField
            value={editValue}
            options={availableArtists.map(a => ({ value: a.name, label: a.name }))}
            placeholder="Select artist..."
            includeNoneOption
            noneLabel="No Artist"
            onChange={newValue => handleSelectChange(newValue, 'artist')}
          />
        );

      case 'tags':
        return (
          <TagSelector project={project} availableTags={availableTags} onClose={onCancelEdit} />
        );

      default:
        if (isDateField(field)) {
          return (
            <Input
              type="date"
              value={editValue}
              onChange={e => onEditValueChange(e.target.value)}
              onBlur={() => onSaveEdit(project.id, field)}
              onKeyDown={handleKeyDown}
              className="h-8 w-full"
              autoFocus
            />
          );
        }

        return (
          <Input
            value={editValue}
            onChange={e => onEditValueChange(e.target.value)}
            onBlur={() => onSaveEdit(project.id, field)}
            onKeyDown={handleKeyDown}
            className="h-8 w-full"
            autoFocus
          />
        );
    }
  }

  // Display mode
  return (
    <div
      className="flex min-h-[2rem] w-full cursor-pointer items-center justify-center rounded p-1 hover:bg-muted/50"
      onClick={() => onStartEdit(project.id, field, displayValue)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStartEdit(project.id, field, displayValue);
        }
      }}
      aria-label={`Edit ${field}`}
    >
      {field === 'status' ? (
        <Badge variant={getStatusBadgeVariant(project.status)} className="capitalize">
          {formatStatus(project.status)}
        </Badge>
      ) : field === 'kit_category' ? (
        project.kit_category === 'full' ? (
          'Full Sized'
        ) : project.kit_category === 'mini' ? (
          'Mini'
        ) : (
          '—'
        )
      ) : field === 'drillShape' ? (
        project.drillShape ? (
          project.drillShape.charAt(0).toUpperCase() + project.drillShape.slice(1)
        ) : (
          '—'
        )
      ) : field === 'tags' ? (
        project.tags && project.tags.length > 0 ? (
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
        )
      ) : isDateField(field) ? (
        value ? (
          formatDate(value as string)
        ) : (
          '—'
        )
      ) : (
        displayValue || '—'
      )}
    </div>
  );
};
