import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { pb } from '@/lib/pocketbase';
import { ClientResponseError } from 'pocketbase';
import { Lock, ArrowLeft, CheckCircle, Shield, Eye, EyeOff } from 'lucide-react';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to change your password',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [user, navigate, toast]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your current password');
      return;
    }

    // Validate new password strength
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join('. '));
      return;
    }

    setLoading(true);

    try {
      // First, verify current password by re-authenticating
      // This ensures the user is actually authenticated with current password
      if (!user?.email) {
        throw new Error('User email not available');
      }
      await pb.collection('users').authWithPassword(user.email, currentPassword, {});

      // Then update the password using the proper PocketBase method
      // Using oldPassword field for secure password changes
      if (!user?.id) {
        throw new Error('User ID not available');
      }
      await pb.collection('users').update(
        user.id,
        {
          password: newPassword,
          passwordConfirm: confirmPassword,
          oldPassword: currentPassword,
        },
        {}
      );

      setSuccess(true);
      toast({
        title: 'Password changed successfully',
        description: 'Your password has been updated. Please log in again for security.',
      });

      // Clear form for security
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Log out the user and redirect to login after 3 seconds for security
      setTimeout(async () => {
        await signOut();
        navigate('/login');
      }, 3000);
    } catch (err: unknown) {
      logger.criticalError('Password change error', err);

      let errorMessage = 'Failed to change password. Please try again.';

      // Handle PocketBase specific errors
      if (err instanceof ClientResponseError) {
        if (err.status === 400) {
          // Check for specific error messages
          if (err.message.includes('password') || err.message.includes('auth')) {
            errorMessage = 'Current password is incorrect.';
          } else if (err.message.includes('validation')) {
            errorMessage = 'Password does not meet security requirements.';
          } else {
            errorMessage = err.message || 'Invalid request. Please check your input.';
          }
        } else if (err.status === 401) {
          errorMessage = 'Current password is incorrect.';
        } else if (err.status === 403) {
          errorMessage = 'Not authorized to change password.';
        } else if (err.status === 429) {
          errorMessage = 'Too many attempts. Please try again later.';
        } else {
          errorMessage = err.message || 'Password change failed.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <MainLayout>
      <div className="diamond-pattern flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Change Password</h1>
            <p className="mt-2 text-muted-foreground">
              {!success ? 'Update your account password' : 'Password changed successfully'}
            </p>
          </div>

          <Card className="glass-card mx-auto w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                {!success ? 'Change Password' : 'Password Change Complete'}
              </CardTitle>
              <CardDescription>
                {!success
                  ? 'Enter your current password and choose a new secure password'
                  : 'You will be logged out for security purposes'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!success ? (
                <>
                  {/* Security notice */}
                  <div className="mb-6 rounded-lg bg-muted p-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Signed in as:</span>
                      <span className="font-medium">{user.email}</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="Enter your current password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                          autoComplete="current-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Enter your new password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your new password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Password requirements */}
                    <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                      <p className="mb-2 font-medium">Password requirements:</p>
                      <ul className="list-inside list-disc space-y-1 text-xs">
                        <li>At least 8 characters long</li>
                        <li>Contains uppercase and lowercase letters</li>
                        <li>Contains at least one number</li>
                        <li>Different from your current password</li>
                      </ul>
                    </div>

                    {error && (
                      <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Changing...' : 'Change Password'}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="py-4 text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <p className="mb-4">Your password has been successfully changed</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>For security purposes, you will be automatically logged out.</p>
                    <p>Please log in again with your new password.</p>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter>
              <div className="w-full text-center">
                <Button
                  variant="link"
                  onClick={() => navigate('/profile')}
                  className="text-accent hover:underline"
                  disabled={success}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Profile
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ChangePassword;
