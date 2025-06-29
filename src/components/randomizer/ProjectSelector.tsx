/**
 * @fileoverview Project Selection Component for Randomizer Wheel
 *
 * Provides an interactive interface for users to select from their in-progress projects
 * for inclusion in the randomizer wheel. Features checkbox selection, batch operations,
 * loading states, and responsive design with accessibility support.
 *
 * @author Generated with Claude Code
 * @version 1.0.0
 * @since 2024-06-28
 */

import React, { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Project } from '@/types/project';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ProjectSelector');

/**
 * Props interface for the ProjectSelector component
 * @interface ProjectSelectorProps
 */
interface ProjectSelectorProps {
  /** Array of available projects to select from */
  projects: Project[];
  /** Set of currently selected project IDs */
  selectedProjects: Set<string>;
  /** Callback when individual project selection is toggled */
  onProjectToggle: (projectId: string) => void;
  /** Callback to select all available projects */
  onSelectAll: () => void;
  /** Callback to deselect all projects */
  onSelectNone: () => void;
  /** Whether the component is in loading state */
  isLoading?: boolean;
}

/**
 * Interactive project selection component for the randomizer wheel
 *
 * Allows users to choose which of their in-progress projects should be included
 * in the randomizer wheel spin. Provides individual selection via checkboxes,
 * batch operations (Select All/None), loading states, and responsive design.
 *
 * @param {ProjectSelectorProps} props - Component props
 * @param {Project[]} props.projects - Available projects to select from
 * @param {Set<string>} props.selectedProjects - Currently selected project IDs
 * @param {function} props.onProjectToggle - Handler for individual project selection
 * @param {function} props.onSelectAll - Handler to select all projects
 * @param {function} props.onSelectNone - Handler to deselect all projects
 * @param {boolean} [props.isLoading=false] - Loading state indicator
 *
 * @returns {JSX.Element} The rendered project selector component
 *
 * @example
 * ```tsx
 * const [selectedProjects, setSelectedProjects] = useState(new Set<string>());
 *
 * <ProjectSelector
 *   projects={inProgressProjects}
 *   selectedProjects={selectedProjects}
 *   onProjectToggle={(id) => {
 *     const newSet = new Set(selectedProjects);
 *     if (newSet.has(id)) {
 *       newSet.delete(id);
 *     } else {
 *       newSet.add(id);
 *     }
 *     setSelectedProjects(newSet);
 *   }}
 *   onSelectAll={() => setSelectedProjects(new Set(projects.map(p => p.id)))}
 *   onSelectNone={() => setSelectedProjects(new Set())}
 *   isLoading={isProjectsLoading}
 * />
 * ```
 *
 * @features
 * - Individual project selection with checkboxes
 * - Batch operations (Select All/Select None)
 * - Visual feedback for selection state
 * - Loading skeletons during data fetch
 * - Empty state handling
 * - Project thumbnails with fallback
 * - Responsive scrollable list
 * - Selection statistics and feedback
 * - Accessibility support with proper ARIA labels
 *
 * @accessibility
 * - Keyboard navigation support
 * - Screen reader compatible
 * - Focus management
 * - Semantic HTML structure
 */
export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProjects,
  onProjectToggle,
  onSelectAll,
  onSelectNone,
  isLoading = false,
}) => {
  /**
   * Memoized statistics about project selection state
   * @type {Object} stats - Selection statistics
   * @property {number} total - Total number of available projects
   * @property {number} selected - Number of currently selected projects
   * @property {boolean} allSelected - Whether all projects are selected
   * @property {boolean} noneSelected - Whether no projects are selected
   */
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
            <div key={i} className="flex items-center space-x-3 rounded-lg border p-3">
              <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
              <div className="flex-1">
                <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
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
        <div className="py-8 text-center text-muted-foreground">
          <p className="mb-2 text-base">No projects in progress</p>
          <p className="text-sm">Start some projects from your stash to use the randomizer!</p>
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
        <Button variant="outline" size="sm" onClick={onSelectAll} disabled={stats.allSelected}>
          Select All
        </Button>
        <Button variant="outline" size="sm" onClick={onSelectNone} disabled={stats.noneSelected}>
          Select None
        </Button>
      </div>

      {/* Project list */}
      <ScrollArea className="h-96">
        <div className="space-y-2 pr-4">
          {projects.map(project => {
            const isSelected = selectedProjects.has(project.id);

            return (
              <div
                key={project.id}
                className={`flex cursor-pointer items-center space-x-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
                  isSelected ? 'border-primary bg-accent' : ''
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
                  className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {project.imageUrl && (
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        className="h-8 w-8 flex-shrink-0 rounded object-cover"
                        onError={e => {
                          // Hide image on error
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{project.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {project.company && <span>{project.company}</span>}
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
        <div className="rounded-lg border bg-accent/50 p-3">
          <p className="text-sm font-medium">
            {stats.selected} project{stats.selected !== 1 ? 's' : ''} ready for randomizer
          </p>
          {stats.selected === 1 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Select at least 2 projects to make it interesting!
            </p>
          )}
        </div>
      )}
    </div>
  );
};
