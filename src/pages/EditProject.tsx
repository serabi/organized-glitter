import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEditProjectSimplified } from '@/hooks/useEditProjectSimplified';
import { EditProjectNotFound } from '@/components/projects/EditProjectNotFound';
import EditProjectSkeleton from '@/components/projects/EditProjectSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Archive, Trash2, X } from 'lucide-react';
import { ProjectMainTabSimple } from '@/components/projects/tabs/ProjectMainTabSimple';
import { ProjectStatsTabSimple } from '@/components/projects/tabs/ProjectStatsTabSimple';
// Debug component removed for PocketBase migration

const EditProject = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('main');

  const {
    project,
    loading,
    submitting,
    companies,
    artists,
    formData,
    navigationState,
    clearNavigationError,
    handleCancel,
    handleFormChange,
    handleSubmit,
    handleArchive,
    handleDelete,
    // refreshLists, // Removed as it's unused
    ConfirmationDialog,
  } = useEditProjectSimplified(id);

  if (authLoading || loading) {
    return (
      <MainLayout isAuthenticated={!!user}>
        <EditProjectSkeleton />
      </MainLayout>
    );
  }

  if (!project) {
    return <EditProjectNotFound />;
  }

  return (
    <MainLayout isAuthenticated={!!user}>
      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Debug component for image issues - development only */}
        {/* Debug component removed for PocketBase migration */}

        {/* Navigation Error Alert */}
        {navigationState.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="flex items-center justify-between">
              <span>Navigation error: {navigationState.error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNavigationError}
                className="h-auto p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={navigationState.isNavigating}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {navigationState.isNavigating ? 'Navigating...' : 'Back'}
            </Button>
            <h1 className="text-2xl font-bold">Edit Project</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleArchive} disabled={submitting}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={submitting}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{project.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="main">Project Details</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="space-y-6">
                <ProjectMainTabSimple
                  project={project}
                  formData={formData}
                  companies={companies}
                  artists={artists}
                  isSubmitting={submitting}
                  onChange={handleFormChange}
                />
              </TabsContent>

              <TabsContent value="stats" className="space-y-6">
                <ProjectStatsTabSimple
                  formData={formData}
                  isSubmitting={submitting}
                  onChange={handleFormChange}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-4 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting || navigationState.isNavigating}
              >
                {navigationState.isNavigating ? 'Navigating...' : 'Cancel'}
              </Button>
              <Button
                onClick={async () => {
                  if (formData) {
                    try {
                      await handleSubmit(formData);
                    } catch (error) {
                      console.error('Error submitting form:', error);
                    }
                  }
                }}
                disabled={submitting || !formData || navigationState.isNavigating}
              >
                <Save className="mr-2 h-4 w-4" />
                {submitting
                  ? 'Saving...'
                  : navigationState.isNavigating
                    ? 'Saving & Navigating...'
                    : 'Update Project'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <ConfirmationDialog />
      </div>
    </MainLayout>
  );
};

export default EditProject;
