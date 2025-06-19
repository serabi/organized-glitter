import React from 'react';
import { ProgressNote } from '@/types/project';
import ProgressNoteItem from '../ProgressNoteItem';

interface ProgressNotesListProps {
  progressNotes: ProgressNote[];
  onUpdateProgressNote?: (noteId: string, content: string) => Promise<void>;
  onDeleteProgressNote?: (noteId: string) => Promise<void>;
  onDeleteProgressNoteImage?: (noteId: string) => Promise<void>;
  disabled?: boolean;
}

// Use React.memo to prevent unnecessary rerenders
const ProgressNotesList = React.memo(
  ({
    progressNotes,
    onUpdateProgressNote,
    onDeleteProgressNote,
    onDeleteProgressNoteImage,
    disabled = false,
  }: ProgressNotesListProps) => {
    if (!progressNotes || progressNotes.length === 0) {
      return null;
    }

    return (
      <div className="space-y-4">
        {progressNotes.map(note => (
          <ProgressNoteItem
            key={note.id}
            note={note}
            onUpdateNote={onUpdateProgressNote}
            onDeleteNote={onDeleteProgressNote}
            onDeleteImage={onDeleteProgressNoteImage}
            disabled={disabled}
          />
        ))}
      </div>
    );
  }
);

export default ProgressNotesList;
