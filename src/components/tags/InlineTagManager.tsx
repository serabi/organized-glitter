import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Plus, Hash } from 'lucide-react';
import { TagBadge } from './TagBadge';
import { TagService } from '@/lib/tags';
import { Tag } from '@/types/tag';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface InlineTagManagerProps {
  projectId?: string | null | undefined;
  initialTags?: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
  className?: string;
  maxTags?: number;
}

export function InlineTagManager({
  projectId,
  initialTags = [],
  onTagsChange,
  className,
  maxTags = 10,
}: InlineTagManagerProps) {
  const [projectTags, setProjectTags] = useState<Tag[]>(initialTags);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Define loadAvailableTags before using it in useEffect
  const loadAvailableTags = useCallback(async () => {
    try {
      const response = await TagService.getUserTags({ search: searchQuery });
      if (response.status === 'success') {
        setAvailableTags(response.data);
      } else {
        // Handle service-level errors (response.status === 'error')
        toast({
          title: 'Error',
          description: response.error?.message || 'Failed to load tags. Please try again.',
          variant: 'destructive',
        });
        // Don't clear existing availableTags state to preserve previous suggestions
      }
    } catch (error) {
      // Handle unexpected errors (network issues, etc.)
      console.error('Error loading available tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tags. Please try again.',
        variant: 'destructive',
      });
      // Don't clear existing availableTags state to preserve previous suggestions
    }
  }, [searchQuery, toast]);

  // When InlineTagManager's internal projectTags state changes, call the onTagsChange prop.
  useEffect(() => {
    if (onTagsChange) {
      onTagsChange(projectTags);
    }
  }, [projectTags, onTagsChange]);

  // Load available tags with debouncing
  useEffect(() => {
    if (isOpen) {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout for debounced search
      debounceTimeoutRef.current = setTimeout(
        () => {
          loadAvailableTags();
        },
        searchQuery ? 300 : 0
      ); // 300ms delay for search, immediate for initial load
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isOpen, searchQuery, loadAvailableTags]);

  // Filter suggestions (exclude already selected tags)
  const suggestions = availableTags.filter(tag => !projectTags.some(pt => pt.id === tag.id));

  const handleAddTag = async (tag: Tag) => {
    if (projectTags.length >= maxTags) {
      toast({
        title: 'Tag Limit Reached',
        description: `You can add up to ${maxTags} tags per project.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Optimistic update - capture state before update for potential revert
    const originalTagsSnapshot = projectTags;
    setProjectTags(currentProjectTags => [...currentProjectTags, tag]);
    // onTagsChange will be called by the useEffect hook watching projectTags

    // Only call service if projectId is valid (i.e., for existing projects)
    if (projectId) {
      try {
        const response = await TagService.addTagToProject(projectId, tag.id);

        if (response.status === 'error') {
          // Revert optimistic update if service call failed
          setProjectTags(originalTagsSnapshot);
          // onTagsChange for revert will be called by the useEffect hook
          toast({
            title: 'Error',
            description: 'Failed to add tag to project. Please try again.',
            variant: 'destructive',
          });
        } else {
          // Success - no need for toast, operation was successful
          // Tag synchronization on save provides additional safety
        }
      } catch (error) {
        // Handle unexpected errors (network issues, service exceptions, etc.)
        console.error('Error adding tag to project:', error);
        // Revert optimistic update if service call threw an exception
        setProjectTags(originalTagsSnapshot);
        // onTagsChange for revert will be called by the useEffect hook

        // Check if this is an auto-cancellation error
        const errorMessage = error instanceof Error ? error.message : '';
        const isCancelledError =
          errorMessage.includes('autocancelled') || errorMessage.includes('cancelled');

        if (isCancelledError) {
          toast({
            title: 'Tag will be saved with project',
            description:
              'The tag operation was cancelled due to rapid changes, but it will be properly saved when you save the project.',
            variant: 'default',
          });
          // Keep the tag in the UI since it will be saved with the project
          setProjectTags(currentProjectTags => [...currentProjectTags, tag]);
        } else {
          toast({
            title: 'Failed to add tag',
            description:
              'The tag is visible but may not be saved. It will be synchronized when you save the project.',
            variant: 'destructive',
          });
        }
      }
    }
    // For new projects (no projectId), tags are managed locally and will be saved when project is created

    setIsLoading(false);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleCreateAndAddTag = async () => {
    if (!searchQuery.trim()) return;

    // Prevent multiple rapid calls
    if (isCreating) {
      return;
    }

    // Check character limit (100 characters max as per database constraint)
    if (searchQuery.trim().length > 100) {
      toast({
        title: 'Tag name too long',
        description: 'Tag names must be 100 characters or less.',
        variant: 'destructive',
      });
      return;
    }

    // Check if tag name already exists in current project tags (case-insensitive)
    const trimmedQuery = searchQuery.trim();
    const existsInProject = projectTags.some(
      tag => tag.name.toLowerCase() === trimmedQuery.toLowerCase()
    );

    if (existsInProject) {
      toast({
        title: 'Tag already added',
        description: 'This tag is already added to the project.',
        variant: 'destructive',
      });
      setSearchQuery('');
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsCreating(true);

    // Set default color to teal (#14b8a6) for new tags created on project pages
    const createResponse = await TagService.createTag({
      name: trimmedQuery,
      color: '#14b8a6', // Use teal as the default color
    });

    if (createResponse.status === 'success') {
      await handleAddTag(createResponse.data);
      setAvailableTags(prev => [...prev, createResponse.data]);
    } else {
      toast({
        title: 'Error',
        description: createResponse.error?.message || 'Failed to create tag. Please try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
    setIsCreating(false);
  };

  const handleRemoveTag = async (tagToRemove: Tag) => {
    setIsLoading(true);

    // Optimistic update - capture state before update for potential revert
    const originalTagsSnapshot = projectTags;
    setProjectTags(currentProjectTags => currentProjectTags.filter(t => t.id !== tagToRemove.id));
    // onTagsChange will be called by the useEffect hook watching projectTags

    // Only call service if projectId is valid
    if (projectId) {
      try {
        const response = await TagService.removeTagFromProject(projectId, tagToRemove.id);

        if (response.status === 'error') {
          // Revert optimistic update if service call failed
          setProjectTags(originalTagsSnapshot);
          // onTagsChange for revert will be called by the useEffect hook
          toast({
            title: 'Error',
            description: 'Failed to remove tag from project. Please try again.',
            variant: 'destructive',
          });
        } else {
          // Success - no need for toast, operation was successful
          // Tag synchronization on save provides additional safety
        }
      } catch (error) {
        console.error('Error removing tag from project:', error);
        // Revert optimistic update if service call threw an exception
        setProjectTags(originalTagsSnapshot);
        // onTagsChange for revert will be called by the useEffect hook

        // Check if this is an auto-cancellation error
        const errorMessage = error instanceof Error ? error.message : '';
        const isCancelledError =
          errorMessage.includes('autocancelled') || errorMessage.includes('cancelled');

        if (isCancelledError) {
          toast({
            title: 'Tag removal will be saved with project',
            description:
              'The tag removal was cancelled due to rapid changes, but will be properly saved when you save the project.',
            variant: 'default',
          });
          // Don't revert the UI since the change will be saved with the project
        } else {
          toast({
            title: 'Failed to remove tag',
            description:
              'The tag appears removed but may not be saved. It will be synchronized when you save the project.',
            variant: 'destructive',
          });
        }
      }
    }
    // For new projects, tags are managed locally and will be saved when project is created

    setIsLoading(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Current Tags */}
      {projectTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {projectTags.map((tag, index) => (
            <TagBadge
              key={tag?.id || `temp-tag-${index}`}
              tag={tag}
              removable
              onRemove={() => handleRemoveTag(tag)}
            />
          ))}
        </div>
      )}

      {/* Add Tag Interface */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed text-xs text-muted-foreground"
            disabled={isLoading || projectTags.length >= maxTags}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <div className="relative">
              <CommandInput
                placeholder="Search or create tags..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                onKeyDown={e => {
                  // Prevent the popover from closing when space is pressed
                  if (e.key === ' ') {
                    e.stopPropagation();
                  }
                  // Prevent Enter key from triggering CommandItem selection when typing
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Only trigger creation if not already creating and tag doesn't exist
                    if (
                      !isCreating &&
                      !suggestions.some(
                        tag => tag.name.toLowerCase() === searchQuery.trim().toLowerCase()
                      )
                    ) {
                      handleCreateAndAddTag();
                    }
                  }
                }}
              />
              {/* Character count indicator */}
              {searchQuery.length > 0 && (
                <div
                  className={`absolute right-2 top-1/2 -translate-y-1/2 transform text-xs ${
                    searchQuery.length > 100 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {searchQuery.length}/100
                </div>
              )}
            </div>
            <CommandList>
              {suggestions.length > 0 && (
                <CommandGroup heading="Existing Tags">
                  {suggestions.map(tag => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => handleAddTag(tag)}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {searchQuery.trim() &&
                !suggestions.some(tag => tag.name.toLowerCase() === searchQuery.toLowerCase()) && (
                  <CommandGroup heading="Create New">
                    <CommandItem
                      key="create-new-tag-command-item"
                      onSelect={handleCreateAndAddTag}
                      className={`flex cursor-pointer items-center gap-2 ${
                        searchQuery.trim().length > 100 || isCreating
                          ? 'cursor-not-allowed opacity-50'
                          : ''
                      }`}
                      disabled={searchQuery.trim().length > 100 || isCreating}
                    >
                      <Hash className="h-3 w-3" />
                      <span className="truncate">
                        Create "
                        {searchQuery.trim().length > 20
                          ? searchQuery.trim().substring(0, 20) + '...'
                          : searchQuery.trim()}
                        "
                      </span>
                      {searchQuery.trim().length > 100 && (
                        <span className="ml-auto text-xs text-destructive">Too long</span>
                      )}
                    </CommandItem>
                  </CommandGroup>
                )}

              {suggestions.length === 0 && !searchQuery.trim() && (
                <CommandEmpty>No tags found. Start typing to create one.</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
