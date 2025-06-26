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
  ProjectSpecsSection,
  ProjectStatusSection,
  ProjectNotesSection,
  ProjectImageSection,
} from './form-sections';
import { useProjectForm, ProjectFormRef } from '@/hooks/useProjectForm';

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
    // Use the consolidated project form hook
    const form = useProjectForm({
      initialData,
      onSubmit,
      onChange,
      companies,
      artists,
      isLoading: externalLoading,
      onCompanyAdded,
      onArtistAdded,
      forwardedRef: forwardedRef as MutableRefObject<ProjectFormRef | null>,
    });

    return (
      <Form {...(form.rhfApi as UseFormReturn<ProjectFormSchemaType, unknown, unknown>)}>
        <form
          ref={form.formRef}
          onSubmit={form.processedSubmitHandler}
          className="space-y-6"
        >
          {form.formErrors && Object.keys(form.formErrors).length > 0 && (
            <FormValidationError
              error={Object.values(form.formErrors as Record<string, FieldError>)
                .map(err => err?.message)
                .filter(Boolean)
                .join(', ')}
            />
          )}

          {/* Basic Info Section */}
          <div className="space-y-6">
            <BasicInfoSection
              title={form.currentWatchedData.title ?? ''}
              company={form.currentWatchedData.company ?? ''}
              artist={form.currentWatchedData.artist ?? ''}
              companies={form.companies}
              artists={form.artists}
              isSubmitting={form.isSubmitting}
              onTitleChange={form.genericHandleChange}
              onCompanyChange={value =>
                form.setValue('company', value, { shouldValidate: true })
              }
              onArtistChange={value =>
                form.setValue('artist', value, { shouldValidate: true })
              }
              onCompanyAdded={form.handleCompanyAdded}
              onArtistAdded={form.handleArtistAdded}
            />
          </div>

          {/* Project Specs Section */}
          <div className="space-y-6">
            <ProjectSpecsSection
              width={String(form.currentWatchedData.width ?? '')}
              height={String(form.currentWatchedData.height ?? '')}
              drillShape={form.currentWatchedData.drillShape ?? ''}
              sourceUrl={form.currentWatchedData.sourceUrl ?? ''}
              totalDiamonds={form.currentWatchedData.totalDiamonds ?? undefined}
              kit_category={form.currentWatchedData.kit_category ?? undefined}
              isSubmitting={form.isSubmitting}
              onWidthChange={form.genericHandleChange}
              onHeightChange={form.genericHandleChange}
              onDrillShapeChange={value => form.genericHandleSelectChange('drillShape', value)}
              onSourceUrlChange={form.genericHandleChange}
              onTotalDiamondsChange={value => {
                form.setValue('totalDiamonds', value, { shouldValidate: true });
              }}
              onKitCategoryChange={value => {
                form.genericHandleSelectChange('kit_category', value);
              }}
            />
          </div>

          {/* Project Status Section */}
          <div className="space-y-6">
            <ProjectStatusSection
              status={form.currentWatchedData.status ?? 'wishlist'}
              datePurchased={
                typeof form.currentWatchedData.datePurchased === 'string'
                  ? form.currentWatchedData.datePurchased
                  : ''
              }
              dateReceived={
                typeof form.currentWatchedData.dateReceived === 'string'
                  ? form.currentWatchedData.dateReceived
                  : ''
              }
              dateStarted={
                typeof form.currentWatchedData.dateStarted === 'string'
                  ? form.currentWatchedData.dateStarted
                  : ''
              }
              dateCompleted={
                typeof form.currentWatchedData.dateCompleted === 'string'
                  ? form.currentWatchedData.dateCompleted
                  : ''
              }
              isSubmitting={form.isSubmitting}
              onStatusChange={value => form.genericHandleSelectChange('status', value)}
              onDateChange={form.genericHandleChange}
              projectId={initialData.id}
              projectTags={form.projectTags}
              onTagsChange={form.handleTagsChange}
            />
          </div>

          {/* Project Notes Section */}
          <div className="space-y-6">
            <ProjectNotesSection
              notes={form.currentWatchedData.generalNotes ?? ''}
              isSubmitting={form.isSubmitting}
              onChange={form.genericHandleChange}
            />
          </div>

          {/* Project Image Section */}
          <div className="space-y-6">
            <ProjectImageSection
              imageUrl={
                form.imageUploadUI.wasRemoved
                  ? undefined
                  : form.imagePreview ||
                    form.imageUploadUI.preview ||
                    (form.currentWatchedData.imageUrl as string | undefined)
              }
              isUploading={
                form.imageUploadUI.isCompressing || form.imageUploadUI.uploading
              }
              uploadError={form.imageUploadUI.error}
              selectedFileName={form.selectedFileName}
              onImageChange={form.handleImageChange}
              onImageRemove={form.handleImageRemove}
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
                disabled={form.isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting
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
