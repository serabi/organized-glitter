import { useState, useEffect, useCallback, useMemo, useRef, useImperativeHandle, MutableRefObject, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ProjectFormSchema,
  ProjectFormSchemaType,
  BaseProjectFormObjectSchema,
} from '@/schemas/project.schema';
import { ProjectFormValues, ProjectPersistPayload } from '@/types/project';
import { Tag } from '@/types/tag';
import { useToast } from '@/hooks/use-toast';
import { useImageUpload } from '@/hooks/image/useImageUpload';
import { convertSchemaToFormValues } from '@/utils/projectFormTypeAdapter';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('useProjectForm');

export type ProjectFormRef = {
  setValue: (name: string, value: string | number | boolean) => void;
};

interface UseProjectFormProps {
  initialData?: Partial<ProjectFormValues>;
  companies?: string[];
  artists?: string[];
  onSubmit: (data: ProjectFormValues | ProjectPersistPayload) => Promise<void>;
  onChange?: (data: ProjectFormValues | ProjectPersistPayload) => void;
  isLoading?: boolean;
  onCompanyAdded?: (newCompany: string) => Promise<void>;
  onArtistAdded?: (newArtist: string) => Promise<void>;
  forwardedRef?: MutableRefObject<ProjectFormRef | null>;
}

export const useProjectForm = ({
  initialData = {},
  companies: initialCompanies = [],
  artists: initialArtists = [],
  onSubmit,
  onChange,
  isLoading: externalLoading,
  onCompanyAdded = async () => {},
  onArtistAdded = async () => {},
  forwardedRef,
}: UseProjectFormProps) => {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [localIsLoading, setLocalIsLoading] = useState(false);

  // Memoize the resolver to prevent recreation on every render
  const formResolver = useMemo(() => zodResolver(ProjectFormSchema), []);

  const defaultValues: Partial<ProjectFormSchemaType> = {
    title: '',
    company: null,
    artist: null,
    drillShape: null,
    status: 'wishlist' as const,
    userId: initialData.userId || '',
    datePurchased: null,
    dateReceived: null,
    dateStarted: null,
    dateCompleted: null,
    generalNotes: null,
    sourceUrl: null,
    totalDiamonds: null,
    imageUrl: null,
    width: null,
    height: null,
    kit_category: 'full' as const,
    imageFile: null,
    tagNames: [],
    tagIds: [],
    // Convert initialData to match schema types
    ...(initialData ? {
      ...initialData,
      width: initialData.width ? Number(initialData.width) : null,
      height: initialData.height ? Number(initialData.height) : null,
      totalDiamonds: initialData.totalDiamonds ? Number(initialData.totalDiamonds) : null,
    } : {}),
  };

  const rhfApi = useForm<ProjectFormSchemaType>({
    resolver: formResolver,
    defaultValues,
  });

  const {
    handleSubmit: RHFhandleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting: RHFisSubmitting },
  } = rhfApi;

  // Watch form data for changes
  const currentWatchedData = watch();

  // State management
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<string[]>(initialCompanies);
  const [artists, setArtists] = useState<string[]>(initialArtists);
  const [projectTags, setProjectTags] = useState<Tag[]>(initialData.tags || []);
  const [selectedFileName, setSelectedFileName] = useState<string | undefined>(undefined);

  // Image upload UI state
  const imageUploadUI = useImageUpload('project-images');

  // Computed values
  const isSubmitting = externalLoading || localIsLoading || RHFisSubmitting;

  // Mobile-friendly debounced onChange handler
  const debouncedOnChangeRef = useRef<NodeJS.Timeout>();
  const mobileOnChange = useCallback((data: ProjectFormSchemaType) => {
    if (!onChange) return;
    
    // Clear previous timeout
    if (debouncedOnChangeRef.current) {
      clearTimeout(debouncedOnChangeRef.current);
    }
    
    // Use longer debounce on mobile to prevent freezing during rapid input
    const debounceTime = window.innerWidth < 1024 ? 500 : 200;
    
    debouncedOnChangeRef.current = setTimeout(() => {
      const convertedData = convertSchemaToFormValues(data);
      const uniqueTagIds = Array.from(new Set(projectTags.map(tag => tag.id)));
      const payload: ProjectPersistPayload = {
        ...convertedData,
        tags: projectTags,
        tagIds: uniqueTagIds,
      };
      onChange(payload);
    }, debounceTime);
  }, [onChange, projectTags]);

  // Form submission handler
  const processFormSubmit = useCallback(async (data: ProjectFormSchemaType) => {
    logger.debug('Form onSubmit called with schema data', { hasImageFile: !!data.imageFile });
    try {
      setLocalIsLoading(true);
      const convertedData = convertSchemaToFormValues(data);

      // Merge locally managed tag state into form data
      const uniqueTagIds = Array.from(new Set(projectTags.map(tag => tag.id)));
      const payload: ProjectPersistPayload = {
        ...convertedData,
        tags: projectTags,
        tagIds: uniqueTagIds,
      };

      logger.debug('Converted data with tags', { tagCount: projectTags.length });
      await onSubmit(payload);
      logger.debug('Parent onSubmit completed');
    } catch (error) {
      logger.error('Error in form submission', error);
      toast({
        title: 'Error',
        description: 'Failed to save project. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLocalIsLoading(false);
    }
  }, [onSubmit, projectTags, toast]);

  // Update form with initialData when it changes
  useEffect(() => {
    if (isSubmitting) return;

    if (initialData && Object.keys(initialData).length > 0) {
      // Convert form values to schema types before resetting
      const convertedData: Partial<ProjectFormSchemaType> = {
        ...initialData,
        width: initialData.width ? Number(initialData.width) : null,
        height: initialData.height ? Number(initialData.height) : null,
        totalDiamonds: initialData.totalDiamonds ? Number(initialData.totalDiamonds) : null,
      };
      reset(convertedData);
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      } else {
        setImagePreview(null);
      }
      if (!initialData.imageFile) {
        setValue('imageFile', null);
      }
    }
  }, [initialData, reset, setValue, isSubmitting]);

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

  // Update projectTags when initialData.tags changes
  useEffect(() => {
    setProjectTags(initialData.tags || []);
  }, [initialData.tags]);

  // Watch form data for changes
  useEffect(() => {
    mobileOnChange(currentWatchedData);
  }, [currentWatchedData, mobileOnChange]);

  // Cleanup debounced onChange on unmount
  useEffect(() => {
    return () => {
      if (debouncedOnChangeRef.current) {
        clearTimeout(debouncedOnChangeRef.current);
      }
    };
  }, []);

  // Event Handlers
  const handleImageChange = useCallback(
    (file: File | null) => {
      setUploadError(null);
      if (file) {
        const validationResult = BaseProjectFormObjectSchema.shape.imageFile.safeParse(file);
        if (!validationResult.success) {
          const errorMessage = validationResult.error.errors[0]?.message || 'Invalid image file.';
          setUploadError(errorMessage);
          toast({
            title: 'Image Error',
            description: errorMessage,
            variant: 'destructive',
          });
          setValue('imageFile', null);
          setImagePreview(initialData?.imageUrl || null);
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
        setImagePreview(initialData?.imageUrl || null);
      }
    },
    [setValue, toast, initialData?.imageUrl]
  );

  const handleImageRemove = useCallback(() => {
    setValue('imageFile', null);
    setImagePreview(null);
    setUploadError(null);
    setValue('imageUrl', '');
  }, [setValue]);

  const handleAddCompany = useCallback((newCompany: string) => {
    if (!companies.includes(newCompany)) {
      setCompanies(prev => [...prev, newCompany]);
    }
  }, [companies]);

  const handleAddArtist = useCallback((newArtist: string) => {
    if (!artists.includes(newArtist)) {
      setArtists(prev => [...prev, newArtist]);
    }
  }, [artists]);

  // Handle company added event
  const handleCompanyAdded = useCallback(async (newCompany: string) => {
    handleAddCompany(newCompany);
    setValue('company', newCompany, { shouldValidate: true, shouldDirty: true });
    await onCompanyAdded(newCompany);
  }, [handleAddCompany, setValue, onCompanyAdded]);

  // Handle artist added event
  const handleArtistAdded = useCallback(async (newArtist: string) => {
    handleAddArtist(newArtist);
    setValue('artist', newArtist, { shouldValidate: true, shouldDirty: true });
    await onArtistAdded(newArtist);
  }, [handleAddArtist, setValue, onArtistAdded]);

  // Generic handleChange for text inputs, textareas
  const genericHandleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setValue(name as keyof ProjectFormSchemaType, val, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  // Specific handler for select elements
  const genericHandleSelectChange = useCallback((
    name: keyof ProjectFormSchemaType,
    value: string | number | boolean | null | undefined
  ) => {
    setValue(name, value, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  // Handle tags change
  const handleTagsChange = useCallback((tags: Tag[]) => {
    setProjectTags(tags);

    // Update form state with tagIds to keep form schema in sync
    const tagIds = tags.map(tag => tag.id);
    setValue('tagIds', tagIds, { shouldValidate: true, shouldDirty: true });

    if (onChange) {
      const convertedData = convertSchemaToFormValues(currentWatchedData);
      onChange({
        ...convertedData,
        tags,
        tagIds,
      });
    }
  }, [setProjectTags, setValue, onChange, currentWatchedData]);

  // Handle image change for UI
  const handleImageChangeUI = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      await imageUploadUI.handleImageChange(e);
      handleImageChange(file);
    }
  }, [imageUploadUI, handleImageChange]);

  // Handle image remove for UI
  const handleImageRemoveUI = useCallback(() => {
    setSelectedFileName(undefined);
    imageUploadUI.handleImageRemove();
    handleImageRemove();
  }, [imageUploadUI, handleImageRemove]);

  // Expose a setValue method via ref
  useImperativeHandle(forwardedRef, () => ({
    setValue: (name: string, value: string | number | boolean) => {
      setValue(name as keyof ProjectFormSchemaType, value, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
  }), [setValue]);

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
    // Form state and refs
    formRef,
    isSubmitting,
    currentWatchedData,
    
    // RHF API
    rhfApi,
    processedSubmitHandler: RHFhandleSubmit(processFormSubmit),
    setValue,
    formErrors: errors,
    RHFisSubmitting,
    
    // Tags
    projectTags,
    setProjectTags,
    
    // Image handling
    imagePreview,
    isUploading,
    setIsUploading,
    uploadError,
    setUploadError,
    selectedFileName,
    setSelectedFileName,
    imageUploadUI,
    handleImageChange: handleImageChangeUI,
    handleImageRemove: handleImageRemoveUI,
    
    // Companies and artists
    companies,
    artists,
    handleAddCompany,
    handleAddArtist,
    handleCompanyAdded,
    handleArtistAdded,
    
    // Generic handlers
    genericHandleChange,
    genericHandleSelectChange,
    handleTagsChange,
    
    // Utils
    toast,
  };
};
