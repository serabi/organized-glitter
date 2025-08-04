import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ProjectFormSchema,
  ProjectFormSchemaType,
  BaseProjectFormObjectSchema,
} from '@/schemas/project.schema';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { createLogger } from '@/utils/logger';

interface UseProjectFormProps {
  initialData?: Partial<ProjectFormSchemaType>; // Use Zod schema type
  companies: string[];
  artists: string[];
  onSubmit: (data: ProjectFormSchemaType) => void; // Use Zod schema type
  onChange?: (data: ProjectFormSchemaType) => void;
  uploadContext?: 'project-image' | 'progress-note' | 'avatar';
}

export const useProjectForm = ({
  initialData = {},
  companies: initialCompanies = [],
  artists: initialArtists = [],
  onSubmit,
  onChange,
}: UseProjectFormProps) => {
  const { toast } = useToast();
  const formLogger = createLogger('FormSubmit');
  // Removed useAuth - userId validation is handled upstream in NewProject component

  // Memoize the resolver to prevent recreation on every render
  const formResolver = useMemo(() => zodResolver(ProjectFormSchema), []);

  const defaultValues = {
    title: '',
    company: null,
    artist: null,
    drillShape: null,
    status: 'wishlist' as const,
    userId: initialData.userId || '', // userId should always be provided by parent component
    datePurchased: null,
    dateReceived: null,
    dateStarted: null,
    dateCompleted: null,
    generalNotes: null,
    sourceUrl: null,
    totalDiamonds: undefined,
    imageUrl: null,
    width: null,
    height: null,
    kit_category: 'full' as const,
    imageFile: null,
    tagNames: [],
    ...initialData,
  };

  const rhfApi = useForm<ProjectFormSchemaType>({
    resolver: formResolver,
    defaultValues,
  });

  const {
    handleSubmit: RHFhandleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = rhfApi; // Destructure from rhfApi for internal use

  // Watch form data for changes
  const watchedFormData = rhfApi.watch();

  useEffect(() => {
    if (onChange) {
      onChange(watchedFormData);
    }
  }, [watchedFormData, onChange]);

  // Local state for image preview (imageFile is now handled by RHF)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  // isUploading can be used for the actual file upload process if separate from form submission
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null); // For direct file upload errors

  // State for companies and artists (could also be managed outside if they are global)
  const [companies, setCompanies] = useState<string[]>(initialCompanies);
  const [artists, setArtists] = useState<string[]>(initialArtists);

  // Update form with initialData when it changes
  useEffect(() => {
    // Don't reset if currently submitting or form has been submitted successfully
    if (rhfApi.formState.isSubmitting || rhfApi.formState.isSubmitSuccessful) {
      return;
    }

    if (initialData && Object.keys(initialData).length > 0) {
      reset(initialData); // Reset form with new initial data
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      } else {
        setImagePreview(null);
      }
      if (!initialData.imageFile) {
        // if initialData doesn't have an imageFile, clear RHF's imageFile
        setValue('imageFile', null);
      }
    }
  }, [
    initialData,
    reset,
    setValue,
    rhfApi.formState.isSubmitting,
    rhfApi.formState.isSubmitSuccessful,
  ]);

  // Removed redundant userId effect - userId is now validated upstream before form initialization

  // Update companies and artists when props change
  useEffect(() => {
    setCompanies(
      Array.isArray(initialCompanies)
        ? initialCompanies.filter(c => c && typeof c === 'string')
        : []
    );
    setArtists(
      Array.isArray(initialArtists) ? initialArtists.filter(a => a && typeof a === 'string') : []
    );
  }, [initialCompanies, initialArtists]);

  const handleImageChange = useCallback(
    (file: File | null) => {
      setUploadError(null);
      if (file) {
        // Zod schema will handle validation on submit, but we can show immediate feedback
        const validationResult = BaseProjectFormObjectSchema.shape.imageFile.safeParse(file);
        if (!validationResult.success) {
          const errorMessage = validationResult.error.errors[0]?.message || 'Invalid image file.';
          setUploadError(errorMessage);
          toast({
            title: 'Image Error',
            description: errorMessage,
            variant: 'destructive',
          });
          setValue('imageFile', null); // Clear invalid file from RHF
          setImagePreview(initialData?.imageUrl || null); // Revert preview
          return;
        }

        setValue('imageFile', file, { shouldValidate: true });
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.onerror = () => {
          logger.error('FileReader error');
          setUploadError('Failed to read image file for preview.');
          toast({
            title: 'Image Preview Error',
            description: 'Could not read file for preview.',
            variant: 'destructive',
          });
        };
        reader.readAsDataURL(file);
      } else {
        setValue('imageFile', null);
        setImagePreview(initialData?.imageUrl || null); // Revert to initial or null if no file
      }
    },
    [setValue, toast, initialData?.imageUrl]
  );

  const handleImageRemove = useCallback(() => {
    setValue('imageFile', null);
    setImagePreview(null); // Clear preview entirely when explicitly removing
    setUploadError(null);
    // Also mark the imageUrl field for removal
    setValue('imageUrl', ''); // Set to empty string to indicate removal
  }, [setValue]);

  const handleAddCompany = (newCompany: string) => {
    if (!companies.includes(newCompany)) {
      setCompanies(prev => [...prev, newCompany]);
    }
  };

  const handleAddArtist = (newArtist: string) => {
    if (!artists.includes(newArtist)) {
      setArtists(prev => [...prev, newArtist]);
    }
  };

  // The actual submit handler passed to RHF's handleSubmit
  const processFormSubmit = (data: ProjectFormSchemaType) => {
    formLogger.debug('Form data being submitted');
    formLogger.debug('totalDiamonds:', {
      value: data.totalDiamonds,
      type: typeof data.totalDiamonds,
    });
    formLogger.debug('Full form data:', data);
    onSubmit(data);
  };

  // Display Zod errors via toast
  useEffect(() => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstErrorField = errorKeys[0] as keyof ProjectFormSchemaType;
      const errorMessage = errors[firstErrorField]?.message;
      if (errorMessage) {
        toast({
          title: `Validation Error: ${firstErrorField}`,
          description: String(errorMessage), // Ensure message is a string
          variant: 'destructive',
        });
      }
    }
  }, [errors, toast]);

  return {
    rhfApi: {
      // Explicitly reconstruct rhfApi to ensure handleSubmit is the original RHF one
      register: rhfApi.register,
      control: rhfApi.control,
      setValue: rhfApi.setValue,
      watch: rhfApi.watch,
      reset: rhfApi.reset,
      formState: rhfApi.formState,
      handleSubmit: rhfApi.handleSubmit, // Ensure this is the original RHF handleSubmit
      getValues: rhfApi.getValues,
      getFieldState: rhfApi.getFieldState,
      setError: rhfApi.setError,
      clearErrors: rhfApi.clearErrors,
      trigger: rhfApi.trigger,
      unregister: rhfApi.unregister,
      setFocus: rhfApi.setFocus,
      resetField: rhfApi.resetField,
      subscribe: rhfApi.subscribe, // Added subscribe
    },
    // Custom state and handlers returned separately
    processedSubmitHandler: RHFhandleSubmit(processFormSubmit), // Provide the processed submit handler separately
    imagePreview,
    isUploading,
    setIsUploading,
    uploadError,
    setUploadError,
    companies,
    artists,
    handleAddCompany,
    handleAddArtist,
    handleImageChange,
    handleImageRemove,
    // RHFisSubmitting and errors are available via rhfApi.formState
    // imageFile can be watched via rhfApi.watch('imageFile')
  };
};
