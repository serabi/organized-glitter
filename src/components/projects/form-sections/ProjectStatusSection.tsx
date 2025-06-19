import React from 'react';
import { ProjectStatus as ProjectStatusType } from '@/types/project';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import FormField from '../form/FormField';
import { Input } from '@/components/ui/input';
import { useProjectStatus } from '@/hooks/useProjectStatus';
import { InlineTagManager } from '@/components/tags/InlineTagManager';
import { Tag } from '@/types/tag';

interface ProjectStatusSectionProps {
  status: ProjectStatusType | string;
  datePurchased?: string;
  dateReceived?: string;
  dateStarted?: string;
  dateCompleted?: string;
  isSubmitting: boolean;
  onStatusChange: (value: string) => void;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Tag-related props
  projectId?: string;
  projectTags?: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
}

export const ProjectStatusSection: React.FC<ProjectStatusSectionProps> = ({
  status,
  datePurchased,
  dateReceived,
  dateStarted,
  dateCompleted,
  isSubmitting,
  onStatusChange,
  onDateChange,
  projectId,
  projectTags = [],
  onTagsChange,
}) => {
  // Get status options and labels from the hook
  const { getStatusLabel, statusOptions } = useProjectStatus();

  return (
    <div className="space-y-4">
      {/* Status and Tags Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="status" label="Status" required>
          <Select
            value={status || 'wishlist'}
            onValueChange={onStatusChange}
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(statusValue => (
                <SelectItem key={statusValue} value={statusValue}>
                  {getStatusLabel(statusValue)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField id="tags" label="Tags">
          <InlineTagManager
            projectId={projectId || undefined}
            initialTags={projectTags}
            onTagsChange={onTagsChange}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <FormField id="datePurchased" label="Date Purchased">
          <Input
            type="date"
            id="datePurchased"
            name="datePurchased"
            value={datePurchased || ''}
            onChange={onDateChange}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id="dateReceived" label="Date Received">
          <Input
            type="date"
            id="dateReceived"
            name="dateReceived"
            value={dateReceived || ''}
            onChange={onDateChange}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id="dateStarted" label="Date Started">
          <Input
            type="date"
            id="dateStarted"
            name="dateStarted"
            value={dateStarted || ''}
            onChange={onDateChange}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id="dateCompleted" label="Date Completed">
          <Input
            type="date"
            id="dateCompleted"
            name="dateCompleted"
            value={dateCompleted || ''}
            onChange={onDateChange}
            disabled={isSubmitting}
          />
        </FormField>
      </div>
    </div>
  );
};

export default ProjectStatusSection;
