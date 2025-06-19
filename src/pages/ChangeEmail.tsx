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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { pb } from '@/lib/pocketbase';
import { ClientResponseError } from 'pocketbase';
import { Mail, ArrowLeft, CheckCircle, Shield } from 'lucide-react';

/**
 * ChangeEmail component for securely changing user email address
 * Follows PocketBase best practices for email change requests
 */

const ChangeEmail = () => {
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to change your email address',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [user, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newEmail) {
      toast({
        title: 'Error',
        description: 'Please enter your new email address',
        variant: 'destructive',
      });
      return;
    }

    if (newEmail === user?.email) {
      toast({
        title: 'Error',
        description: 'New email must be different from your current email',
        variant: 'destructive',
      });
      return;
    }

    // Comprehensive email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    // Additional validation for email length and format
    if (newEmail.length > 254) {
      toast({
        title: 'Error',
        description: 'Email address is too long',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Request email change using PocketBase
      // Using TypeScript-safe collection method with proper options
      await pb.collection('users').requestEmailChange(newEmail, {});

      setSubmitted(true);
      toast({
        title: 'Email change request sent',
        description: 'Check your new email for a confirmation link',
      });
    } catch (error: unknown) {
      console.error('Email change request error:', error);

      let errorMessage = 'Failed to request email change. Please try again.';

      // Handle PocketBase specific errors
      if (error instanceof ClientResponseError) {
        if (error.status === 400) {
          errorMessage = 'Invalid email address or email already in use.';
        } else if (error.status === 429) {
          errorMessage = 'Too many requests. Please try again later.';
        } else {
          errorMessage = error.message || 'Request failed. Please try again.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
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
            <h1 className="text-3xl font-bold">Change Email</h1>
            <p className="mt-2 text-muted-foreground">
              {!submitted ? 'Update your email address' : 'Confirmation email sent'}
            </p>
          </div>

          <Card className="glass-card mx-auto w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Change Email Address</CardTitle>
              <CardDescription>
                {!submitted
                  ? "Enter your new email address. You'll receive a confirmation link."
                  : 'Please check your new email for a confirmation link'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!submitted ? (
                <>
                  {/* Current email display */}
                  <div className="mb-6 rounded-lg bg-muted p-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Current email:</span>
                      <span className="font-medium">{user.email}</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-email">New Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="new-email"
                          type="email"
                          placeholder="Enter your new email"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          className="pl-10"
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                      <p className="mb-2 font-medium">What happens next:</p>
                      <ol className="list-inside list-decimal space-y-1 text-xs">
                        <li>We'll send a confirmation link to your new email</li>
                        <li>Click the link to confirm the change</li>
                        <li>Your email will be updated after confirmation</li>
                        <li>You'll need to log in again with your new email</li>
                      </ol>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Confirmation Email'}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="py-4 text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <p className="mb-4">
                    We've sent a confirmation link to <strong>{newEmail}</strong>
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Click the link in the email to confirm your new address.</p>
                    <p>If you don't see it, please check your spam folder.</p>
                    <p className="font-medium">
                      Your current email ({user.email}) will remain active until you confirm the
                      change.
                    </p>
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

export default ChangeEmail;
