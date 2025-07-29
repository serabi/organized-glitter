/**
 * @fileoverview Project detail view component
 *
 * This component displays comprehensive project information including:
 * - Project images and details
 * - Notable dates (purchased, received, started, completed)
 * - Project notes and progress tracking
 * - Back to Dashboard navigation
 *
 * Key features:
 * - Mobile-responsive layout with optimized button placement
 * - Integrated progress notes with real-time updates
 * - Archive and delete operations with confirmation dialogs
 * - Simple navigation back to dashboard
 *
 * @author serabi
 * @since 2025-07-02
 */

// Functional components don't need to import React with modern JSX transform
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProjectType, ProjectStatus, ProgressNote } from '@/types/project';
import ImageGallery from '@/components/projects/ImageGallery';
import ProjectDetails from '@/components/projects/ProjectDetails';
import ProjectNotes from '@/components/projects/form/ProjectNotes';
import ProjectProgressNotes from '@/components/projects/ProjectProgressNotes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDateInUserTimezone, detectUserTimezone } from '@/utils/timezoneUtils';
import { PocketBaseUser } from '@/contexts/AuthContext.types';

/**
 * Props for the ProjectDetailView component
 */
interface ProjectDetailViewProps {
  /** Project data with optional progress notes */
  project: ProjectType & {
    progressNotes?: ProgressNote[];
  };
  /** Whether the interface is in mobile mode */
  isMobile: boolean;
  /** Navigation state from the previous page */
  navigationState?: {
    from?: string;
    randomizerState?: {
      selectedProjects: string[];
      shareUrl: string;
    };
  };
  /** Handler for project status changes */
  onStatusChange: (status: ProjectStatus) => void;
  /** Handler for updating project notes */
  onUpdateNotes: (notes: string) => Promise<void>;
  /** Handler for archiving the project */
  onArchive: () => void;
  /** Handler for deleting the project */
  onDelete: () => void;
  /** Navigation handler for edit mode */
  navigateToEdit: () => void;
  /** Whether any operation is currently submitting */
  isSubmitting?: boolean;
  /** Current authenticated user */
  user: PocketBaseUser | null;
}

/**
 * Project detail view component with comprehensive project information display
 *
 * This component provides a complete view of a project including images, details,
 * notable dates, notes, and progress tracking. It features simple navigation
 * back to the dashboard.
 *
 * Key Features:
 * - Mobile-responsive layout with optimized controls
 * - Real-time progress notes integration
 * - Archive/delete operations with confirmation
 * - Simple "Back to Dashboard" navigation
 *
 * @param props - Component props
 * @returns Rendered project detail view
 */
const ProjectDetailView = ({
  project,
  isMobile,
  navigationState,
  onStatusChange,
  onUpdateNotes,
  onArchive,
  onDelete,
  navigateToEdit,
  isSubmitting = false,
  user: _user,
}: ProjectDetailViewProps) => {
  // Helper function to format dates consistently using user's timezone
  const formatProjectDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not specified';

    try {
      const userTimezone = detectUserTimezone();
      return formatDateInUserTimezone(dateString, userTimezone, 'M/d/yyyy');
    } catch {
      return 'Invalid date';
    }
  };
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex-1">
          {/* Navigation area - Back to Dashboard or Randomizer */}
          <div className="mb-2 flex items-center gap-4">
            {navigationState?.from === 'randomizer' && navigationState?.randomizerState ? (
              <Link
                to={navigationState.randomizerState.shareUrl}
                className="inline-block text-accent hover:underline"
              >
                &larr; Back to Randomizer
              </Link>
            ) : (
              <Link to="/dashboard" className="inline-block text-accent hover:underline">
                &larr; Back to Dashboard
              </Link>
            )}
          </div>
          <h1 className="text-2xl font-bold">{project.title || 'Untitled Project'}</h1>
          {!project.title && <p className="text-red-500">Warning: Project title is missing</p>}
        </div>

        {isMobile ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={navigateToEdit} disabled={isSubmitting}>
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={onArchive} disabled={isSubmitting}>
              Archive
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isSubmitting}>
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your project. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={navigateToEdit} disabled={isSubmitting}>
              Edit Project
            </Button>
            <Button variant="secondary" onClick={onArchive} disabled={isSubmitting}>
              Archive
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSubmitting}>
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your project. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main image and details */}
        <div className="space-y-6 lg:col-span-5">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md dark:border-muted">
            {project.imageUrl ? (
              <div className="p-4">
                <ImageGallery imageUrl={project.imageUrl} alt={project.title} />
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center bg-secondary dark:bg-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}

            <div className="p-6">
              <ProjectDetails project={project} onStatusChange={onStatusChange} />
            </div>
          </div>
        </div>

        {/* Right column - moved Notable Dates and Project Notes above Progress Pictures */}
        <div className="space-y-6 lg:col-span-7">
          {/* Notable Dates section moved here */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-md dark:border-muted">
            <h2 className="mb-4 text-lg font-semibold">Notable Dates</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded bg-secondary p-4 dark:bg-muted">
                <h4 className="text-sm font-medium text-muted-foreground">Date Purchased</h4>
                <p className="text-foreground">{formatProjectDate(project.datePurchased)}</p>
              </div>
              <div className="rounded bg-secondary p-4 dark:bg-muted">
                <h4 className="text-sm font-medium text-muted-foreground">Date Received</h4>
                <p className="text-foreground">{formatProjectDate(project.dateReceived)}</p>
              </div>
              <div className="rounded bg-secondary p-4 dark:bg-muted">
                <h4 className="text-sm font-medium text-muted-foreground">Date Started</h4>
                <p className="text-foreground">{formatProjectDate(project.dateStarted)}</p>
              </div>
              <div className="rounded bg-secondary p-4 dark:bg-muted">
                <h4 className="text-sm font-medium text-muted-foreground">Date Completed</h4>
                <p className="text-foreground">{formatProjectDate(project.dateCompleted)}</p>
              </div>
            </div>

            {/* Project Notes section */}
            <div className="mt-6">
              <ProjectNotes
                notes={project.generalNotes || ''}
                onSave={onUpdateNotes}
                readOnly={isSubmitting}
              />
            </div>
          </div>

          {/* Progress Notes */}
          <ProjectProgressNotes
            project={project}
            key={project.id} /* Add key to force re-render when project changes */
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailView;
