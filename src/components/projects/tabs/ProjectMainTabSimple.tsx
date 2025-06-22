import { useState } from 'react';
import { ProjectType, ProjectFormValues, ProjectStatus } from '@/types/project';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { InlineTagManager } from '@/components/tags/InlineTagManager';
import { Tag } from '@/types/tag';
import { ProjectImageSection } from '@/components/projects/form-sections/ProjectImageSection';
import { useImageUpload } from '@/hooks/useImageUpload';
import ArtistSelect from '@/components/projects/form/ArtistSelect';
import CompanySelect from '@/components/projects/form/CompanySelect';

// Type-safe status options that match ProjectStatus type
const STATUS_OPTIONS: Record<ProjectStatus, string> = {
  wishlist: 'Wishlist',
  purchased: 'Purchased', 
  stash: 'In Stash',
  progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
  destashed: 'Destashed',
} as const;

interface ProjectMainTabSimpleProps {
  project: ProjectType;
  formData: ProjectFormValues | null;
  companies: string[];
  artists: string[];
  isSubmitting: boolean;
  onChange: (data: ProjectFormValues) => void;
}

export const ProjectMainTabSimple = ({
  project,
  formData,
  companies,
  artists,
  isSubmitting,
  onChange,
}: ProjectMainTabSimpleProps) => {
  const [projectTags, setProjectTags] = useState<Tag[]>(formData?.tags || project.tags || []);

  // Initialize image upload hook with proper parameters
  const imageUploadHook = useImageUpload('project-images', 'project-image');

  // Handle image change events
  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = await imageUploadHook.handleImageChange(event);
    if (file && formData) {
      const updatedData = { ...formData, imageFile: file };
      onChange(updatedData);
    }
  };

  const handleImageRemove = () => {
    imageUploadHook.handleImageRemove();
    if (!formData) return;
    const updatedData = { ...formData, imageFile: null, imageUrl: '' };
    onChange(updatedData);
  };

  const handleInputChange = (
    field: keyof ProjectFormValues,
    value: ProjectFormValues[keyof ProjectFormValues]
  ) => {
    if (!formData) return;
    const updatedData = { ...formData, [field]: value };
    onChange(updatedData);
  };

  const handleTagsChange = (tags: Tag[]) => {
    setProjectTags(tags);
    if (formData) {
      const updatedData = { ...formData, tags };
      onChange(updatedData);
    }
  };


  if (!formData) {
    return <div>Loading form data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Project Image Section */}
      <Card>
        <CardContent className="pt-6">
          <ProjectImageSection
            imageUrl={imageUploadHook.preview || formData?.imageUrl || project.imageUrl || ''}
            isUploading={imageUploadHook.uploading}
            uploadError={imageUploadHook.error}
            selectedFileName={imageUploadHook.file?.name}
            onImageChange={handleImageChange}
            onImageRemove={handleImageRemove}
          />
        </CardContent>
      </Card>

      {/* Basic Info Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  value={formData?.title || ''}
                  onChange={e => handleInputChange('title', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <CompanySelect
                value={formData?.company || ''}
                onChange={value => handleInputChange('company', value)}
                companies={companies}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  onValueChange={value => handleInputChange('status', value as ProjectStatus)}
                  value={formData?.status || 'wishlist'}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_OPTIONS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ArtistSelect
                value={formData?.artist || ''}
                onChange={value => handleInputChange('artist', value)}
                artists={artists}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type of Kit and Tags Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Type of Kit Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="kit_category">Type of Kit</Label>
              <Select
                onValueChange={value => handleInputChange('kit_category', value)}
                value={formData?.kit_category || ''}
                disabled={isSubmitting}
              >
                <SelectTrigger id="kit_category">
                  <SelectValue placeholder="Select type of kit..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Sized</SelectItem>
                  <SelectItem value="mini">Mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tags Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Tags</Label>
              <InlineTagManager
                projectId={project.id}
                initialTags={projectTags}
                onTagsChange={handleTagsChange}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="generalNotes">General Notes</Label>
            <Textarea
              id="generalNotes"
              value={formData?.generalNotes || ''}
              onChange={e => handleInputChange('generalNotes', e.target.value)}
              placeholder="Add any notes about this project..."
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
