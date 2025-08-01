import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import MainLayout from '@/components/layout/MainLayout';
import { AlertTriangle } from 'lucide-react';
import { createLogger } from '@/utils/logger';

const deleteAccountLogger = createLogger('DeleteAccount');

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [notes, setNotes] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Track page load
  React.useEffect(() => {
    // addBreadcrumb removed
  }, [user]);

  const handleCancel = () => {
    // Track cancellation
    // addBreadcrumb removed

    navigate('/profile');
  };

  const handleConfirmationChange = (checked: boolean) => {
    // Track confirmation checkbox changes
    // addBreadcrumb removed

    setIsConfirmed(checked);
  };

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;

    // Track feedback changes (throttled for significant changes)
    if (newNotes.length === 0 || newNotes.length % 50 === 0 || notes.length === 0) {
      // addBreadcrumb removed
    }

    setNotes(newNotes);
  };

  const handleDeleteAccount = async () => {
    if (!isConfirmed) {
      toast({
        title: 'Confirmation required',
        description: 'Please confirm that you want to delete your account',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to delete your account',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    deleteAccountLogger.debug(
      '🔐 [SECURE DELETION] Starting account deletion process for user:',
      user.id
    );

    try {
      // Manual cascade deletion - delete related records first to avoid foreign key constraints
      deleteAccountLogger.debug(
        '🗑️ [SECURE DELETION] Starting manual cascade deletion for user:',
        user.id
      );

      // Step 1: Delete project_tags records for user's projects
      deleteAccountLogger.debug('🏷️ [SECURE DELETION] Deleting project tags...');
      const userProjects = await pb.collection('projects').getFullList({
        filter: `user = "${user.id}"`,
        fields: 'id',
      });

      for (const project of userProjects) {
        const projectTags = await pb.collection('project_tags').getFullList({
          filter: `project = "${project.id}"`,
          fields: 'id',
        });

        for (const tag of projectTags) {
          await pb.collection('project_tags').delete(tag.id);
        }
      }

      // Step 2: Delete progress notes
      deleteAccountLogger.debug('📝 [SECURE DELETION] Deleting progress notes...');
      const progressNotes = await pb.collection('progress_notes').getFullList({
        filter: `project.user = "${user.id}"`,
        fields: 'id',
      });

      for (const note of progressNotes) {
        await pb.collection('progress_notes').delete(note.id);
      }

      // Step 3: Delete projects
      deleteAccountLogger.debug('📋 [SECURE DELETION] Deleting projects...');
      for (const project of userProjects) {
        await pb.collection('projects').delete(project.id);
      }

      // Step 4: Delete user's tags, companies, and artists
      deleteAccountLogger.debug('🏢 [SECURE DELETION] Deleting user data...');
      const [tags, companies, artists] = await Promise.all([
        pb.collection('tags').getFullList({ filter: `user = "${user.id}"`, fields: 'id' }),
        pb.collection('companies').getFullList({ filter: `user = "${user.id}"`, fields: 'id' }),
        pb.collection('artists').getFullList({ filter: `user = "${user.id}"`, fields: 'id' }),
      ]);

      await Promise.all([
        ...tags.map(tag => pb.collection('tags').delete(tag.id)),
        ...companies.map(company => pb.collection('companies').delete(company.id)),
        ...artists.map(artist => pb.collection('artists').delete(artist.id)),
      ]);

      // Step 5: Finally delete the user account
      deleteAccountLogger.debug('👤 [SECURE DELETION] Deleting user account...');
      await pb.collection('users').delete(user.id);

      deleteAccountLogger.debug(
        '✅ [SECURE DELETION] User account and all related data deleted successfully'
      );

      // Step 6: Sign out user for security (user is already deleted)
      deleteAccountLogger.debug('🚪 [SECURE DELETION] Signing out user session');
      await signOut();

      // Step 7: Show success message
      toast({
        title: 'Account deleted successfully',
        description: 'Your account and all related data have been permanently removed.',
      });

      deleteAccountLogger.debug('✅ [SECURE DELETION] Process completed successfully');

      // Redirect to home page
      navigate('/');
    } catch (error) {
      // SECURE: Log full details to console for debugging (dev tools only)
      deleteAccountLogger.error('❌ [SECURE DELETION] Error in deletion process:', error);

      // SECURE: Categorize errors and show safe user messages only
      let userMessage = 'Failed to delete your account. Please try again or contact support.';
      let shouldSignOut = false;

      if (error && typeof error === 'object') {
        const errorObj = error as { status?: number; message?: string }; // Safe casting for error object

        // Check for specific error patterns without exposing details
        if (errorObj.status === 403) {
          deleteAccountLogger.error(
            '❌ [DEBUG] Permission denied - check users collection delete rules'
          );
          userMessage =
            'You do not have permission to perform this action. Please contact support.';
        } else if (errorObj.status === 404) {
          deleteAccountLogger.error('❌ [DEBUG] User record not found');
          userMessage = 'Account not found. It may have already been deleted.';
          shouldSignOut = true;
        } else if (errorObj.status === 400) {
          deleteAccountLogger.error('❌ [DEBUG] Bad request - possible validation error');
          userMessage = 'Invalid request. Please try again or contact support.';
        } else if (error instanceof Error && error.message.includes('already been deleted')) {
          deleteAccountLogger.error('❌ [DEBUG] User already deleted');
          userMessage = 'Your account has already been deleted.';
          shouldSignOut = true;
        } else {
          deleteAccountLogger.error('❌ [DEBUG] Unknown error during deletion');
        }
      }

      // Show safe user message
      toast({
        title: shouldSignOut ? 'Account Status' : 'Error',
        description: userMessage,
        variant: shouldSignOut ? 'default' : 'destructive',
      });

      // Sign out and redirect if account doesn't exist
      if (shouldSignOut) {
        await signOut();
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="dark:glass-card mx-auto max-w-2xl rounded-lg border border-destructive/30 bg-card text-card-foreground shadow">
          <div className="border-b border-border p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h1 className="text-2xl font-bold text-destructive">Delete Your Account</h1>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4">
              <p className="font-medium">Warning: This action cannot be undone</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Deleting your account will permanently remove all your data, including:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>All your diamond art projects</li>
                <li>Progress images</li>
                <li>Personal profile information</li>
                <li>Account settings and preferences</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="feedback" className="text-base font-medium">
                  We'd appreciate your feedback (optional)
                </Label>
                <p className="mb-2 text-sm text-muted-foreground">
                  Please let us know why you're leaving so we can improve our service
                </p>
                <Textarea
                  id="feedback"
                  placeholder="Share your thoughts with us..."
                  value={notes}
                  onChange={handleFeedbackChange}
                  className="h-32"
                />
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="confirm"
                  checked={isConfirmed}
                  onCheckedChange={handleConfirmationChange}
                />
                <Label
                  htmlFor="confirm"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand that this action is permanent and cannot be undone
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 border-t border-border bg-muted/50 p-6">
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!isConfirmed || isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DeleteAccount;
