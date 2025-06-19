import { Button } from '@/components/ui/button';

// Import hooks
import { useProgressNoteForm } from '@/hooks/useProgressNoteForm';

// Import sub-components and types from the barrel file
import {
  DateInput,
  ImageUpload,
  ContentTextarea,
  ProgressNoteFormProps,
} from './ProgressNoteForm/index'; // Explicitly point to the index file

const ProgressNoteForm = ({ onSubmit, onSuccess, disabled = false }: ProgressNoteFormProps) => {
  const {
    date,
    content,
    imageFile,
    errors, // Destructure errors from the hook
    isSubmitting,
    isCompressing,
    compressionProgress,
    handleSubmit, // The main form submission handler from the hook
    handleImageChange, // The image change handler from the hook
    handleDateChange, // The date change handler from the hook
    handleContentChange, // The content change handler from the hook
    handleClearImage, // The clear image handler from the hook
    isFormDisabled, // This is for the submit button
    areInputsDisabled, // This is for the input fields
  } = useProgressNoteForm({ onSubmit, onSuccess, disabled });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DateInput
        value={date}
        onChange={handleDateChange} // Directly use the handler from the hook
        disabled={areInputsDisabled} // Use areInputsDisabled for inputs
        error={errors.date} // Pass date error
      />

      <ImageUpload
        imageFile={imageFile}
        onChange={handleImageChange} // Directly use the handler from the hook
        onClearImage={handleClearImage} // Use the clear image handler from the hook
        isCompressing={isCompressing}
        compressionProgress={compressionProgress}
        disabled={areInputsDisabled} // Use areInputsDisabled for inputs
        error={errors.image} // Pass image error
      />

      <ContentTextarea
        value={content}
        onChange={handleContentChange} // Directly use the handler from the hook
        disabled={areInputsDisabled} // Use areInputsDisabled for inputs
        error={errors.content} // Pass content error
      />

      {/* Display general form error */}
      {errors.form && <p className="text-sm font-medium text-destructive">{errors.form}</p>}

      <Button type="submit" disabled={isFormDisabled}>
        {isCompressing ? 'Compressing Image...' : isSubmitting ? 'Adding...' : 'Add Note'}
      </Button>
    </form>
  );
};

export default ProgressNoteForm; // Corrected typo: ProgressNoteFor -> ProgressNoteForm
