import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ProjectType } from '@/types/project';
import { cn } from '@/lib/utils';
import { getStatusColor, getStatusLabel } from '@/utils/projectStatusUtils';
import { Image as ImageIcon } from 'lucide-react';

interface ProjectCardLiteProps {
  project: ProjectType;
  onClick?: (projectId: string) => void;
  showImage?: boolean;
}

/**
 * Lightweight ProjectCard variant optimized for Overview page
 * - No hooks for maximum performance
 * - Static status utilities instead of useProjectStatus
 * - Optional image loading
 * - Minimal re-renders with memo
 */
const ProjectCardLite = memo(
  function ProjectCardLite({ project, onClick, showImage = true }: ProjectCardLiteProps) {
    const handleClick = () => {
      onClick?.(project.id);
    };

    return (
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-diamond-100 text-diamond-900 shadow-md transition-transform hover:-translate-y-1 hover:shadow-lg dark:bg-gray-800 dark:text-gray-100">
        <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-700 sm:h-56 md:h-64">
          {showImage && project.imageUrl ? (
            <img
              src={project.imageUrl}
              alt={project.title}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={e => {
                // Simple fallback on error
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div
            className={cn(
              'flex h-full w-full items-center justify-center',
              showImage && project.imageUrl ? 'hidden' : ''
            )}
          >
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
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
          {onClick && (
            <Button size="sm" className="mt-3 w-full" onClick={handleClick}>
              View Details
            </Button>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better memo performance
    return (
      prevProps.project.id === nextProps.project.id &&
      prevProps.project.status === nextProps.project.status &&
      prevProps.project.title === nextProps.project.title &&
      prevProps.project.imageUrl === nextProps.project.imageUrl &&
      prevProps.onClick === nextProps.onClick &&
      prevProps.showImage === nextProps.showImage
    );
  }
);

export default ProjectCardLite;
