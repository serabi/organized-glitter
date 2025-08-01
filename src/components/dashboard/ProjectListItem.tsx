import React from 'react';
import { logger } from '@/utils/logger';
import { ProjectType } from '@/types/project';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProjectStatus } from '@/hooks/useProjectStatus';
import { useImageLoader } from '@/hooks/useImageLoader';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import { Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface ProjectListItemProps {
  project: ProjectType;
  onClick: () => void;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project, onClick }) => {
  const { getStatusColor, getStatusLabel } = useProjectStatus();

  // Add lazy loading
  const { ref, isVisible } = useLazyLoad({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Only load image when visible
  const {
    imageUrl: processedImageUrl,
    isLoading,
    error,
    retry,
  } = useImageLoader({
    src: isVisible ? project.imageUrl : undefined,
  });

  const renderImageContent = () => {
    if (!project.imageUrl) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      );
    }

    if (error || !processedImageUrl) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-1 text-gray-400">
          <ImageIcon className="mb-1 h-6 w-6" />
          <button
            onClick={retry}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
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
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => {
          logger.error('Image render error:', { processedImageUrl });
        }}
      />
    );
  };

  return (
    <div
      ref={ref}
      className="mb-2 flex flex-col items-stretch justify-between rounded-lg border border-border bg-diamond-100 p-4 text-diamond-900 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 dark:text-white sm:flex-row sm:items-center"
    >
      <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 min-w-[5rem] overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
          {renderImageContent()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <h3 className="truncate text-lg font-semibold">{project.title}</h3>
            <Badge className={`${getStatusColor(project.status)} self-start sm:self-auto`}>
              {getStatusLabel(project.status)}
            </Badge>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3">
            {project.company && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Company:</span> {project.company}
              </p>
            )}
            {project.artist && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Artist:</span> {project.artist}
              </p>
            )}
            {(project.width || project.height) && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Size:</span>{' '}
                {project.width && project.height
                  ? `${project.width} x ${project.height} cm`
                  : project.width
                    ? `${project.width} cm (width)`
                    : `${project.height} cm (height)`}
              </p>
            )}
            {project.drillShape && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Drill Shape:</span> {project.drillShape}
              </p>
            )}
          </div>

          {/* Tag display section has been removed */}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end sm:mt-0">
        <Button size="sm" onClick={onClick}>
          View Details
        </Button>
      </div>
    </div>
  );
};

export default React.memo(ProjectListItem);
