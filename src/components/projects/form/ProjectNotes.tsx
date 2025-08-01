import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { Textarea } from '@/components/ui/textarea';
import FormField from './FormField';
import { Button } from '@/components/ui/button';
import { Check, Edit, X } from 'lucide-react';

interface ProjectNotesProps {
  notes: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSave?: (notes: string) => Promise<void>;
  readOnly?: boolean;
}

const ProjectNotes = ({ notes, onChange, onSave, readOnly = false }: ProjectNotesProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableNotes, setEditableNotes] = useState(notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // If we're just using this component in a form with onChange handler
  if (onChange) {
    return (
      <FormField id="notes" label="Notes About This Project">
        <Textarea
          id="notes"
          name="general_notes"
          value={notes}
          onChange={onChange}
          placeholder="Add any additional notes about this project..."
          rows={3}
        />
      </FormField>
    );
  }

  // For editable notes with save functionality
  const handleEdit = () => {
    setEditableNotes(notes || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(editableNotes);
      setIsEditing(false);
    } catch (error) {
      logger.error('Failed to save notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-2">
        <h3 className="font-medium">Notes About This Project</h3>
        <div className="whitespace-pre-wrap rounded-md bg-secondary p-4 text-secondary-foreground">
          {notes || 'No notes added yet.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Notes About This Project</h3>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editableNotes}
            onChange={e => setEditableNotes(e.target.value)}
            placeholder="Add any additional notes about this project..."
            rows={3}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="whitespace-pre-wrap rounded-md bg-secondary p-4 text-secondary-foreground">
          {notes || 'No notes added yet.'}
        </div>
      )}
    </div>
  );
};

export default ProjectNotes;
