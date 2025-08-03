/**
 * Offline page component that displays when user is offline
 * @author @serabi
 * @created 2025-08-02
 */

import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflinePageProps {
  onRetry: () => void;
}

/**
 * Full-page overlay component shown when user is offline
 * @param onRetry - Callback function to retry connection
 */
export const OfflinePage: React.FC<OfflinePageProps> = ({ onRetry }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-title"
      aria-describedby="offline-description"
    >
      <div className="mx-4 flex max-w-md flex-col items-center text-center">
        {/* Offline Icon */}
        <div className="mb-6 rounded-full bg-muted p-6">
          <WifiOff className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        </div>

        {/* Title */}
        <h1 id="offline-title" className="mb-4 text-2xl font-semibold text-foreground">
          You're offline!
        </h1>

        {/* Description */}
        <p id="offline-description" className="mb-8 text-muted-foreground">
          Come back when you're re-connected. Your progress is saved locally and will sync when
          you're back online.
        </p>

        {/* Retry Button */}
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Check connection again"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </button>
      </div>
    </div>
  );
};
