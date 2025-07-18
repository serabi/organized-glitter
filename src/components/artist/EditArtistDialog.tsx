import React, { useState, useEffect } from 'react';
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
import { Loader2, Pencil } from 'lucide-react';
import FormField from '@/components/projects/form/FormField';
import { useUpdateArtist } from '@/hooks/mutations/useArtistMutations';

interface EditArtistDialogProps {
  artist: {
    id: string;
    name: string;
  };
}

const EditArtistDialog = ({ artist }: EditArtistDialogProps) => {
  const [artistName, setArtistName] = useState(artist.name);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const updateArtistMutation = useUpdateArtist();

  useEffect(() => {
    // Update state when prop changes
    setArtistName(artist.name);
  }, [artist]);

  const handleUpdateArtist = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!artistName.trim()) {
      return;
    }

    updateArtistMutation.mutate(
      { id: artist.id, data: { name: artistName.trim() } },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Artist</DialogTitle>
          <DialogDescription>Update the name of this artist.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdateArtist}>
          <div className="space-y-4 py-4">
            <FormField id="edit-artist-name" label="Artist Name" required={true}>
              <Input
                id="edit-artist-name"
                placeholder="Enter artist name"
                value={artistName}
                onChange={e => setArtistName(e.target.value)}
                disabled={updateArtistMutation.isPending}
                autoFocus
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={updateArtistMutation.isPending}>
              {updateArtistMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Artist
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditArtistDialog;
