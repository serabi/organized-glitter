/**
 * Safely access environment variables with TypeScript support
 * This provides type checking and runtime validation for environment variables
 */

interface EnvVars {
  VITE_POCKETBASE_URL: string;
  VITE_APP_VERSION: string;
  VITE_APP_URL: string;
  VITE_RECAPTCHA_SITE_KEY?: string;
  MODE: string;
}

// Runtime validation of required environment variables
const validateEnv = (): EnvVars => {
  const required: (keyof EnvVars)[] = ['VITE_POCKETBASE_URL', 'VITE_APP_VERSION', 'VITE_APP_URL'];

  const missing = required.filter(key => !import.meta.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    VITE_POCKETBASE_URL: import.meta.env.VITE_POCKETBASE_URL,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
    VITE_APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:3000',
    VITE_RECAPTCHA_SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
    MODE: import.meta.env.MODE,
  };
};

// Export validated environment variables
export const env = validateEnv();

// Helper functions for specific environment variables
export const isProduction = env.MODE === 'production';
export const isDevelopment = !isProduction;
