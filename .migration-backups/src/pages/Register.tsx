import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import AuthForm from '@/components/auth/AuthForm';
import SocialLogin from '@/components/auth/SocialLogin';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { registerWithPassword, loginWithOAuth2 } from '@/services/auth';
import { logger } from '@/utils/logger';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, initialCheckComplete } = useAuth();

  // Check if user is already logged in
  useEffect(() => {
    if (!isLoading && initialCheckComplete && isAuthenticated) {
      navigate('/overview', { replace: true });
    }
  }, [isAuthenticated, isLoading, initialCheckComplete, navigate]);

  const handleRegister = async (
    data:
      | {
          email: string;
          password: string;
          confirmPassword: string;
          username: string;
        }
      | {
          email: string;
          password: string;
        }
  ) => {
    // Ensure we have the registration data structure
    if (!('confirmPassword' in data) || !('username' in data)) {
      setError('Registration requires password confirmation and username');
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const result = await registerWithPassword(data);

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast({
        title: 'Verification Email Sent!',
        description:
          'Your account has been created. Please check your email to verify your account before logging in.',
        duration: 10000, // Keep message longer
      });

      // Navigate to email confirmation page
      navigate('/email-confirmation', { state: { email: data.email }, replace: true });
    } catch (err) {
      logger.error('Registration error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await loginWithOAuth2('google');

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast({
        title: 'Registration successful!',
        description: 'Welcome to Organized Glitter!',
      });

      // Navigate immediately after successful OAuth registration
      navigate('/overview', { replace: true });
    } catch (err) {
      logger.error('Google signup error:', err);
      setError('Failed to sign up with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await loginWithOAuth2('discord');

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast({
        title: 'Registration successful!',
        description: 'Welcome to Organized Glitter!',
      });

      // Navigate immediately after successful OAuth registration
      navigate('/overview', { replace: true });
    } catch (err) {
      logger.error('Discord signup error:', err);
      setError('Failed to sign up with Discord. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
              Create your account
            </h2>
          </div>
          <div className="mt-8 space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/15 p-4">
                <div className="text-sm text-destructive">{error}</div>
              </div>
            )}
            <AuthForm type="register" loading={loading} onSubmit={handleRegister} error={error} />

            <div className="mt-6">
              <SocialLogin
                onGoogleLogin={handleGoogleLogin}
                onDiscordLogin={handleDiscordLogin}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Register;
