import React, { useState, useEffect, useRef } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we have a valid hash/token in the URL
  useEffect(() => {
    const checkSession = async () => {
      // Check for PocketBase password reset token in URL params
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      // addBreadcrumb removed

      // If we don't have a token, redirect to forgot password
      if (!token) {
        // addBreadcrumb removed

        toast({
          title: 'Invalid or expired link',
          description: 'Please request a new password reset link',
          variant: 'destructive',
        });
        navigate('/forgot-password');
      }
    };

    checkSession();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // addBreadcrumb removed

    if (!password || !confirmPassword) {
      // addBreadcrumb removed

      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      // addBreadcrumb removed

      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      // addBreadcrumb removed

      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // Get the token from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        throw new Error('Password reset token is missing');
      }

      // PocketBase password reset confirmation
      await pb.collection('users').confirmPasswordReset(token, password, confirmPassword);

      // addBreadcrumb removed

      setSuccess(true);
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully reset',
      });

      // Clear form
      setPassword('');
      setConfirmPassword('');

      // Redirect to login after 3 seconds
      redirectTimeoutRef.current = setTimeout(() => {
        // addBreadcrumb removed
        navigate('/login');
      }, 3000);
    } catch (err: unknown) {
      console.error('Password reset error:', err);

      // addBreadcrumb removed

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  return (
    <MainLayout>
      <div className="diamond-pattern flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Reset Your Password</h1>
            <p className="mt-2 text-muted-foreground">
              {!success
                ? 'Create a new password for your account'
                : 'Your password has been successfully reset'}
            </p>
          </div>

          <Card className="glass-card mx-auto w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                {!success ? 'Create New Password' : 'Password Reset Complete'}
              </CardTitle>
              <CardDescription>
                {!success
                  ? 'Your new password must be at least 6 characters long'
                  : 'You can now log in with your new password'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!success ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your new password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {error && <div className="text-sm text-destructive">{error}</div>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </form>
              ) : (
                <div className="py-4 text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <p className="mb-4">Your password has been successfully reset</p>
                  <p className="text-sm text-muted-foreground">
                    You will be redirected to the login page in a few seconds...
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter>
              <div className="w-full text-center">
                <Button
                  variant="link"
                  onClick={() => navigate('/login')}
                  className="text-accent hover:underline"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ResetPassword;
