import React from 'react';
import FormField from '../form/FormField';
import { Textarea } from '@/components/ui/textarea';

interface ProjectNotesSectionProps {
  notes: string;
  isSubmitting: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const ProjectNotesSection: React.FC<ProjectNotesSectionProps> = ({
  notes,
  isSubmitting,
  onChange,
}) => {
  return (
    <FormField id="notes" label="Notes">
      <Textarea
        id="generalNotes"
        name="generalNotes"
        value={notes}
        onChange={onChange}
        placeholder="Add any additional notes about this project..."
        className="min-h-[100px]"
        disabled={isSubmitting}
      />
    </FormField>
  );
};

export default ProjectNotesSection;
