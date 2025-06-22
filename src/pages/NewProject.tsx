/**
 * NewProject Component - Simplified Version
 * 
 * Ultra-simple form for creating diamond painting projects
 */

import { useState, FormEvent } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useCreateProject } from '@/hooks/mutations/useCreateProject';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

const NewProject = () => {
  // Simple form state
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const createProjectMutation = useCreateProject();
  const navigate = useNavigate();

  // Simple form submission handler
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!title.trim()) {
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

    setIsSubmitting(true);
    
    try {
      const projectData = {
        title: title.trim(),
        user: user.id,
        status: 'wishlist' as const,
      };

      const newProject = await createProjectMutation.mutateAsync(projectData);
      
      toast({
        title: 'Success',
        description: 'Project created successfully!',
      });
      
      navigate(`/projects/${newProject.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <MainLayout isAuthenticated={false}>
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
              <h3 className="mb-2 text-lg font-semibold">Authentication Required</h3>
              <p className="mb-4 max-w-md text-muted-foreground">
                Please log in to create a new project.
              </p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout isAuthenticated={!!user}>
      <div className="container mx-auto px-4 py-8">
        {/* Simple header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
          <p className="text-muted-foreground">Start tracking your diamond painting project</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Project Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your project title"
                required
                disabled={isSubmitting}
                style={{ fontSize: '16px' }} // Prevent iOS zoom
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                disabled={isSubmitting}
                className="px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default NewProject;
