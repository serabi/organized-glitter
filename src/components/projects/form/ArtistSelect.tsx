import React, { useState, useMemo, useCallback } from 'react';
import { useCreateArtist } from '@/hooks/mutations/useArtistMutations';
import { useToast } from '@/hooks/use-toast';
import { secureLogger } from '@/utils/secureLogger';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import FormField from './FormField';

interface ArtistSelectProps {
  value: string;
  onChange: (value: string) => void;
  artists?: string[];
  onArtistAdded?: (newArtist: string) => Promise<void> | void;
  disabled?: boolean;
}

const ArtistSelect = React.memo(
  ({ value, onChange, artists = [], onArtistAdded, disabled = false }: ArtistSelectProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newArtistName, setNewArtistName] = useState('');
    const createArtistMutation = useCreateArtist();
    const { toast } = useToast();

    // Memoize computed values
    const isDisabled = useMemo(
      () => disabled || createArtistMutation.isPending,
      [disabled, createArtistMutation.isPending]
    );

    // Memoize artists array to avoid unnecessary re-renders
    const normalizedArtists = useMemo(() => {
      if (!Array.isArray(artists)) {
        secureLogger.warn('ArtistSelect received invalid artists list:', { artists });
        return [];
      }
      // Additional safety check for each artist item
      return artists
        .filter(artist => artist && typeof artist === 'string')
        .map(artist => artist.toLowerCase().trim());
    }, [artists]);

    const handleAddArtist = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling up to parent forms

        // Prevent duplicate submissions
        if (createArtistMutation.isPending) {
          return;
        }

        const artistName = newArtistName.trim();
        if (!artistName) {
          return;
        }

        // Check if artist already exists (client-side check)
        const artistNameLower = artistName.toLowerCase();
        if (normalizedArtists.includes(artistNameLower)) {
          return;
        }

        // Create artist using React Query mutation
        createArtistMutation.mutate(
          { name: artistName },
          {
            onSuccess: newArtist => {
              // Set the form data to use the new artist
              onChange(newArtist.name);

              // Notify parent component if callback provided
              if (onArtistAdded) {
                onArtistAdded(newArtist.name);
              }

              // Reset and close dialog
              setNewArtistName('');
              setIsDialogOpen(false);
            },
            onError: error => {
              // Show error toast to user
              const errorMessage =
                error instanceof Error ? error.message : 'Failed to create artist';
              toast({
                title: 'Error Creating Artist',
                description: errorMessage,
                variant: 'destructive',
              });
            },
          }
        );
      },
      [createArtistMutation, newArtistName, normalizedArtists, onChange, onArtistAdded, toast]
    );

    return (
      <>
        <FormField id="artist" label="Artist">
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={value} onValueChange={onChange} disabled={isDisabled}>
                <SelectTrigger
                  id="artist"
                  className="bg-background dark:text-foreground"
                  disabled={isDisabled}
                >
                  <SelectValue placeholder="Select artist" />
                </SelectTrigger>
                <SelectContent className="bg-popover dark:bg-gray-800 dark:text-gray-100">
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  {Array.isArray(artists) && artists.length > 0 ? (
                    artists
                      .filter(artist => artist && typeof artist === 'string')
                      .map(artist => (
                        <SelectItem key={artist} value={artist}>
                          {artist}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="no-artists" disabled>
                      No artists found (click + to add)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isDisabled}
              onClick={e => {
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </FormField>

        {/* Use a dialog that won't submit the parent form when interacting with it */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={open => {
            setIsDialogOpen(open);
            // If closing the dialog, ensure we don't propagate the click event
            if (!open) {
              // Small delay to ensure the click doesn't propagate
              setTimeout(() => {}, 50);
            }
          }}
        >
          <DialogContent className="dark:bg-gray-800 dark:text-gray-100">
            <DialogHeader>
              <DialogTitle>Add New Artist</DialogTitle>
              <DialogDescription className="dark:text-gray-300">
                Enter the name of the diamond painting artist you want to add to your list.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddArtist} onClick={e => e.stopPropagation()}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-artist-name">Artist Name</Label>
                  <Input
                    id="new-artist-name"
                    placeholder="Enter artist name"
                    value={newArtistName}
                    onChange={e => setNewArtistName(e.target.value)}
                    disabled={createArtistMutation.isPending}
                    className="bg-background dark:text-foreground"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  disabled={createArtistMutation.isPending}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddArtist(e as unknown as React.FormEvent);
                  }}
                >
                  {createArtistMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Artist
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

export default ArtistSelect;
