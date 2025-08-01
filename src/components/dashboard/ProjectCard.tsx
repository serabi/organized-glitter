import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { ProjectType } from '@/types/project';
import { cn } from '@/lib/utils';
import { useProjectStatus } from '@/hooks/useProjectStatus';
import { useConditionalImageLoader } from '@/hooks/useConditionalImageLoader';
import { Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface ProjectCardProps {
  project: ProjectType;
  onClick?: () => void; // Make onClick optional
  skipImageLoading?: boolean; // Skip image loading for faster rendering (e.g., in overview)
  isRecentlyEdited?: boolean; // Whether this project was recently edited
  viewType?: 'grid' | 'list'; // View type for different layouts
}

const ProjectCardComponent = ({
  project,
  onClick,
  skipImageLoading = false,
  isRecentlyEdited = false,
  viewType = 'grid',
}: ProjectCardProps) => {
  const { getStatusColor, getStatusLabel } = useProjectStatus();
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const {
    ref,
    imageUrl: processedImageUrl,
    isLoading,
    error,
    retry,
  } = useConditionalImageLoader({
    src: project.imageUrl,
    skipImageLoading,
  });

  const renderImageContent = () => {
    if (skipImageLoading || !project.imageUrl) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700">
          <ImageIcon className="h-12 w-12 text-gray-400" />
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      );
    }

    if (error || !processedImageUrl) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-200 p-2 text-gray-400 dark:bg-gray-700">
          <ImageIcon className="mb-2 h-8 w-8" />
          <p className="text-center text-xs">Failed to load</p>
          <button
            onClick={retry}
            className="mt-1 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            title="Retry loading image"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      );
    }

    return (
      <img
        src={processedImageUrl}
        alt={project.title}
        loading="lazy"
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300 ease-in-out',
          isImageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsImageLoaded(true)}
        onError={() => {
          logger.error('Image render error:', { processedImageUrl });
          setIsImageLoaded(true);
        }}
      />
    );
  };

  // Render different layouts based on view type
  if (viewType === 'list') {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'group flex overflow-hidden rounded-xl border text-diamond-900 shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:shadow-black/10 dark:text-gray-100 dark:hover:shadow-white/5 cursor-pointer',
          isRecentlyEdited
            ? 'border-green-500 bg-green-50 ring-2 ring-green-500 ring-opacity-50 dark:border-green-400 dark:bg-green-950'
            : 'border-border bg-diamond-100 hover:border-primary/20 dark:bg-gray-800 dark:hover:border-primary/30'
        )}
      >
        {/* Square image area for list view */}
        <div className="relative h-24 w-24 flex-shrink-0 bg-gray-200 dark:bg-gray-700">
          {renderImageContent()}
        </div>

        {/* Horizontal content area */}
        <div className="flex flex-1 items-center p-4">
          <div className="flex-1 space-y-1">
            {/* Project title */}
            <h3 className="line-clamp-1 text-sm font-semibold leading-tight transition-colors duration-200 group-hover:text-primary">
              {project.title}
            </h3>
            
            {/* Kit specifications */}
            <div className="flex items-center">
              {(project.kit_category || project.drillShape) && (
                <span className="rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground transition-colors duration-200 group-hover:bg-muted/70">
                  {project.kit_category && (
                    <span className="font-medium">
                      {project.kit_category === 'mini' ? 'Mini' : 'Full'}
                    </span>
                  )}
                  {project.kit_category && project.drillShape && <span className="mx-1">•</span>}
                  {project.drillShape && <span className="capitalize">{project.drillShape}</span>}
                </span>
              )}
            </div>
          </div>
          
          {/* Status badge */}
          <div className="ml-4 flex-shrink-0">
            <span className={cn('rounded-lg px-2 py-1 text-xs font-medium shadow-sm transition-all duration-200 group-hover:scale-105', getStatusColor(project.status))}>
              {project.status === 'purchased' ? 'Purchased' : getStatusLabel(project.status)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border text-diamond-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:shadow-black/10 dark:text-gray-100 dark:hover:shadow-white/5 cursor-pointer',
        isRecentlyEdited
          ? 'border-green-500 bg-green-50 ring-2 ring-green-500 ring-opacity-50 dark:border-green-400 dark:bg-green-950'
          : 'border-border bg-diamond-100 hover:border-primary/20 dark:bg-gray-800 dark:hover:border-primary/30'
      )}
    >
      {/* Larger image area for better visual balance */}
      <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-700 sm:h-52">
        {renderImageContent()}
      </div>

      {/* Compact content area with essential information */}
      <div className="p-4">
        <div className="space-y-2">
          {/* Project title - consistent height row */}
          <div className="flex h-10 items-start">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight transition-colors duration-200 group-hover:text-primary">
              {project.title}
            </h3>
          </div>

          {/* Kit specifications and status - consistent height row */}
          <div className="flex h-6 items-center justify-between gap-2">
            <div className="flex items-center">
              {(project.kit_category || project.drillShape) && (
                <span className="rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground transition-colors duration-200 group-hover:bg-muted/70">
                  {project.kit_category && (
                    <span className="font-medium">
                      {project.kit_category === 'mini' ? 'Mini' : 'Full'}
                    </span>
                  )}
                  {project.kit_category && project.drillShape && <span className="mx-1">•</span>}
                  {project.drillShape && <span className="capitalize">{project.drillShape}</span>}
                </span>
              )}
            </div>
            <span className={cn('flex-shrink-0 rounded-lg px-2 py-1 text-xs font-medium shadow-sm transition-all duration-200 group-hover:scale-105', getStatusColor(project.status))}>
              {project.status === 'purchased' ? 'Purchased' : getStatusLabel(project.status)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProjectCardComponent);
