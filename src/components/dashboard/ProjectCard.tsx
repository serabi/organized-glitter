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
}

const ProjectCardComponent = ({
  project,
  onClick,
  skipImageLoading = false,
  isRecentlyEdited = false,
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

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border text-diamond-900 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:text-gray-100',
        isRecentlyEdited
          ? 'border-green-500 bg-green-50 ring-2 ring-green-500 ring-opacity-50 dark:border-green-400 dark:bg-green-950'
          : 'border-border bg-diamond-100 dark:bg-gray-800'
      )}
    >
      <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-700 sm:h-56 md:h-64">
        {renderImageContent()}
        <span
          className={cn(
            'absolute right-2 top-2 rounded-md px-2 py-1 text-xs font-medium',
            getStatusColor(project.status)
          )}
        >
          {getStatusLabel(project.status)}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between p-3">
        <h3 className="truncate text-lg font-semibold">{project.title}</h3>
        {onClick && ( // Only render button if onClick is provided
          <Button size="sm" className="mt-3 w-full" onClick={onClick}>
            View Details
          </Button>
        )}
      </div>
    </div>
  );
};

export default React.memo(ProjectCardComponent);
