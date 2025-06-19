import React from 'react';

export const LoadingState: React.FC = () => (
  <div className="flex w-full items-center justify-center py-12">
    <div className="flex flex-col items-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      <p className="mt-4 text-muted-foreground">Loading projects...</p>
    </div>
  </div>
);

export const EmptyState: React.FC = () => (
  <div className="w-full rounded-md border bg-background p-8 text-center">
    <p className="text-muted-foreground">No projects found with the current filters.</p>
  </div>
);
