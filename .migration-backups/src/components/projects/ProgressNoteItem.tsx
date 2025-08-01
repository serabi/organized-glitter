import React, { useState } from 'react';
import { secureLogger } from '@/utils/secureLogger';
import { ProgressNote } from '@/types/project';
import { format, parseISO } from 'date-fns';
import ImageGallery from './ImageGallery';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, Pencil, X, Trash2, Brush } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ProgressNoteItemProps {
  note: ProgressNote;
  onUpdateNote?: (noteId: string, content: string) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  onDeleteImage?: (noteId: string) => Promise<void>;
  disabled?: boolean;
}

// Use React.memo to prevent unnecessary rerenders
const ProgressNoteItem = React.memo(
  ({
    note,
    onUpdateNote,
    onDeleteNote,
    onDeleteImage,
    disabled = false,
  }: ProgressNoteItemProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState(note.content);
    const [isSaving, setIsSaving] = useState(false);
    const [isHoveringImage, setIsHoveringImage] = useState(false);

    // Format the date to be more readable
    // Memoize formatted dates to prevent unnecessary recalculations
    const formattedDate = React.useMemo(
      () => (note.date ? format(parseISO(note.date), 'MMMM d, yyyy') : ''),
      [note.date]
    );

    // Handle both imageUrl and image_url fields
    const imageUrl = note.imageUrl;

    const handleEdit = () => {
      setEditableContent(note.content);
      setIsEditing(true);
    };

    const handleCancel = () => {
      setIsEditing(false);
      setEditableContent(note.content);
    };

    const handleSave = async () => {
      if (!onUpdateNote) return;
      setIsSaving(true);
      try {
        await onUpdateNote(note.id, editableContent);
        setIsEditing(false);
      } catch (error) {
        secureLogger.error('Failed to update note:', error);
      } finally {
        setIsSaving(false);
      }
    };

    const handleDelete = async () => {
      if (!onDeleteNote) return;
      await onDeleteNote(note.id);
    };

    const handleDeleteImage = async () => {
      if (!onDeleteImage) return;
      await onDeleteImage(note.id);
    };

    return (
      <div className="mb-6 overflow-hidden rounded-lg border bg-white shadow-sm dark:border-muted dark:bg-card">
        {/* Instagram-like header with date and username */}
        <div className="flex items-center justify-between border-b p-3 dark:border-muted">
          <div className="flex items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white">
              <Brush className="h-4 w-4" />
            </div>
            <span className="ml-2 font-medium">{formattedDate}</span>
          </div>
          <div className="flex gap-2">
            {onUpdateNote && !isEditing && (
              <Button variant="ghost" size="sm" onClick={handleEdit} disabled={disabled}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDeleteNote && !isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={disabled}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete progress picture</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this progress picture from {formattedDate}?
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={disabled}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Instagram-style larger square image with spacing above */}
        {imageUrl && (
          <div
            onMouseEnter={() => setIsHoveringImage(true)}
            onMouseLeave={() => setIsHoveringImage(false)}
            className="relative mt-3 w-full"
          >
            <ImageGallery
              imageUrl={imageUrl}
              alt={`Progress picture from ${formattedDate}`}
              instagramStyle={true}
              size="large"
            />
            {onDeleteImage && isHoveringImage && (
              <div className="absolute right-2 top-2 opacity-100 transition-opacity duration-200">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={disabled}>
                      <Trash2 className="mr-1 h-4 w-4" /> Remove Image
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove image</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove this image? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteImage} disabled={disabled}>
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        )}

        {/* Instagram-style caption area - aligned with image and larger font */}
        <div className="mx-auto max-w-[500px] px-4 py-3">
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editableContent}
                onChange={e => setEditableContent(e.target.value)}
                rows={3}
                className="dark:border-muted"
                disabled={disabled}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={disabled || isSaving}
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={disabled || isSaving || !editableContent.trim()}
                >
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
            <p className="whitespace-pre-wrap text-base text-foreground">{note.content}</p>
          )}
        </div>
      </div>
    );
  }
);

export default ProgressNoteItem;
