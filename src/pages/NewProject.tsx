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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { createLogger } from '@/utils/secureLogger';
import { useDebugPerformance } from '@/hooks/useDebugPerformance';

const logger = createLogger('NewProject');

// Helper function to validate PocketBase ID format
const isValidPocketBaseId = (id: string): boolean => {
  // PocketBase uses 15 character IDs with lowercase letters and numbers
  const pocketbaseIdRegex = /^[a-z0-9]{15}$/;
  return pocketbaseIdRegex.test(id);
};

const NewProject = () => {
  const [validatedUserId, setValidatedUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Debug mode detection
  const [searchParams] = useSearchParams();
  const isDebugMode = searchParams.get('debug') === 'true';
  const [debugEvents, setDebugEvents] = useState<string[]>([]);

  const { user } = useAuth();
  const { companyNames, artistNames, isLoading } = useMetadata();
  const metadataLoading = isLoading.companies || isLoading.artists;

  // Debug performance monitoring
  const { metrics, logEvent } = useDebugPerformance('NewProject', isDebugMode);

  // React Query mutations
  const createProjectMutation = useCreateProject();
  const createCompanyMutation = useCreateCompany();
  const createArtistMutation = useCreateArtist();

  const navigate = useNavigate();

  // Create a ref to store the form methods
  const formRef = useRef<ProjectFormRef>(null);

  // Debug event logging
  const addDebugEvent = useCallback((event: string, data?: any) => {
    if (!isDebugMode) return;
    const timestamp = new Date().toLocaleTimeString();
    const message = `${timestamp}: ${event}${data ? ` - ${JSON.stringify(data)}` : ''}`;
    setDebugEvents(prev => [...prev.slice(-20), message]);
    logEvent(event, data);
  }, [isDebugMode, logEvent]);

  // Memoize initial data to prevent unnecessary form resets
  const initialData = useMemo(() => {
    if (!validatedUserId) {
      return undefined;
    }
    return {
      userId: validatedUserId,
      status: 'wishlist' as const,
    };
  }, [validatedUserId]);

  // Simplified user validation using auth context
  useEffect(() => {
    let isMounted = true;

    const validateUser = () => {
      if (!isMounted) return;

      addDebugEvent('Auth validation started', { userId: user?.id });
      setAuthLoading(true);
      setAuthError(null);

      if (!user?.id) {
        if (isMounted) {
          addDebugEvent('Auth validation failed: No user ID');
          setAuthError('No authenticated user found. Please log in to create a project.');
          setAuthLoading(false);
        }
        return;
      }

      // Validate that the user ID is a proper PocketBase ID format
      if (!isValidPocketBaseId(user.id)) {
        console.error('User ID is not a valid PocketBase ID format:', user.id);
        if (isMounted) {
          addDebugEvent('Auth validation failed: Invalid ID format', { userId: user.id });
          setAuthError(
            'User authentication format is invalid. Please try logging out and back in.'
          );
          setAuthLoading(false);
        }
        return;
      }

      // Only set validatedUserId if we have a valid PocketBase ID
      console.log('Successfully validated user ID:', user.id);
      if (isMounted) {
        addDebugEvent('Auth validation successful', { userId: user.id });
        setValidatedUserId(user.id);
        setAuthLoading(false);
      }
    };

    validateUser();

    return () => {
      isMounted = false;
    };
  }, [user?.id, addDebugEvent]);

  const handleCreateProject = useCallback(
    async (formData: ProjectFormValues): Promise<void> => {
      let newProjectId: string | null = null;

      try {
        addDebugEvent('Project creation started', { title: formData.title?.trim() });

        // Validate required fields
        if (!formData.title?.trim()) {
          addDebugEvent('Project creation failed: Empty title');
          throw new Error('Project title is required');
        }

        if (!formData.userId) {
          addDebugEvent('Project creation failed: No user ID');
          throw new Error('User not authenticated');
        }

        if (!isValidPocketBaseId(formData.userId)) {
          addDebugEvent('Project creation failed: Invalid user ID format');
          throw new Error(
            'User authentication is incomplete. Please refresh the page and try again.'
          );
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
        addDebugEvent('Creating project with data', {
          title: formData.title.trim(),
          userId: formData.userId,
          status: formData.status || 'wishlist',
          hasImage: !!formData.imageFile,
          tagCount: formData.tagIds?.length || 0,
        });

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

        addDebugEvent('Project created successfully', { projectId: newProjectId });
        logger.info('Project created successfully:', newProjectId);

        // Step 4: Navigate to project page only after successful project creation
        addDebugEvent('Navigating to project page', { projectId: newProjectId });
        navigate(`/projects/${newProjectId}`);
      } catch (error) {
        addDebugEvent('Project creation failed', { error: error.message });
        logger.error('Error in project creation flow:', error);

        // If project was created but navigation failed, still provide feedback
        if (newProjectId) {
          addDebugEvent('Project created but navigation failed', { projectId: newProjectId });
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
      addDebugEvent,
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
          ) : validatedUserId ? (
            <ProjectForm
              ref={formRef}
              initialData={initialData}
              onSubmit={handleCreateProject}
              companies={companyNames}
              artists={artistNames}
              isLoading={isCreatingProject || metadataLoading}
              onCompanyAdded={async (newCompany: string) => {
                if (!formRef.current) return;
                addDebugEvent('Company added via dialog', { company: newCompany });
                logger.debug('New company added via form dialog:', newCompany);
                try {
                  // Set the new company as selected
                  formRef.current.setValue('company', newCompany);
                  addDebugEvent('Company value set in form', { company: newCompany });
                } catch (error) {
                  addDebugEvent('Error setting company in form', { error: error.message });
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
                addDebugEvent('Artist added via dialog', { artist: newArtist });
                logger.debug('New artist added via form dialog:', newArtist);
                try {
                  // Set the new artist as selected
                  formRef.current.setValue('artist', newArtist);
                  addDebugEvent('Artist value set in form', { artist: newArtist });
                } catch (error) {
                  addDebugEvent('Error setting artist in form', { error: error.message });
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

        {/* Debug overlay */}
        {isDebugMode && (
          <div className="fixed bottom-4 right-4 max-w-sm bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-h-96 overflow-y-auto">
            <div className="font-bold mb-2">Debug Info</div>
            
            <div className="mb-3">
              <div className="text-yellow-300">Performance:</div>
              <div>Renders: {metrics.renderCount}</div>
              <div>Avg Render Time: {metrics.averageRenderTime.toFixed(0)}ms</div>
              {metrics.isHighFrequencyRendering && (
                <div className="text-red-400">⚠ High Frequency Rendering</div>
              )}
              {metrics.memoryUsage && (
                <div>Memory: {metrics.memoryUsage.used} / {metrics.memoryUsage.limit}</div>
              )}
            </div>

            <div>
              <div className="text-green-300 mb-1">Recent Events:</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {debugEvents.slice(-10).map((event, index) => (
                  <div key={index} className="text-xs break-words">
                    {event}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default NewProject;
