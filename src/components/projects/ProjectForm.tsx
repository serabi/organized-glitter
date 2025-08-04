import { forwardRef, MutableRefObject } from 'react';
import { UseFormReturn, FieldError } from 'react-hook-form';
import { ProjectFormValues } from '@/types/project';
import { ProjectFormSchemaType } from '@/schemas/project.schema';
import { Button } from '@/components/ui/button';
// Debug component removed for PocketBase migration
import FormValidationError from './form/FormValidationError';
import { Form } from '@/components/ui/form';
import {
  BasicInfoSection,
  ProjectStatusSection,
  ProjectNotesSection,
  ProjectImageSection,
} from './form-sections';
import ProjectSpecs from './form/ProjectSpecs';
import { useProjectFormLogic } from '@/hooks/useProjectFormLogic';
import { useProjectFormHandlers, ProjectFormRef } from '@/hooks/useProjectFormHandlers';

interface ProjectFormProps {
  initialData?: Partial<ProjectFormValues>;
  onSubmit: (data: ProjectFormValues) => Promise<void>;
  onChange?: (data: ProjectFormValues) => void;
  companies?: string[];
  artists?: string[];
  isLoading?: boolean;
  isEdit?: boolean;
  onCancel?: () => void;
  onCompanyAdded?: (newCompany: string) => Promise<void>;
  onArtistAdded?: (newArtist: string) => Promise<void>;
}

const ProjectForm = forwardRef<ProjectFormRef, ProjectFormProps>(
  (
    {
      initialData = {},
      onSubmit,
      onChange,
      companies = [],
      artists = [],
      isLoading: externalLoading,
      isEdit = false,
      onCancel,
      onCompanyAdded = async () => {},
      onArtistAdded = async () => {},
    },
    forwardedRef
  ) => {
    // Extract all form logic into custom hooks
    const formLogic = useProjectFormLogic({
      initialData,
      onSubmit,
      onChange,
      companies,
      artists,
      isLoading: externalLoading,
      onCompanyAdded,
      onArtistAdded,
    });

    // Extract form handlers
    const handlers = useProjectFormHandlers({
      setValue: formLogic.setValue,
      currentWatchedData: formLogic.currentWatchedData,
      onChange,
      projectTags: formLogic.projectTags,
      setProjectTags: formLogic.setProjectTags,
      setSelectedFileName: formLogic.setSelectedFileName,
      imageUploadUI: formLogic.imageUploadUI,
      hookHandleImageChange: formLogic.hookHandleImageChange,
      hookHandleImageRemove: formLogic.hookHandleImageRemove,
      rhfAddCompany: formLogic.rhfAddCompany,
      rhfAddArtist: formLogic.rhfAddArtist,
      onCompanyAdded,
      onArtistAdded,
      forwardedRef: forwardedRef as MutableRefObject<ProjectFormRef | null>,
    });

    return (
      <Form {...(formLogic.rhfApi as UseFormReturn<ProjectFormSchemaType, unknown, unknown>)}>
        <form
          ref={formLogic.formRef}
          onSubmit={formLogic.processedSubmitHandler}
          className="space-y-6"
        >
          {formLogic.formErrors && Object.keys(formLogic.formErrors).length > 0 && (
            <FormValidationError
              error={Object.values(formLogic.formErrors as Record<string, FieldError>)
                .map(err => err?.message)
                .filter(Boolean)
                .join(', ')}
            />
          )}

          {/* Basic Info Section */}
          <div className="space-y-6">
            <BasicInfoSection
              title={formLogic.currentWatchedData.title ?? ''}
              company={formLogic.currentWatchedData.company ?? ''}
              artist={formLogic.currentWatchedData.artist ?? ''}
              companies={formLogic.formCompanies}
              artists={formLogic.formArtists}
              isSubmitting={formLogic.isSubmitting}
              onTitleChange={e =>
                formLogic.setValue('title', e.target.value, { shouldValidate: true })
              }
              onCompanyChange={value =>
                formLogic.setValue('company', value, { shouldValidate: true })
              }
              onArtistChange={value =>
                formLogic.setValue('artist', value, { shouldValidate: true })
              }
              onCompanyAdded={handlers.handleCompanyAdded}
              onArtistAdded={handlers.handleArtistAdded}
            />
          </div>

          {/* Project Specs Section */}
          <div className="space-y-6">
            <ProjectSpecs
              width={String(formLogic.currentWatchedData.width ?? '')}
              height={String(formLogic.currentWatchedData.height ?? '')}
              drillShape={formLogic.currentWatchedData.drillShape ?? ''}
              sourceUrl={formLogic.currentWatchedData.sourceUrl ?? ''}
              totalDiamonds={
                formLogic.currentWatchedData.totalDiamonds
                  ? String(formLogic.currentWatchedData.totalDiamonds)
                  : ''
              }
              kit_category={formLogic.currentWatchedData.kit_category ?? undefined}
              isSubmitting={formLogic.RHFisSubmitting || formLogic.isSubmitting}
              onWidthChange={handlers.genericHandleChange}
              onHeightChange={handlers.genericHandleChange}
              onDrillShapeChange={value => handlers.genericHandleSelectChange('drillShape', value)}
              onSourceUrlChange={handlers.genericHandleChange}
              setValue={formLogic.setValue}
              onKitCategoryChange={value => {
                handlers.genericHandleSelectChange('kit_category', value);
              }}
            />
          </div>

          {/* Project Status Section */}
          <div className="space-y-6">
            <ProjectStatusSection
              status={formLogic.currentWatchedData.status ?? 'wishlist'}
              datePurchased={
                typeof formLogic.currentWatchedData.datePurchased === 'string'
                  ? formLogic.currentWatchedData.datePurchased
                  : ''
              }
              dateReceived={
                typeof formLogic.currentWatchedData.dateReceived === 'string'
                  ? formLogic.currentWatchedData.dateReceived
                  : ''
              }
              dateStarted={
                typeof formLogic.currentWatchedData.dateStarted === 'string'
                  ? formLogic.currentWatchedData.dateStarted
                  : ''
              }
              dateCompleted={
                typeof formLogic.currentWatchedData.dateCompleted === 'string'
                  ? formLogic.currentWatchedData.dateCompleted
                  : ''
              }
              isSubmitting={formLogic.RHFisSubmitting || formLogic.isSubmitting}
              onStatusChange={value => handlers.genericHandleSelectChange('status', value)}
              onDateChange={handlers.genericHandleChange}
              projectId={initialData.id}
              projectTags={formLogic.projectTags}
              onTagsChange={handlers.handleTagsChange}
            />
          </div>

          {/* Project Notes Section */}
          <div className="space-y-6">
            <ProjectNotesSection
              notes={formLogic.currentWatchedData.generalNotes ?? ''}
              isSubmitting={formLogic.RHFisSubmitting || formLogic.isSubmitting}
              onChange={handlers.genericHandleChange}
            />
          </div>

          {/* Project Image Section */}
          <div className="space-y-6">
            <ProjectImageSection
              imageUrl={
                formLogic.imageUploadUI.wasRemoved
                  ? undefined
                  : formLogic.imagePreview ||
                    formLogic.imageUploadUI.preview ||
                    (formLogic.currentWatchedData.imageUrl as string | undefined)
              }
              isUploading={
                formLogic.imageUploadUI.isCompressing || formLogic.imageUploadUI.uploading
              }
              uploadError={formLogic.imageUploadUI.error}
              selectedFileName={formLogic.selectedFileName}
              onImageChange={handlers.handleImageChange}
              onImageRemove={handlers.handleImageRemove}
            />

            {/* Debug component removed for PocketBase migration */}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={formLogic.RHFisSubmitting || formLogic.isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={formLogic.RHFisSubmitting || formLogic.isSubmitting}>
              {formLogic.RHFisSubmitting || formLogic.isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Update Project'
                  : 'Create Project'}
            </Button>
          </div>
        </form>
      </Form>
    );
  }
);

export default ProjectForm;
