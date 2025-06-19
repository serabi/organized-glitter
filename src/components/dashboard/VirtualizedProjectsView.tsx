import React, { useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ProjectType } from '@/types/project';
import ProjectCard from './ProjectCard';
import ProjectListItem from './ProjectListItem';

interface VirtualizedProjectsViewProps {
  projects: ProjectType[];
  viewType: 'grid' | 'list';
  onProjectClick: (id: string) => void;
}

const VirtualizedProjectsView: React.FC<VirtualizedProjectsViewProps> = ({
  projects,
  viewType,
  onProjectClick,
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: window.innerHeight * 0.8, // Use 80% of viewport height
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Calculate grid dimensions
  const getItemSize = () => {
    if (viewType === 'list') {
      return { width: containerSize.width, height: 100 }; // Fixed height for list items
    }

    // For grid view, calculate columns based on container width
    const minItemWidth = 250; // Minimum width for a card
    const columns = Math.max(1, Math.floor(containerSize.width / minItemWidth));
    const itemWidth = containerSize.width / columns;

    return { width: itemWidth, height: 300 }; // Fixed height for grid items
  };

  const { width: itemWidth, height: itemHeight } = getItemSize();
  const columns =
    viewType === 'list' ? 1 : Math.max(1, Math.floor(containerSize.width / itemWidth));

  // Create rows array for virtualization
  const rows =
    viewType === 'list'
      ? projects
      : Array.from({ length: Math.ceil(projects.length / columns) }, (_, rowIndex) => {
          return projects.slice(rowIndex * columns, (rowIndex + 1) * columns);
        });

  // Create virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Number of items to render before and after the visible area
  });

  if (projects.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No projects found matching your filters.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-auto"
      style={{ height: containerSize.height }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const rowIndex = virtualRow.index;
          const rowData = rows[rowIndex];

          return (
            <div
              key={viewType === 'list' ? (rowData as ProjectType).id : rowIndex}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {viewType === 'list' ? (
                // List view
                <ProjectListItem
                  project={rowData as ProjectType}
                  onClick={() => onProjectClick((rowData as ProjectType).id)}
                />
              ) : (
                // Grid view
                <div className="grid grid-cols-1 gap-4 p-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(rowData as ProjectType[]).map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => onProjectClick(project.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(VirtualizedProjectsView);
