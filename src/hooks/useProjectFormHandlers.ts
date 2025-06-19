import { ChangeEvent, useImperativeHandle, MutableRefObject } from 'react';
import { ProjectFormSchemaType } from '@/schemas/project.schema';
import { ProjectFormValues } from '@/types/project';
import { convertSchemaToFormValues } from '@/utils/projectFormTypeAdapter';
import { Tag } from '@/types/tag';
import { UseFormSetValue } from 'react-hook-form';

export type ProjectFormRef = {
  setValue: (name: string, value: string | number | boolean) => void;
};

interface ImageUploadUI {
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleImageRemove: () => void;
}

interface UseProjectFormHandlersProps {
  setValue: UseFormSetValue<ProjectFormSchemaType>;
  currentWatchedData: ProjectFormSchemaType;
  onChange?: (data: ProjectFormValues) => void;
  projectTags: Tag[];
  setProjectTags: (tags: Tag[]) => void;
  setSelectedFileName: (fileName: string | undefined) => void;
  imageUploadUI: ImageUploadUI;
  hookHandleImageChange: (file: File | null) => void;
  hookHandleImageRemove: () => void;
  rhfAddCompany: (company: string) => void;
  rhfAddArtist: (artist: string) => void;
  onCompanyAdded: (newCompany: string) => Promise<void>;
  onArtistAdded: (newArtist: string) => Promise<void>;
  forwardedRef: MutableRefObject<ProjectFormRef | null>;
}

export const useProjectFormHandlers = ({
  setValue,
  currentWatchedData,
  onChange,
  setProjectTags,
  setSelectedFileName,
  imageUploadUI,
  hookHandleImageChange,
  hookHandleImageRemove,
  rhfAddCompany,
  rhfAddArtist,
  onCompanyAdded,
  onArtistAdded,
  forwardedRef,
}: UseProjectFormHandlersProps) => {
  // Expose a setValue method via ref
  useImperativeHandle(forwardedRef, () => ({
    setValue: (name: string, value: string | number | boolean) => {
      setValue(name as keyof ProjectFormSchemaType, value, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
  }));

  // Generic handleChange for text inputs, textareas
  const genericHandleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setValue(name as keyof ProjectFormSchemaType, val, { shouldValidate: true, shouldDirty: true });
  };

  // Specific handler for select elements
  const genericHandleSelectChange = (
    name: keyof ProjectFormSchemaType,
    value: string | number | boolean | null | undefined
  ) => {
    setValue(name, value, { shouldValidate: true, shouldDirty: true });
  };

  // Handle tags change
  const handleTagsChange = (tags: Tag[]) => {
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
  };

  // Handle company added event
  const handleCompanyAdded = async (newCompany: string) => {
    rhfAddCompany(newCompany);
    genericHandleSelectChange('company', newCompany);
    // Toast notification is already shown by useCreateCompany hook
    await onCompanyAdded(newCompany);
  };

  // Handle artist added event
  const handleArtistAdded = async (newArtist: string) => {
    rhfAddArtist(newArtist);
    genericHandleSelectChange('artist', newArtist);
    // Toast notification is already shown by useCreateArtist hook
    await onArtistAdded(newArtist);
  };

  // Handle image change for UI
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      await imageUploadUI.handleImageChange(e);
      hookHandleImageChange(file);
    }
  };

  // Handle image remove
  const handleImageRemove = () => {
    setSelectedFileName(undefined);
    imageUploadUI.handleImageRemove();
    hookHandleImageRemove();
  };

  return {
    genericHandleChange,
    genericHandleSelectChange,
    handleTagsChange,
    handleCompanyAdded,
    handleArtistAdded,
    handleImageChange,
    handleImageRemove,
  };
};
