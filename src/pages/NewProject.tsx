/**
 * NewProject Component
 *
 * Provides a form for creating new diamond painting projects with the following features:
 * - Proper transactional flow: Creates metadata (companies/artists) first, then the project
 * - Uses React Query mutations for all data operations
 * - Comprehensive error handling with user feedback
 * - Prevents navigation on critical failures
 * - TypeScript-safe with proper validation
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ProjectForm from '@/components/projects/ProjectForm';
import { ProjectFormRef } from '@/hooks/useProjectFormHandlers';
import NewProjectHeader from '@/components/projects/NewProjectHeader';
import { ProjectFormValues } from '@/types/project';
import { useCreateProject } from '@/hooks/mutations/useCreateProject';
import { useCreateCompany } from '@/hooks/mutations/useCreateCompany';
import { useCreateArtist } from '@/hooks/mutations/useCreateArtist';
import { useMetadata } from '@/contexts/MetadataContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('NewProject');

const NewProject = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const { user } = useAuth();
  const { companyNames, artistNames, isLoading, error } = useMetadata();
  const metadataLoading = isLoading.companies || isLoading.artists;
  const metadataError = error.companies || error.artists;

  // React Query mutations
  const createProjectMutation = useCreateProject();
  const createCompanyMutation = useCreateCompany();
  const createArtistMutation = useCreateArtist();

  const navigate = useNavigate();

  // Create a ref to store the form methods
  const formRef = useRef<ProjectFormRef>(null);

  // Memoize initial data to prevent unnecessary form resets
  const initialData = useMemo(() => {
    if (!user?.id) {
      return undefined;
    }
    return {
      userId: user.id,
      status: 'wishlist' as const,
    };
  }, [user?.id]);

  // Simplified user validation using auth context
  useEffect(() => {
    setAuthLoading(true);
    setAuthError(null);

    if (!user?.id) {
      setAuthError('No authenticated user found. Please log in to create a project.');
      setAuthLoading(false);
      return;
    }

    console.log('Successfully validated user ID:', user.id);
    setAuthLoading(false);
  }, [user?.id]);

  const handleCreateProject = useCallback(
    async (formData: ProjectFormValues): Promise<void> => {
      let newProjectId: string | null = null;

      try {
        // Validate required fields
        if (!formData.title?.trim()) {
          throw new Error('Project title is required');
        }

        if (!formData.userId) {
          throw new Error('User not authenticated');
        }

        // Step 1: Create metadata entities first (if needed)
        const metadataErrors: string[] = [];

        // Check if we need to create company
        const needsCompanyCreation =
          formData.company &&
          formData.company !== 'other' &&
          !companyNames.includes(formData.company);

        if (needsCompanyCreation) {
          logger.debug('Creating new company:', formData.company);
          try {
            await createCompanyMutation.mutateAsync({
              name: formData.company!, // We've already checked it's not empty
            });
            logger.info('Company created successfully:', formData.company);
          } catch (error) {
            logger.error('Failed to create company:', error);
            metadataErrors.push(`Failed to create company "${formData.company}"`);
            // Don't throw here - collect all metadata errors
          }
        }

        // Check if we need to create artist
        const needsArtistCreation =
          formData.artist &&
          !['other', 'unknown'].includes(formData.artist) &&
          !artistNames.includes(formData.artist);

        if (needsArtistCreation) {
          logger.debug('Creating new artist:', formData.artist);
          try {
            await createArtistMutation.mutateAsync({
              name: formData.artist!, // We've already checked it's not empty
            });
            logger.info('Artist created successfully:', formData.artist);
          } catch (error) {
            logger.error('Failed to create artist:', error);
            metadataErrors.push(`Failed to create artist "${formData.artist}"`);
            // Don't throw here - collect all metadata errors
          }
        }

        // Step 2: Show warning if metadata creation failed but continue
        if (metadataErrors.length > 0) {
          toast({
            title: 'Warning',
            description: `Some metadata could not be saved: ${metadataErrors.join(', ')}. The project will be created without this information.`,
            variant: 'default',
          });
        }

        // Step 3: Create the project
        const projectData = {
          title: formData.title.trim(),
          user: formData.userId,
          status: formData.status || 'wishlist',
          company: formData.company,
          artist: formData.artist,
          drill_shape: formData.drillShape,
          date_purchased: formData.datePurchased,
          date_received: formData.dateReceived,
          date_started: formData.dateStarted,
          date_completed: formData.dateCompleted,
          general_notes: formData.generalNotes,
          source_url: formData.sourceUrl,
          total_diamonds: formData.totalDiamonds ? Number(formData.totalDiamonds) : undefined,
          width: formData.width ? Number(formData.width) : undefined,
          height: formData.height ? Number(formData.height) : undefined,
          kit_category: formData.kit_category || 'full',
          image: formData.imageFile || undefined,
          tagIds: formData.tagIds || [],
        };

        const newProject = await createProjectMutation.mutateAsync(projectData);
        newProjectId = newProject.id;

        logger.info('Project created successfully:', newProjectId);

        // Step 4: Navigate to project page only after successful project creation
        navigate(`/projects/${newProjectId}`);
      } catch (error) {
        logger.error('Error in project creation flow:', error);

        // If project was created but navigation failed, still provide feedback
        if (newProjectId) {
          toast({
            title: 'Project Created',
            description:
              'Your project was created successfully, but there was an issue navigating to it.',
            variant: 'default',
          });
        }

        // Re-throw to allow form to handle the error
        throw error;
      }
    },
    [
      createProjectMutation,
      createCompanyMutation,
      createArtistMutation,
      companyNames,
      artistNames,
      navigate,
    ]
  );

  // Track all mutations loading state
  const isCreatingProject =
    createProjectMutation.isPending ||
    createCompanyMutation.isPending ||
    createArtistMutation.isPending;

  return (
    <MainLayout isAuthenticated={!!user}>
      <div className="container mx-auto px-4 py-8">
        <NewProjectHeader />

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {authError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
              <h3 className="mb-2 text-lg font-semibold">Authentication Error</h3>
              <p className="mb-4 max-w-md text-muted-foreground">{authError}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Refresh Page
              </button>
            </div>
          ) : authLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <span className="text-muted-foreground">Authenticating user...</span>
            </div>
          ) : user?.id ? (
            <ProjectForm
              ref={formRef}
              initialData={initialData}
              onSubmit={handleCreateProject}
              companies={companyNames || []}
              artists={artistNames || []}
              isLoading={isCreatingProject || metadataLoading}
              onCompanyAdded={async (newCompany: string) => {
                if (!formRef.current) return;
                logger.debug('New company added via form dialog:', newCompany);
                try {
                  // Set the new company as selected
                  formRef.current.setValue('company', newCompany);
                } catch (error) {
                  logger.error('Error setting company:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to set new company',
                    variant: 'destructive',
                  });
                }
              }}
              onArtistAdded={async (newArtist: string) => {
                if (!formRef.current) return;
                logger.debug('New artist added via form dialog:', newArtist);
                try {
                  // Set the new artist as selected
                  formRef.current.setValue('artist', newArtist);
                } catch (error) {
                  logger.error('Error setting artist:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to set new artist',
                    variant: 'destructive',
                  });
                }
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="text-warning mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">Unable to Initialize Form</h3>
              <p className="mb-4 max-w-md text-muted-foreground">
                User authentication could not be validated. Please try refreshing the page or
                logging out and back in.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default NewProject;
