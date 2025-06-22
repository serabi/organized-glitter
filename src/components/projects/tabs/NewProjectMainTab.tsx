import { useState } from 'react';
import { ProjectFormValues, ProjectStatus } from '@/types/project';
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

interface NewProjectMainTabProps {
  formData: ProjectFormValues;
  companies: string[];
  artists: string[];
  isSubmitting: boolean;
  onChange: (data: ProjectFormValues) => void;
}

export const NewProjectMainTab = ({
  formData,
  companies,
  artists,
  isSubmitting,
  onChange,
}: NewProjectMainTabProps) => {
  const [projectTags, setProjectTags] = useState<Tag[]>(formData.tags || []);

  // Initialize image upload hook
  const imageUploadHook = useImageUpload('project-images', 'project-image');

  // Handle input changes
  const handleInputChange = (field: keyof ProjectFormValues, value: unknown) => {
    const updatedData = { ...formData, [field]: value };
    onChange(updatedData);
  };

  // Handle image change events
  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = await imageUploadHook.handleImageChange(event);
    if (file) {
      handleInputChange('imageFile', file);
    }
  };

  // Handle tags change
  const handleTagsChange = (tags: Tag[]) => {
    setProjectTags(tags);
    const tagIds = tags.map(tag => tag.id);
    const updatedData = { ...formData, tags, tagIds };
    onChange(updatedData);
  };

  return (
    <div className="space-y-6">
      {/* Project Image Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Project Image</Label>
            <ProjectImageSection
              imageUrl={imageUploadHook.preview || formData.imageUrl || ''}
              isUploading={imageUploadHook.uploading}
              uploadError={imageUploadHook.error}
              selectedFileName={imageUploadHook.file?.name}
              selectedFile={formData.imageFile}
              onImageChange={handleImageChange}
              onImageRemove={() => handleInputChange('imageFile', null)}
              disabled={isSubmitting}
              imageUploadHook={imageUploadHook}
            />
          </div>
        </CardContent>
      </Card>

      {/* Basic Info Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter project title"
                  disabled={isSubmitting}
                  style={{ fontSize: '16px' }} // Prevent iOS zoom
                  required
                />
              </div>

              <CompanySelect
                companies={companies}
                value={formData.company || ''}
                onChange={(value) => handleInputChange('company', value)}
                disabled={isSubmitting}
                onCompanyAdded={async () => {}} // Will be handled in parent
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || 'wishlist'}
                  onValueChange={(value) => handleInputChange('status', value as ProjectStatus)}
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
                artists={artists}
                value={formData.artist || ''}
                onChange={(value) => handleInputChange('artist', value)}
                disabled={isSubmitting}
                onArtistAdded={async () => {}} // Will be handled in parent
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
                value={formData.kit_category || 'full'}
                onValueChange={(value) => handleInputChange('kit_category', value)}
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
                tags={projectTags}
                onChange={handleTagsChange}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Fields Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="drillShape">Drill Shape</Label>
              <Select
                value={formData.drillShape || ''}
                onValueChange={(value) => handleInputChange('drillShape', value || null)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select drill shape" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceUrl">Source URL</Label>
              <Input
                id="sourceUrl"
                type="url"
                value={formData.sourceUrl || ''}
                onChange={(e) => handleInputChange('sourceUrl', e.target.value)}
                placeholder="https://example.com/pattern"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="generalNotes">General Notes</Label>
            <Textarea
              id="generalNotes"
              value={formData.generalNotes || ''}
              onChange={(e) => handleInputChange('generalNotes', e.target.value)}
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