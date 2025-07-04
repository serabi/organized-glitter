import { useEffect } from 'react'; // Removed unused React import
import { secureLogger } from '@/utils/secureLogger';

// Extend the Window interface to include Featurebase
type FeaturebaseCallback = (err: Error | null, data: unknown) => void;
type FeaturebaseQueueItem = [string, Record<string, unknown>, FeaturebaseCallback?];

declare global {
  interface Window {
    Featurebase?: {
      (command: string, params: Record<string, unknown>, callback?: FeaturebaseCallback): void;
      q?: Array<FeaturebaseQueueItem>;
    };
  }
}

interface EmbedOptions {
  path?: string; // Initial page to load: '/' for feedback board, '/roadmap' for roadmap, '/changelog' for changelog, etc.
  filters?: string; // Query params that can be used for default filters (e.g. 'b=63f827df2d62cb301468aac4&sortBy=upvotes:desc')
  routeSyncingBasePath?: string; // ADVANCED - Sync URLs between your website & the embed
}

interface StylingOptions {
  theme?: 'light' | 'dark' | ''; // Theme options: 'light', 'dark', or '' for auto-detection
  hideMenu?: boolean; // Toggle visibility of the top navigation bar
  hideLogo?: boolean; // Toggle visibility of the logo in the navigation bar
}

// We'll omit user options for now, assuming no SSO with the free plan
// interface UserOptions {
//   jwt?: string;
//   email?: string;
//   name?: string;
//   userId?: string;
//   metadata?: Record<string, any>;
// }

interface FeaturebaseEmbedProps {
  organization: string; // Required - Your Featurebase organization identifier
  embedOptions?: EmbedOptions;
  stylingOptions?: StylingOptions;
  locale?: string; // Optional - Language setting
}

const SDK_SCRIPT_ID = 'featurebase-sdk';
const SDK_URL = 'https://do.featurebase.app/js/sdk.js';

export function FeaturebaseEmbed({
  organization,
  embedOptions,
  stylingOptions,
  locale,
}: FeaturebaseEmbedProps): JSX.Element {
  useEffect(() => {
    if (document.getElementById(SDK_SCRIPT_ID)) {
      // SDK script already loaded or loading
      return;
    }

    const script = document.createElement('script');
    script.id = SDK_SCRIPT_ID;
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      // SDK loaded, now initialize Featurebase if it's not already initialized by another instance
      // The init_embed_widget call below will handle the actual widget rendering
    };
    script.onerror = () => {
      secureLogger.error('Featurebase SDK failed to load.');
    };
    document.head.appendChild(script);

    // Initialize the global Featurebase queue
    if (typeof window.Featurebase !== 'function') {
      // Changed IArguments to a more specific type for the arguments array
      window.Featurebase = function (...args: FeaturebaseQueueItem) {
        (window.Featurebase!.q = window.Featurebase!.q || []).push(args);
      };
    }
  }, []);

  useEffect(() => {
    // Wait for the SDK to be fully available and for the organization prop
    if (typeof window.Featurebase === 'function' && organization) {
      const config: Record<string, unknown> = {
        organization,
      };
      if (embedOptions) {
        config.embedOptions = embedOptions;
      }
      if (stylingOptions) {
        config.stylingOptions = stylingOptions;
      }
      if (locale) {
        config.locale = locale;
      }

      // Ensure Featurebase is called as a function
      const fb = window.Featurebase;
      if (typeof fb === 'function') {
        fb('init_embed_widget', config);
      }
    }
  }, [organization, embedOptions, stylingOptions, locale]); // Re-run if these props change

  return <div data-featurebase-embed></div>;
}
