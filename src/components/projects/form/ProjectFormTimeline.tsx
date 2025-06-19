import React from 'react';
import FormField from './FormField';

interface ProjectFormTimelineProps {
  datePurchased: string;
  dateStarted: string;
  dateCompleted: string;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSubmitting: boolean;
}

const ProjectFormTimeline: React.FC<ProjectFormTimelineProps> = ({
  datePurchased,
  dateStarted,
  dateCompleted,
  onDateChange,
  isSubmitting,
}) => {
  return (
    <div className="mt-4 rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">Project Timeline</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField id="datePurchased" label="Date Purchased">
          <input
            id="datePurchased"
            name="datePurchased"
            type="date"
            value={datePurchased}
            onChange={onDateChange}
            disabled={isSubmitting}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent"
            max={new Date().toISOString().split('T')[0]}
          />
        </FormField>

        <FormField id="dateStarted" label="Date Started">
          <input
            id="dateStarted"
            name="dateStarted"
            type="date"
            value={dateStarted}
            onChange={onDateChange}
            disabled={isSubmitting}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent"
            max={new Date().toISOString().split('T')[0]}
            min={datePurchased || ''}
          />
        </FormField>

        <FormField id="dateCompleted" label="Date Completed">
          <input
            id="dateCompleted"
            name="dateCompleted"
            type="date"
            value={dateCompleted}
            onChange={onDateChange}
            disabled={isSubmitting}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent"
            max={new Date().toISOString().split('T')[0]}
            min={dateStarted || datePurchased || ''}
          />
        </FormField>
      </div>
    </div>
  );
};

export default ProjectFormTimeline;
