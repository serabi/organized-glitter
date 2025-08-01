import { memo } from 'react';
import { ProjectType } from '@/types/project';
import { cn } from '@/lib/utils';
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
      <div
        className="group aspect-square cursor-pointer overflow-hidden rounded-xl border border-border bg-diamond-100 text-diamond-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:border-primary/20 hover:shadow-xl hover:shadow-black/10 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-primary/30 dark:hover:shadow-white/5"
        onClick={handleClick}
      >
        {/* Image area - takes most of the square */}
        <div className="relative h-3/4 w-full bg-gray-200 dark:bg-gray-700">
          {showImage && project.imageUrl ? (
            <img
              src={project.imageUrl}
              alt={project.title}
              loading="lazy"
              className="h-full w-full object-cover transition-opacity duration-300 ease-in-out"
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
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        {/* Compact content area - bottom quarter */}
        <div className="flex h-1/4 flex-col justify-center p-2">
          {/* Project title only - compact and centered */}
          <h3 className="line-clamp-2 text-center text-sm font-semibold leading-tight transition-colors duration-200 group-hover:text-primary">
            {project.title}
          </h3>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better memo performance
    return (
      prevProps.project.id === nextProps.project.id &&
      prevProps.project.title === nextProps.project.title &&
      prevProps.project.imageUrl === nextProps.project.imageUrl &&
      prevProps.onClick === nextProps.onClick &&
      prevProps.showImage === nextProps.showImage
    );
  }
);

export default ProjectCardLite;
