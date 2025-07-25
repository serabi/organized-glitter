import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';
import type { PocketBaseUser } from '@/contexts/AuthContext.types';
import { analytics } from '@/services/analytics';
import { ClientResponseError } from 'pocketbase';
import { ErrorHandler, FieldMapper } from '@/services/pocketbase/base';

const authLogger = createLogger('AuthService');

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
}

export interface AuthResult {
  success: boolean;
  user?: PocketBaseUser;
  error?: string;
}

/**
 * Authenticate user with email and password
 */
export const loginWithPassword = async (data: LoginData): Promise<AuthResult> => {
  try {
    authLogger.debug('Attempting password authentication');

    analytics.auth.loginAttempted('email');

    const authData = await pb.collection('users').authWithPassword(data.email, data.password);

    authLogger.debug('Password authentication successful, checking verification status');

    // Debug: Check if PocketBase auth store is updated
    authLogger.debug('After authWithPassword - PocketBase state:', {
      isValid: pb.authStore.isValid,
      hasRecord: !!pb.authStore.record,
      userId: pb.authStore.record?.id,
    });

    const userRecord = authData.record as PocketBaseUser;

    if (!userRecord.verified) {
      authLogger.warn('User email not verified. Login prevented.', {
        userId: userRecord.id,
        email: userRecord.email,
      });
      pb.authStore.clear();
      return {
        success: false,
        error:
          'Please verify your email address before logging in. Check your inbox for a verification link.',
      };
    }

    authLogger.debug('User email verified. Login allowed.', { userId: userRecord.id });

    analytics.auth.loginSucceeded('email', userRecord.id);

    return {
      success: true,
      user: userRecord,
    };
  } catch (error) {
    authLogger.error('Password authentication failed:', error);

    const handledError = ErrorHandler.handleError(error, 'Password authentication');
    const errorMessage =
      ErrorHandler.getUserMessage(handledError) || 'Authentication failed. Please check your credentials.';

    analytics.auth.loginFailed('email', errorMessage);
    analytics.error.authenticationFailed('email', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Register new user account
 */
export const registerWithPassword = async (data: RegisterData): Promise<AuthResult> => {
  if (data.password !== data.confirmPassword) {
    return { success: false, error: 'Passwords do not match' };
  }

  try {
    authLogger.debug('Attempting user registration');

    const fieldMapper = FieldMapper.createWithCommonMappings({
      confirmPassword: 'passwordConfirm',
      passwordConfirm: 'passwordConfirm', // Preserve case for PocketBase auth
      betaTester: 'beta_tester',
    });

    const createData = fieldMapper.toBackend({
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      username: data.username,
      betaTester: true,
    });

    authLogger.debug('Attempting to create user with data:', createData);
    const newUser = await pb.collection('users').create(createData);
    authLogger.debug('User account created successfully in PocketBase', { userId: newUser.id });

    // Track signup completion in PostHog
    analytics.auth.signupCompleted('email', {
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username,
      name: newUser.username, // Use username as name since name field doesn't exist
      isNewRecord: true,
    });
    authLogger.debug('Signup event tracked in PostHog', { userId: newUser.id, method: 'email' });

    authLogger.debug('Requesting email verification for:', data.email);
    await pb.collection('users').requestVerification(data.email);
    authLogger.debug('Email verification requested successfully');

    return {
      success: true,
      user: undefined,
    };
  } catch (error) {
    authLogger.error('User registration failed:', error);

    const handledError = ErrorHandler.handleError(error, 'User registration');
    const errorMessage =
      ErrorHandler.getUserMessage(handledError) || 'An unknown error occurred during registration.';

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Authenticate with OAuth2 provider (Google, Discord)
 */
const ensureBetaTester = async (user: PocketBaseUser): Promise<PocketBaseUser> => {
  if (user && (user.beta_tester === undefined || user.beta_tester === false)) {
    try {
      authLogger.debug('Setting default beta_tester value for OAuth2 user', { userId: user.id });
      const updatedUser = await pb.collection('users').update(user.id, { beta_tester: true });
      return updatedUser as PocketBaseUser;
    } catch (updateError) {
      authLogger.warn('Failed to update beta_tester field for OAuth2 user:', {
        userId: user.id,
        error: updateError,
      });
    }
  }
  return user;
};

export const loginWithOAuth2 = async (provider: 'google' | 'discord'): Promise<AuthResult> => {
  try {
    authLogger.debug(`Attempting OAuth2 authentication with ${provider}`);

    analytics.auth.loginAttempted(provider);

    // Debug: Get auth methods to see what URLs are being constructed (dev only)
    if (import.meta.env.DEV) {
      const authMethods = await pb.collection('users').listAuthMethods();
      const providerInfo = (
        authMethods as {
          authProviders?: Array<{
            name: string;
            authUrl: string;
            state: string;
            codeVerifier: string;
          }>;
        }
      ).authProviders?.find(p => p.name === provider);

      if (providerInfo) {
        authLogger.debug(`${provider} provider info:`, {
          name: providerInfo.name,
          authUrl: providerInfo.authUrl,
          state: providerInfo.state,
          codeVerifier: providerInfo.codeVerifier,
        });

        // Extract redirect_uri from authUrl
        const url = new URL(providerInfo.authUrl);
        const redirectUri = url.searchParams.get('redirect_uri');
        authLogger.debug(`${provider} redirect_uri being sent:`, redirectUri);
        authLogger.debug(`PocketBase base URL:`, pb.baseURL);
      }
    }

    const authData = await pb.collection('users').authWithOAuth2({ provider });

    authLogger.debug(`OAuth2 authentication with ${provider} successful`, {
      isNewRecord: (authData.meta as Record<string, unknown>)?.isNewRecord,
      userId: authData.record.id,
    });

    const user = await ensureBetaTester(authData.record as PocketBaseUser);

    // Track signup completion for new OAuth users
    const isNewRecord = (authData.meta as Record<string, unknown>)?.isNewRecord;
    if (isNewRecord) {
      analytics.auth.signupCompleted(provider, {
        userId: user.id,
        email: user.email,
        username: user.username,
        name: user.username, // Use username as name since name field doesn't exist
        isNewRecord: true,
      });
      authLogger.debug('New OAuth user signup tracked in PostHog', {
        userId: user.id,
        method: provider,
      });
    } else {
      // Track login for existing users
      analytics.auth.loginSucceeded(provider, user.id);
      authLogger.debug('Existing OAuth user login tracked in PostHog', {
        userId: user.id,
        method: provider,
      });
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    authLogger.error(`OAuth2 authentication with ${provider} failed:`, error);

    // Enhanced error logging for OAuth2 debugging (dev only)
    if (import.meta.env.DEV) {
      authLogger.error(`${provider} authentication detailed error:`, {
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorData: error instanceof ClientResponseError ? error.data : null,
      });
    }

    const handledError = ErrorHandler.handleError(error, `${provider} authentication`);
    const errorMessage =
      ErrorHandler.getUserMessage(handledError) || `${provider} authentication failed. Please try again.`;

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Request password reset email
 */
export const requestPasswordReset = async (email: string): Promise<AuthResult> => {
  try {
    authLogger.debug('Requesting password reset');

    await pb.collection('users').requestPasswordReset(email);

    authLogger.debug('Password reset email sent');

    return {
      success: true,
    };
  } catch (error) {
    authLogger.error('Password reset request failed:', error);

    const handledError = ErrorHandler.handleError(error, 'Password reset request');
    const errorMessage = ErrorHandler.getUserMessage(handledError) || 'Failed to send password reset email';

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Confirm password reset with token
 */
export const confirmPasswordReset = async (
  token: string,
  password: string,
  passwordConfirm: string
): Promise<AuthResult> => {
  try {
    authLogger.debug('Confirming password reset');

    await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm);

    authLogger.debug('Password reset confirmed');

    return {
      success: true,
    };
  } catch (error) {
    authLogger.error('Password reset confirmation failed:', error);

    const handledError = ErrorHandler.handleError(error, 'Password reset confirmation');
    const errorMessage = ErrorHandler.getUserMessage(handledError) || 'Failed to reset password';

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Confirm email verification with token
 */
export const confirmEmailVerification = async (token: string): Promise<AuthResult> => {
  try {
    authLogger.debug('Confirming email verification');

    await pb.collection('users').confirmVerification(token);

    authLogger.debug('Email verification confirmed');

    return {
      success: true,
    };
  } catch (error) {
    authLogger.error('Email verification confirmation failed:', error);

    const handledError = ErrorHandler.handleError(error, 'Email verification confirmation');
    let errorMessage = ErrorHandler.getUserMessage(handledError) || 'Failed to verify email';

    // Keep the specific token expired handling for better UX
    if (error instanceof ClientResponseError && error.data) {
      if (error.data.message?.includes('token') || error.data.message?.includes('expired')) {
        errorMessage =
          'Verification link has expired or is invalid. Please request a new verification email.';
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};
