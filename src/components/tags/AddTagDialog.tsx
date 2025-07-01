import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TagService } from '@/lib/tags';
import FormField from '@/components/projects/form/FormField';
import { TAG_COLOR_PALETTE } from '@/utils/tagColors';

interface AddTagDialogProps {
  onTagAdded: () => void;
}

// Extract hex colors from the centralized color palette
const TAG_COLORS = TAG_COLOR_PALETTE.map(color => color.hex);

const AddTagDialog = ({ onTagAdded }: AddTagDialogProps) => {
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTagName.trim()) {
      toast({
        title: 'Error',
        description: 'Tag name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    // Check character limit (100 characters max as per database constraint)
    if (newTagName.trim().length > 100) {
      toast({
        title: 'Tag name too long',
        description: 'Tag names must be 100 characters or less.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await TagService.createTag({
        name: newTagName.trim(),
        color: selectedColor,
      });

      if (response.status === 'success') {
        toast({
          title: 'Success',
          description: `Tag "${newTagName}" has been created`,
        });

        // Reset form
        setNewTagName('');
        setSelectedColor(TAG_COLORS[0]);
        setIsDialogOpen(false);
        onTagAdded();
      } else {
        throw new Error(response.error?.message || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not create tag',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Add Tag</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Tag</DialogTitle>
          <DialogDescription>
            Create a new tag to organize your diamond painting projects.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddTag}>
          <div className="space-y-4 py-4">
            <FormField id="tag-name" label="Tag Name" required={true}>
              <div className="relative">
                <Input
                  id="tag-name"
                  placeholder="Enter tag name"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                  className={newTagName.length > 100 ? 'border-destructive' : ''}
                />
                {/* Character count indicator */}
                {newTagName.length > 0 && (
                  <div
                    className={`absolute right-2 top-1/2 -translate-y-1/2 transform text-xs ${
                      newTagName.length > 100 ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {newTagName.length}/100
                  </div>
                )}
              </div>
              {newTagName.length > 100 && (
                <p className="mt-1 text-xs text-destructive">
                  Tag name must be 100 characters or less
                </p>
              )}
            </FormField>

            <FormField id="tag-color" label="Color">
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 ${
                      selectedColor === color ? 'border-foreground' : 'border-muted'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            </FormField>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || newTagName.length > 100}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Tag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTagDialog;
