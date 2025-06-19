import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { ClientResponseError } from 'pocketbase';
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const ConfirmEmailChange = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token } = useParams<{ token: string }>();

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      toast({
        title: 'Invalid or missing link',
        description: 'Please use the link from your email to confirm the change',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [token, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please enter your current password');
      return;
    }

    if (!token) {
      setError('Email change token is missing or invalid');
      return;
    }

    setLoading(true);

    try {
      // Confirm email change using PocketBase
      // Returns boolean as per updated SDK
      const confirmed = await pb.collection('users').confirmEmailChange(
        token,
        password,
        {} // options parameter for consistency
      );

      if (confirmed) {
        setSuccess(true);
        toast({
          title: 'Email changed successfully',
          description: 'Your email has been updated. Please log in again.',
        });

        // Clear form
        setPassword('');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        throw new Error('Email change confirmation failed');
      }
    } catch (err: unknown) {
      console.error('Email change confirmation error:', err);

      let errorMessage = 'Failed to confirm email change. Please try again.';

      // Handle PocketBase specific errors
      if (err instanceof ClientResponseError) {
        if (err.status === 400) {
          errorMessage = 'Invalid token or password. Please check your credentials.';
        } else if (err.status === 404) {
          errorMessage = 'Invalid or expired confirmation link.';
        } else if (err.status === 429) {
          errorMessage = 'Too many attempts. Please try again later.';
        } else {
          errorMessage = err.message || 'Confirmation failed. Please try again.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null; // Will redirect via useEffect
  }

  return (
    <MainLayout>
      <div className="diamond-pattern flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Confirm Email Change</h1>
            <p className="mt-2 text-muted-foreground">
              {!success
                ? 'Enter your password to confirm the change'
                : 'Your email has been successfully updated'}
            </p>
          </div>

          <Card className="glass-card mx-auto w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                {!success ? 'Confirm Email Change' : 'Email Change Complete'}
              </CardTitle>
              <CardDescription>
                {!success
                  ? 'Enter your current password to complete the email change'
                  : 'You will be logged out and redirected to login'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!success ? (
                <>
                  {/* Security notice */}
                  <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                    <div className="flex items-start space-x-2 text-sm">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                      <div className="text-blue-800 dark:text-blue-200">
                        <p className="mb-1 font-medium">Security verification required</p>
                        <p className="text-xs">
                          We need your current password to confirm this email change for security
                          purposes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your current password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="pl-10"
                          required
                          autoComplete="current-password"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                      <p className="mb-2 font-medium">After confirmation:</p>
                      <ol className="list-inside list-decimal space-y-1 text-xs">
                        <li>Your email address will be updated</li>
                        <li>You'll be automatically logged out</li>
                        <li>Use your new email to log in next time</li>
                      </ol>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Confirming...' : 'Confirm Email Change'}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="py-4 text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <p className="mb-4">Your email address has been successfully updated</p>
                  <p className="text-sm text-muted-foreground">
                    You will be logged out and redirected to the login page in a few seconds...
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
                  disabled={success}
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

export default ConfirmEmailChange;
