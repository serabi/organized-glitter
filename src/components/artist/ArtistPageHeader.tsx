/**
 * Artist Page Header Component
 * @author @serabi
 * @created 2025-01-09
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Home } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { useCreateArtist } from '@/hooks/mutations/useCreateArtist';
import { ArtistsResponse } from '@/types/pocketbase.types';

/**
 * Props interface for the ArtistPageHeader component
 */
interface ArtistPageHeaderProps {
  artists: ArtistsResponse[];
}

/**
 * ArtistPageHeader Component
 *
 * Renders the header section for the Artist page including breadcrumbs,
 * title, and "Add Artist" dialog functionality.
 */
const ArtistPageHeader = ({ artists }: ArtistPageHeaderProps) => {
  const [newArtistName, setNewArtistName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const createArtistMutation = useCreateArtist();

  const handleAddArtist = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newArtistName.trim()) {
        toast({
          title: 'Error',
          description: 'Artist name cannot be empty',
          variant: 'destructive',
        });
        return;
      }

      // Check if artist already exists (client-side check)
      const artistNameLower = newArtistName.trim().toLowerCase();
      const existingArtist = artists.find(artist => artist.name.toLowerCase() === artistNameLower);

      if (existingArtist) {
        toast({
          title: 'Error',
          description: 'An artist with this name already exists',
          variant: 'destructive',
        });
        return;
      }

      // Create artist using React Query mutation
      createArtistMutation.mutate(
        { name: newArtistName.trim() },
        {
          onSuccess: () => {
            // Reset form and close dialog
            setNewArtistName('');
            setIsDialogOpen(false);
          },
        }
      );
    },
    [newArtistName, artists, toast, createArtistMutation]
  );

  return (
    <>
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">
              <Home className="h-4 w-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Artists</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8 flex flex-col items-start justify-between md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Artist List</h1>
          <p className="mt-1 text-muted-foreground">Manage the artists in your stash</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 md:mt-0">Add Artist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Artist</DialogTitle>
              <DialogDescription>
                Enter the name of the diamond painting artist you want to add to your list.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddArtist}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="artist-name">Artist Name</Label>
                  <Input
                    id="artist-name"
                    placeholder="Enter artist name"
                    value={newArtistName}
                    onChange={e => setNewArtistName(e.target.value)}
                    disabled={createArtistMutation.isPending}
                    autoFocus
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createArtistMutation.isPending}>
                  {createArtistMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Artist
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default React.memo(ArtistPageHeader);
