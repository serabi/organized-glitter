// filepath: /Users/sarahwolffmilligan/Development/lovable/organized-glitter/src/hooks/useProgressNoteForm.ts
import { useState, useCallback } from 'react';
import { useProgressImageCompression } from './useProgressImageCompression';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { getCurrentDateInUserTimezone } from '@/utils/timezoneUtils';
import { logger } from '@/utils/logger';
import {
  ProgressNoteFormProps as UseProgressNoteFormProps,
  ProgressNoteFormErrors,
} from '@/components/projects/ProgressNoteForm/types';
import { PROGRESS_NOTE_CONSTANTS } from '@/components/projects/ProgressNoteForm/constants';

interface SubmitProgressNoteData {
  date: string;
  content: string;
  imageFile?: File;
}

/**
 * Custom hook to manage the state, validation, and submission logic for the progress note form.
 * It integrates tracking and image compression functionalities.
 *
 * @param {UseProgressNoteFormProps} props - Props for the hook, including onSubmit, onSuccess, and disabled state.
 * @returns An object containing form state, handlers, validation status, and utility functions.
 */
export const useProgressNoteForm = ({
  onSubmit,
  onSuccess,
  disabled = false,
}: UseProgressNoteFormProps) => {
  const userTimezone = useUserTimezone();
  const [date, setDate] = useState<string>(getCurrentDateInUserTimezone(userTimezone));
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ProgressNoteFormErrors>({});

  const { compressImage, isCompressing, compressionProgress, resetCompressionState } =
    useProgressImageCompression();

  const resetForm = useCallback(() => {
    setContent('');
    setImageFile(null);
    setDate(getCurrentDateInUserTimezone(userTimezone));
    setErrors({});
    resetCompressionState();
  }, [resetCompressionState, userTimezone]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const currentValidationErrors: ProgressNoteFormErrors = {};
      if (!date) {
        currentValidationErrors.date = 'Date is required';
      }
      if (errors.image) {
        // Preserve existing image error from handleImageChange
        currentValidationErrors.image = errors.image;
      }

      if (Object.keys(currentValidationErrors).length > 0) {
        setErrors(currentValidationErrors);

        return;
      }
      // If we pass this point, field-specific validations are okay, clear them but preserve form error if any
      setErrors(prevErrors => ({ form: prevErrors.form }));

      setIsSubmitting(true);
      try {
        const noteDataToSubmit: SubmitProgressNoteData = {
          date: date,
          content: content.trim(),
          imageFile: imageFile || undefined,
        };

        await onSubmit(noteDataToSubmit);
        resetForm();
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        logger.error('Error submitting progress note:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'An unexpected error occurred.';
        setErrors({ form: errorMessage });
      } finally {
        setIsSubmitting(false);
      }
    },
    [date, content, imageFile, disabled, onSubmit, onSuccess, resetForm, errors.image]
  );

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0] || null;

      if (!selectedFile) {
        setImageFile(null);
        setErrors((prev: ProgressNoteFormErrors) => ({
          ...prev,
          image: undefined,
          form: undefined,
        }));
        return;
      }

      if (selectedFile.size > PROGRESS_NOTE_CONSTANTS.MAX_FILE_SIZE) {
        const fileSizeMB = Math.round((selectedFile.size / (1024 * 1024)) * 100) / 100;
        setErrors((prev: ProgressNoteFormErrors) => ({
          ...prev,
          image: `Image is ${fileSizeMB}MB, exceeds 50MB limit.`,
          form: undefined,
        }));
        setImageFile(null);
        return;
      }

      try {
        const processedFile = await compressImage(selectedFile);
        setImageFile(processedFile);
        setErrors((prev: ProgressNoteFormErrors) => ({
          ...prev,
          image: undefined,
          form: undefined,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Image processing failed.';
        setErrors((prev: ProgressNoteFormErrors) => ({
          ...prev,
          image: errorMessage,
          form: undefined,
        }));
        if (error instanceof Error && error.message.includes('exceeds 50MB limit')) {
          setImageFile(null);
        }
      }
    },
    [compressImage, imageFile?.name]
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      setDate(newDate);
      if (errors.date || errors.form) {
        setErrors((prev: ProgressNoteFormErrors) => ({
          ...prev,
          date: undefined,
          form: undefined,
        }));
      }
    },
    [date, errors.date, errors.form]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;

      setContent(newContent);
      if (errors.content || errors.form) {
        setErrors((prev: ProgressNoteFormErrors) => ({
          ...prev,
          content: undefined,
          form: undefined,
        }));
      }
    },
    [content, errors.content, errors.form]
  );

  const handleClearImage = useCallback(() => {
    setImageFile(null);
    setErrors((prev: ProgressNoteFormErrors) => ({ ...prev, image: undefined, form: undefined }));
  }, [imageFile?.name]);

  // Updated isFormValid to reflect that content is optional
  const isFormValid = Boolean(date && !errors.date && !errors.image && !errors.form);
  // Renamed original isFormDisabled to shouldDisableSubmit for clarity
  const shouldDisableSubmit = disabled || isSubmitting || isCompressing || !isFormValid;
  // New state for disabling inputs specifically
  const areInputsDisabled = disabled || isSubmitting || isCompressing;

  return {
    date,
    content,
    imageFile,
    errors,
    isSubmitting,
    isCompressing,
    compressionProgress,
    handleSubmit,
    handleImageChange,
    handleDateChange,
    handleContentChange,
    handleClearImage,
    isFormDisabled: shouldDisableSubmit, // Keep isFormDisabled for the submit button, maps to shouldDisableSubmit
    areInputsDisabled, // Add this for input fields
    resetForm,
  };
};
