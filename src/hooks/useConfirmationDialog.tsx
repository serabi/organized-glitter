import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DialogState {
  isOpen: boolean;
  title: string;
  description: string;
  destructive: boolean;
  resolve?: (value: boolean) => void;
}

export const useConfirmationDialog = () => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    description: '',
    destructive: false,
  });

  const showDialog = useCallback(
    (title: string, description: string, destructive: boolean = false): Promise<boolean> => {
      return new Promise(resolve => {
        setDialogState({
          isOpen: true,
          title,
          description,
          destructive,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    dialogState.resolve?.(true);
    setDialogState(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  }, [dialogState]);

  const handleCancel = useCallback(() => {
    dialogState.resolve?.(false);
    setDialogState(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  }, [dialogState]);

  const confirmDelete = useCallback(
    (
      message: string = 'This will permanently delete your project. This action cannot be undone.'
    ): Promise<boolean> => {
      return showDialog('Are you absolutely sure?', message, true);
    },
    [showDialog]
  );

  const confirmArchive = useCallback(
    (title: string, message?: string): Promise<boolean> => {
      const description =
        message ||
        `Are you sure you want to archive "${title}"? This will move it to your archived projects.`;
      return showDialog('Archive Project', description, false);
    },
    [showDialog]
  );

  const confirmAction = useCallback(
    (title: string, message: string, destructive: boolean = false): Promise<boolean> => {
      return showDialog(title, message, destructive);
    },
    [showDialog]
  );

  const confirmUnsavedChanges = useCallback(
    (action: string = 'continue'): Promise<boolean> => {
      return showDialog(
        'You have unsaved changes',
        `Are you sure you want to ${action} without saving your changes?`,
        true
      );
    },
    [showDialog]
  );

  const ConfirmationDialog = useCallback(() => {
    return (
      <AlertDialog open={dialogState.isOpen} onOpenChange={handleCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogState.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogState.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                dialogState.destructive
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
            >
              {dialogState.destructive ? 'Delete' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }, [dialogState, handleConfirm, handleCancel]);

  return {
    ConfirmationDialog,
    confirmDelete,
    confirmArchive,
    confirmAction,
    confirmUnsavedChanges,
  };
};
