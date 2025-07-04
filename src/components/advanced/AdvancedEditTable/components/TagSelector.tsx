import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagBadge } from '@/components/tags/TagBadge';
import { ProjectType } from '@/types/project';
import { Tag } from '@/types/tag';
import { TagService } from '@/lib/tags';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { secureLogger } from '@/utils/secureLogger';

interface TagSelectorProps {
  project: ProjectType;
  availableTags: Tag[];
  onClose: () => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ project, availableTags, onClose }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleTagToggle = async (tag: Tag) => {
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      const currentTagIds = project.tags?.map(t => t.id) || [];
      const isSelected = currentTagIds.includes(tag.id);

      let result;
      if (isSelected) {
        // Remove tag
        result = await TagService.removeTagFromProject(project.id, tag.id);
      } else {
        // Add tag
        result = await TagService.addTagToProject(project.id, tag.id);
      }

      if (result.status === 'success') {
        // Invalidate relevant caches to refresh data
        if (user?.id) {
          // Invalidate advanced projects query
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.advanced(user.id),
          });

          // Invalidate project detail if it exists in cache
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.detail(project.id),
          });

          // Invalidate project lists
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.lists(),
          });
        }

        toast({
          title: 'Tags Updated',
          description: `Tag "${tag.name}" ${isSelected ? 'removed from' : 'added to'} project successfully.`,
        });

        onClose();
      } else {
        toast({
          title: 'Error Updating Tags',
          description:
            (result.error instanceof Error ? result.error.message : result.error) ||
            'Failed to update project tags. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      secureLogger.error('Tag toggle error:', error);
      toast({
        title: 'Error Updating Tags',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 w-full justify-start">
          <span className="truncate">
            {project.tags && project.tags.length > 0
              ? `${project.tags.length} tag${project.tags.length > 1 ? 's' : ''} selected`
              : 'Select tags...'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b p-3">
          <h4 className="text-sm font-medium">Select Tags</h4>
        </div>
        <div className="max-h-60 overflow-y-auto p-2">
          {availableTags.map(tag => {
            const isSelected = project.tags?.some(projectTag => projectTag.id === tag.id) || false;
            return (
              <div
                key={tag.id}
                className={`flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm transition-colors ${
                  isUpdating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-accent'
                }`}
                onClick={() => !isUpdating && handleTagToggle(tag)}
              >
                <Checkbox checked={isSelected} disabled={isUpdating} />
                <TagBadge tag={tag} size="sm" />
              </div>
            );
          })}
          {availableTags.length === 0 && (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
              No tags available
            </div>
          )}
          {isUpdating && (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
              Updating tags...
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
