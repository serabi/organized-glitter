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
import { requestPasswordReset } from '@/services/auth';
import { Mail, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Track password reset attempt
    // addBreadcrumb removed

    if (!email) {
      // addBreadcrumb removed

      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await requestPasswordReset(email);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send reset email');
      }

      setSubmitted(true);
      toast({
        title: 'Password reset email sent',
        description: 'Check your email for a link to reset your password',
      });
    } catch (error: unknown) {
      console.error('Password reset error:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send reset email. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="diamond-pattern flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Reset Password</h1>
            <p className="mt-2 text-muted-foreground">
              {!submitted
                ? 'Enter your email to receive a password reset link'
                : 'Check your email for the reset link'}
            </p>
          </div>

          <Card className="glass-card mx-auto w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
              <CardDescription>
                {!submitted
                  ? "We'll send you an email with a link to reset your password"
                  : 'Reset link sent! Check your inbox'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              ) : (
                <div className="py-4 text-center">
                  <Mail className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <p className="mb-4">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    If you don't see it in your inbox, please check your spam folder.
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

export default ForgotPassword;
