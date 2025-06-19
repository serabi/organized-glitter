/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Required - PocketBase Configuration
  readonly VITE_POCKETBASE_URL: string;

  // PostHog Analytics Configuration (optional)
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;

  // Application Configuration (required)
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_URL: string;

  // Optional features
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
