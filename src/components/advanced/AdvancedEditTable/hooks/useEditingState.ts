import { useState, useCallback } from 'react';
import { EditingState } from '../types';

export const useEditingState = () => {
  const [editingCell, setEditingCell] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [originalValue, setOriginalValue] = useState<string>('');

  const startEditing = useCallback((projectId: string, field: string, currentValue: string) => {
    setEditingCell({ projectId, field });

    // For date fields, we need to convert the date to YYYY-MM-DD format for the input
    if (field.startsWith('date') && currentValue) {
      // If it's already in YYYY-MM-DD format, use it as is
      // Otherwise, try to parse and convert
      const date = new Date(currentValue);
      if (!isNaN(date.getTime())) {
        const isoString = date.toISOString().split('T')[0];
        setEditValue(isoString);
        setOriginalValue(isoString);
      } else {
        setEditValue(currentValue || '');
        setOriginalValue(currentValue || '');
      }
    } else {
      setEditValue(currentValue || '');
      setOriginalValue(currentValue || '');
    }
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
    setOriginalValue('');
  }, []);

  const clearEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
    setOriginalValue('');
  }, []);

  return {
    editingCell,
    editValue,
    originalValue,
    setEditValue,
    startEditing,
    cancelEdit,
    clearEdit,
  };
};
