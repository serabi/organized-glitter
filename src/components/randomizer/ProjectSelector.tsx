import React, { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Project } from '@/types/project';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ProjectSelector');

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjects: Set<string>;
  onProjectToggle: (projectId: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  isLoading?: boolean;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProjects,
  onProjectToggle,
  onSelectAll,
  onSelectNone,
  isLoading = false,
}) => {
  const stats = useMemo(() => {
    const total = projects.length;
    const selected = selectedProjects.size;
    const allSelected = selected === total && total > 0;
    const noneSelected = selected === 0;
    
    return { total, selected, allSelected, noneSelected };
  }, [projects.length, selectedProjects.size]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Select Projects</h3>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1">
                <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="w-1/2 h-3 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Projects</h3>
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-base mb-2">No projects in progress</p>
          <p className="text-sm">
            Start some projects from your stash to use the randomizer!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with selection controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select Projects</h3>
        <div className="text-sm text-muted-foreground">
          {stats.selected} of {stats.total} selected
        </div>
      </div>

      {/* Quick selection buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          disabled={stats.allSelected}
        >
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectNone}
          disabled={stats.noneSelected}
        >
          Select None
        </Button>
      </div>

      {/* Project list */}
      <ScrollArea className="h-96">
        <div className="space-y-2 pr-4">
          {projects.map((project) => {
            const isSelected = selectedProjects.has(project.id);
            
            return (
              <div
                key={project.id}
                className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
                  isSelected ? 'bg-accent border-primary' : ''
                }`}
                onClick={() => {
                  logger.debug('Project selection toggled', {
                    projectId: project.id,
                    projectTitle: project.title,
                    wasSelected: isSelected,
                    willBeSelected: !isSelected,
                  });
                  onProjectToggle(project.id);
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={() => onProjectToggle(project.id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {project.imageUrl && (
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                        onError={(e) => {
                          // Hide image on error
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {project.company && (
                          <span>{project.company}</span>
                        )}
                        {project.artist && (
                          <>
                            {project.company && <span>•</span>}
                            <span>{project.artist}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Selection summary */}
      {stats.selected > 0 && (
        <div className="p-3 bg-accent/50 rounded-lg border">
          <p className="text-sm font-medium">
            {stats.selected} project{stats.selected !== 1 ? 's' : ''} ready for randomizer
          </p>
          {stats.selected === 1 && (
            <p className="text-xs text-muted-foreground mt-1">
              Select at least 2 projects to make it interesting!
            </p>
          )}
        </div>
      )}
    </div>
  );
};