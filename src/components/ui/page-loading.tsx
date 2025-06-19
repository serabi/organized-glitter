import { Loader2 } from 'lucide-react';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

/**
 * Page loading fallback component for lazy-loaded routes
 * Provides a centered loading spinner with consistent styling
 */
export const PageLoading = () => {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading...</p>
        <VisuallyHidden>Loading content. Please wait.</VisuallyHidden>
      </div>
    </div>
  );
};
