import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ProgressNoteForm from '../ProgressNoteForm';

interface AddProgressNoteProps {
  onAddProgressNote: (note: { date: string; content: string; imageFile?: File }) => Promise<void>;
}

const AddProgressNote = ({ onAddProgressNote }: AddProgressNoteProps) => {
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleSubmit = async (noteData: { date: string; content: string; imageFile?: File }) => {
    await onAddProgressNote(noteData);
    setIsAddingNote(false);
  };

  if (!isAddingNote) {
    return (
      <div className="flex justify-end">
        <Button onClick={() => setIsAddingNote(true)}>Add Picture</Button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">New Progress Picture</h3>
        <Button variant="outline" size="sm" onClick={() => setIsAddingNote(false)}>
          Cancel
        </Button>
      </div>
      <ProgressNoteForm onSubmit={handleSubmit} />
    </div>
  );
};

export default AddProgressNote;
