import React from 'react';
import { ProjectType, ProgressNote } from '@/types/project';
import TimelineEvents, { TimelineEvent } from './timeline/TimelineEvents';
import ProgressNotesList from './timeline/ProgressNotesList';
import AddProgressNote from './timeline/AddProgressNote';

interface ProjectTimelineProps {
  project: ProjectType;
  onAddProgressNote?: (note: { date: string; content: string; imageFile?: File }) => Promise<void>;
  onUpdateProgressNote?: (noteId: string, content: string) => Promise<void>;
  onDeleteProgressNote?: (noteId: string) => Promise<void>;
  onDeleteProgressNoteImage?: (noteId: string) => Promise<void>;
}

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  project,
  onAddProgressNote,
  onUpdateProgressNote,
  onDeleteProgressNote,
  onDeleteProgressNoteImage,
}) => {
  // Create timeline events from project data
  const timelineEvents: TimelineEvent[] = React.useMemo(() => {
    return [
      {
        id: 'started',
        date: project.dateStarted || '',
        title: 'Started',
        content: 'Work began on this project.',
        hasData: !!project.dateStarted,
      },
      {
        id: 'completed',
        date: project.dateCompleted || '',
        title: 'Completed',
        content: 'Project was completed on this date.',
        hasData: !!project.dateCompleted,
      },
    ].filter(event => event.hasData);
  }, [project.dateStarted, project.dateCompleted]);

  const progressNotes: ProgressNote[] = React.useMemo(() => {
    return project.progressNotes || [];
  }, [project.progressNotes]);

  const hasProgressNotes = progressNotes.length > 0;
  const hasTimelineEvents = timelineEvents.length > 0 || hasProgressNotes;

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-md dark:border-muted">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Progress Pictures</h2>
        {onAddProgressNote && <AddProgressNote onAddProgressNote={onAddProgressNote} />}
      </div>

      {!hasTimelineEvents ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            No timeline events yet. Add dates or pictures to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Display progress notes */}
          {hasProgressNotes && (
            <ProgressNotesList
              progressNotes={progressNotes}
              onUpdateProgressNote={onUpdateProgressNote}
              onDeleteProgressNote={onDeleteProgressNote}
              onDeleteProgressNoteImage={onDeleteProgressNoteImage}
            />
          )}

          {/* Display timeline events */}
          {timelineEvents.length > 0 && <TimelineEvents events={timelineEvents} />}
        </div>
      )}
    </div>
  );
};

export default ProjectTimeline;
