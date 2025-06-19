import { ProjectType, ProjectStatus } from '@/types/project';
import StatusDropdown from './StatusDropdown';
import RichUrlComponent from './RichUrlComponent';
import { TagBadge } from '@/components/tags/TagBadge';

interface ProjectDetailsProps {
  project: ProjectType;
  onStatusChange?: (status: ProjectStatus) => void;
}

const ProjectDetails = ({ project, onStatusChange }: ProjectDetailsProps) => {
  return (
    <div className="space-y-5">
      {onStatusChange && (
        <div className="mb-4 w-56">
          <h3 className="mb-1 text-sm font-medium text-muted-foreground">Project Status</h3>
          <StatusDropdown currentStatus={project.status} onStatusChange={onStatusChange} />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
          <p className="font-medium text-foreground">{project.company || 'Not specified'}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Artist</h3>
          <p className="font-medium text-foreground">{project.artist || 'Not specified'}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Dimensions</h3>
          <p className="font-medium text-foreground">
            {project.width && project.height
              ? `${project.width} x ${project.height} cm`
              : project.width
                ? `${project.width} cm (width)`
                : project.height
                  ? `${project.height} cm (height)`
                  : 'Not specified'}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Drill Shape</h3>
          <p className="font-medium capitalize text-foreground">
            {project.drillShape || 'Not specified'}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Type of Kit</h3>
          <p className="font-medium text-foreground">
            {project.kit_category === 'full'
              ? 'Full Sized Kit'
              : project.kit_category === 'mini'
                ? 'Mini Kit'
                : 'Not specified'}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Total Diamonds</h3>
          <p className="font-medium text-foreground">
            {project.totalDiamonds?.toLocaleString() || 'Not specified'}
          </p>
        </div>
        {project.tags && project.tags.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map(tag => (
                <TagBadge key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
          </div>
        )}
        {project.sourceUrl && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Source URL</h3>
            <RichUrlComponent url={project.sourceUrl} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
