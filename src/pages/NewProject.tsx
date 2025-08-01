/**
 * NewProject Component
 *
 * Full-featured form for creating diamond painting projects using EditProject layout
 */

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useMetadata } from '@/contexts/MetadataContext';
import { useCreateProjectWithRedirect } from '@/hooks/mutations/useCreateProjectWithRedirect';
import { useCreateCompany } from '@/hooks/mutations/useCompanyMutations';
import { useCreateArtist } from '@/hooks/mutations/useArtistMutations';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, X } from 'lucide-react';
import { ProjectFormValues } from '@/types/project';
import { NewProjectMainTab } from '@/components/projects/tabs/NewProjectMainTab';
import { NewProjectStatsTab } from '@/components/projects/tabs/NewProjectStatsTab';
import { mapFormDataToPocketBase } from '@/utils/field-mapping';
import { useUserTimezone } from '@/hooks/useUserTimezone';

import { logger } from '@/utils/logger';
const NewProject = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { companyNames, artistNames, isLoading } = useMetadata();
  const userTimezone = useUserTimezone();
  const createProjectMutation = useCreateProjectWithRedirect();
  const createCompanyMutation = useCreateCompany();
  const createArtistMutation = useCreateArtist();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('main');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data state - initialize userId as empty, will be set when user loads
  const [formData, setFormData] = useState<ProjectFormValues>({
    title: '',
    userId: '',
    status: 'wishlist',
    company: '',
    artist: '',
    drillShape: null,
    datePurchased: null,
    dateReceived: null,
    dateStarted: null,
    dateCompleted: null,
    generalNotes: '',
    sourceUrl: '',
    totalDiamonds: null,
    width: null,
    height: null,
    kit_category: 'full',
    imageFile: null,
    tags: [],
  });

  // Update userId when user becomes available
  useEffect(() => {
    if (user?.id && !formData.userId) {
      setFormData(prev => ({
        ...prev,
        userId: user.id,
      }));
    }
  }, [user?.id, formData.userId]);

  const clearError = () => setError(null);

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleFormChange = (data: ProjectFormValues) => {
    setFormData(data);
  };

  const handleSubmit = async (data: ProjectFormValues) => {
    if (!data.title?.trim()) {
      toast({
        title: 'Error',
        description: 'Project title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a project',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create metadata entities first if needed
      const metadataErrors: string[] = [];

      // Create company if needed
      if (data.company && data.company !== 'other' && !companyNames.includes(data.company)) {
        try {
          await createCompanyMutation.mutateAsync({ name: data.company });
        } catch (_error) {
          metadataErrors.push(`Failed to create company "${data.company}"`);
        }
      }

      // Create artist if needed
      if (
        data.artist &&
        !['other', 'unknown'].includes(data.artist) &&
        !artistNames.includes(data.artist)
      ) {
        try {
          await createArtistMutation.mutateAsync({ name: data.artist });
        } catch (_error) {
          metadataErrors.push(`Failed to create artist "${data.artist}"`);
        }
      }

      // Show warning if metadata creation failed
      if (metadataErrors.length > 0) {
        toast({
          title: 'Warning',
          description: `Some metadata could not be saved: ${metadataErrors.join(', ')}. The project will be created without this information.`,
          variant: 'default',
        });
      }

      // Create the project using timezone-aware field mapping
      const mappedFormData = mapFormDataToPocketBase(data, userTimezone);
      const projectData = {
        title: data.title.trim(),
        user: user.id,
        ...mappedFormData,
        image: data.imageFile || null,
        tagIds: data.tags?.map(tag => tag.id) || [],
      };

      await createProjectMutation.mutateAsync(projectData);

      // Success toast and navigation are handled by the mutation hook
      // No manual navigation needed - the hook handles redirect before cache invalidation
    } catch (error) {
      logger.error('Failed to create project', error);
      setError('Failed to create project. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || isLoading.companies || isLoading.artists || isLoading.tags) {
    return (
      <MainLayout isAuthenticated={!!user}>
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout isAuthenticated={false}>
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Alert className="mb-4 w-full max-w-md">
                <AlertDescription>Please log in to create a new project.</AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout isAuthenticated={!!user}>
      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError} className="h-auto p-1">
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={submitting}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Create New Project</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{formData.title || 'New Project'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="main">Project Details</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="space-y-6">
                <NewProjectMainTab
                  formData={formData}
                  companies={companyNames || []}
                  artists={artistNames || []}
                  isSubmitting={submitting}
                  onChange={handleFormChange}
                />
              </TabsContent>

              <TabsContent value="stats" className="space-y-6">
                <NewProjectStatsTab
                  formData={formData}
                  isSubmitting={submitting}
                  onChange={handleFormChange}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-4 border-t pt-6">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(formData)}
                disabled={submitting || !formData.title?.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                {submitting ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default NewProject;
