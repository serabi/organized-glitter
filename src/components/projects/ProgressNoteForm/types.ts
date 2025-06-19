export interface ProgressNoteFormProps {
  onSubmit: (note: { date: string; content: string; imageFile?: File }) => Promise<void>;
  onSuccess?: () => void;
  disabled?: boolean;
}

export interface CompressionProgress {
  percentage: number;
  status: string;
  currentStep: string;
}

export interface ProgressNoteFormData {
  date: string;
  content: string;
  imageFile: File | null; // This is used by the form state internally
  // Note: The onSubmit prop expects imageFile to be File | undefined
}

export interface ProgressNoteFormErrors {
  date?: string;
  content?: string;
  image?: string;
  form?: string; // Added for general form errors
}
