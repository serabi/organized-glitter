import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import {
  useProgressNotesQuery,
  useAddProgressNoteMutation,
  useUpdateProgressNoteMutation,
  useDeleteProgressNoteMutation,
  useDeleteProgressNoteImageMutation,
} from '@/hooks/queries/useProgressNotes';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { ProjectType } from '@/types/project';
import ProgressNotesList from './timeline/ProgressNotesList';
import ProgressNoteForm from './ProgressNoteForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectProgressNotesProps {
  project: ProjectType;
}

const ProjectProgressNotes: React.FC<ProjectProgressNotesProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState('notes');

  // React Query hooks
  const { data: progressNotes = [], isLoading, error } = useProgressNotesQuery(project?.id || null);
  const addProgressNoteMutation = useAddProgressNoteMutation(project?.id || '');
  const updateProgressNoteMutation = useUpdateProgressNoteMutation(project?.id || '');
  const deleteProgressNoteMutation = useDeleteProgressNoteMutation(project?.id || '');
  const deleteProgressNoteImageMutation = useDeleteProgressNoteImageMutation(project?.id || '');
  const userTimezone = useUserTimezone();

  // Handler for adding a new progress note
  const handleAddNote = async (noteData: { date: string; content: string; imageFile?: File }) => {
    if (!project?.id) return;

    try {
      await addProgressNoteMutation.mutateAsync({
        ...noteData,
        userTimezone,
      });
      // Switch to notes tab to show the new note
      setActiveTab('notes');
    } catch (error) {
      logger.error('Error adding progress note:', error);
    }
  };

  // Handler for successful form submission (switches tabs)
  const handleFormSuccess = () => {
    setActiveTab('notes');
  };

  // Handler for updating a progress note
  const handleUpdateNote = async (noteId: string, content: string) => {
    if (!project?.id) return;

    try {
      await updateProgressNoteMutation.mutateAsync({ noteId, newContent: content });
    } catch (error) {
      logger.error('Error updating progress note:', error);
    }
  };

  // Handler for deleting a progress note
  const handleDeleteNote = async (noteId: string) => {
    if (!project?.id) return;

    try {
      await deleteProgressNoteMutation.mutateAsync({ noteId });
    } catch (error) {
      logger.error('Error deleting progress note:', error);
    }
  };

  // Handler for deleting an image from a progress note
  const handleDeleteNoteImage = async (noteId: string) => {
    if (!project?.id) return;

    try {
      await deleteProgressNoteImageMutation.mutateAsync({ noteId });
    } catch (error) {
      logger.error('Error deleting progress note image:', error);
    }
  };

  // Render component with current state

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Progress Tracker</CardTitle>
        <CardDescription>
          Track your progress and add notes as you work on your diamond painting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes">Progress Notes</TabsTrigger>
            <TabsTrigger value="add">Add New Note</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {/* Skeleton loader for better perceived performance */}
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex space-x-4 rounded-lg border p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[100px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-8 text-center text-red-500">
                <p>Error loading progress notes. Please try again.</p>
              </div>
            ) : progressNotes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No progress notes yet. Start tracking your progress!</p>
              </div>
            ) : (
              <ProgressNotesList
                progressNotes={progressNotes}
                onUpdateProgressNote={handleUpdateNote}
                onDeleteProgressNote={handleDeleteNote}
                onDeleteProgressNoteImage={handleDeleteNoteImage}
                disabled={
                  updateProgressNoteMutation.isPending ||
                  deleteProgressNoteMutation.isPending ||
                  deleteProgressNoteImageMutation.isPending
                }
              />
            )}
          </TabsContent>

          <TabsContent value="add">
            <ProgressNoteForm
              onSubmit={handleAddNote}
              onSuccess={handleFormSuccess}
              disabled={addProgressNoteMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProjectProgressNotes;
