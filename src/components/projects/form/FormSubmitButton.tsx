import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface FormSubmitButtonProps {
  isUploading: boolean;
  loading?: boolean;
  isEdit?: boolean;
}

const FormSubmitButton = ({
  isUploading,
  loading = false,
  isEdit = false,
}: FormSubmitButtonProps) => {
  // Debug log for isEdit value
  useEffect(() => {
    console.log('FormSubmitButton - isEdit value:', isEdit);
  }, [isEdit]);

  // Force it to be a boolean
  const isEditMode = isEdit === true;
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={loading || isUploading} className="flex items-center gap-2">
        {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
        {/* Debug logging for isEdit value */}
        {isUploading
          ? 'Uploading...'
          : loading
            ? 'Saving...'
            : isEditMode
              ? 'Update Project'
              : 'Create Project'}
      </Button>
    </div>
  );
};

export default FormSubmitButton;
