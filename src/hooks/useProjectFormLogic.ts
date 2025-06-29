import { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectFormValues, ProjectPersistPayload } from '@/types/project';
import { ProjectFormSchemaType } from '@/schemas/project.schema';
import { useToast } from '@/components/ui/use-toast';
import { useProjectForm } from '@/hooks/useProjectForm';
import { useImageUpload } from '@/hooks/useImageUpload';
import { convertSchemaToFormValues } from '@/utils/projectFormTypeAdapter';
import { Tag } from '@/types/tag';

interface UseProjectFormLogicProps {
  initialData?: Partial<ProjectFormValues>;
  onSubmit: (data: ProjectFormValues | ProjectPersistPayload) => Promise<void>;
  onChange?: (data: ProjectFormValues | ProjectPersistPayload) => void;
  companies?: string[];
  artists?: string[];
  isLoading?: boolean;
  onCompanyAdded?: (newCompany: string) => Promise<void>;
  onArtistAdded?: (newArtist: string) => Promise<void>;
}

export const useProjectFormLogic = ({
  initialData = {},
  onSubmit,
  onChange,
  companies = [],
  artists = [],
  isLoading: externalLoading,
}: UseProjectFormLogicProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [localIsLoading, setLocalIsLoading] = useState(false);
  const { toast } = useToast();

  // Tag state management
  const [projectTags, setProjectTags] = useState<Tag[]>(initialData.tags || []);

  // Image upload UI state
  const imageUploadUI = useImageUpload('project-images');
  const [selectedFileName, setSelectedFileName] = useState<string | undefined>(undefined);

  // Mobile-friendly debounced onChange handler
  const debouncedOnChangeRef = useRef<NodeJS.Timeout>();
  const mobileOnChange = useCallback(
    (data: ProjectFormSchemaType) => {
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
    },
    [onChange, projectTags]
  );

  // Update projectTags when initialData.tags changes
  useEffect(() => {
    setProjectTags(initialData.tags || []);
  }, [initialData.tags]);

  // Cleanup debounced onChange on unmount
  useEffect(() => {
    return () => {
      if (debouncedOnChangeRef.current) {
        clearTimeout(debouncedOnChangeRef.current);
      }
    };
  }, []);

  // Use the project form hook to manage form state
  const rhfMethods = useProjectForm({
    initialData: initialData as Partial<ProjectFormSchemaType>,
    companies,
    artists,
    onSubmit: async (data: ProjectFormSchemaType) => {
      console.log('📝 Form onSubmit called with schema data:', data);
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

        console.log('🔄 Converted data with tags:', payload);
        console.log('🏷️ Tags to save:', projectTags);
        console.log('🚀 Calling parent onSubmit...');
        await onSubmit(payload);
        console.log('✅ Parent onSubmit completed');
      } catch (error) {
        console.error('❌ Error in form submission:', error);
        toast({
          title: 'Error',
          description: 'Failed to save project. Please try again.',
          variant: 'destructive',
        });
        throw error;
      } finally {
        setLocalIsLoading(false);
      }
    },
    onChange: mobileOnChange,
  });

  const {
    rhfApi,
    processedSubmitHandler,
    imagePreview,
    companies: formCompanies,
    artists: formArtists,
    handleAddCompany: rhfAddCompany,
    handleAddArtist: rhfAddArtist,
    handleImageChange: hookHandleImageChange,
    handleImageRemove: hookHandleImageRemove,
  } = rhfMethods;

  const { setValue, watch, formState } = rhfApi;
  const { errors: formErrors, isSubmitting: RHFisSubmitting } = formState;
  const currentWatchedData = watch();
  const isSubmitting = externalLoading || localIsLoading;

  return {
    // Form state
    formRef,
    isSubmitting,
    projectTags,
    setProjectTags,
    selectedFileName,
    setSelectedFileName,

    // RHF methods and state
    rhfApi,
    processedSubmitHandler,
    setValue,
    formErrors,
    RHFisSubmitting,
    currentWatchedData,

    // Image handling
    imagePreview,
    imageUploadUI,
    hookHandleImageChange,
    hookHandleImageRemove,

    // Company/Artist data
    formCompanies,
    formArtists,
    rhfAddCompany,
    rhfAddArtist,

    // Utilities
    toast,
  };
};
