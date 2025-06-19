import React from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

/**
 * Loading component for lazy-loaded pages
 * Provides consistent loading experience during code splitting
 */
export const PageLoadingSpinner: React.FC = () => {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner className="h-12 w-12" />
        <p className="text-sm text-muted-foreground">Loading page...</p>
        <VisuallyHidden>Loading page content. Please wait.</VisuallyHidden>
      </div>
    </div>
  );
};
