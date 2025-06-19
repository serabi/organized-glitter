import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, FileText, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import EditArtistDialog from '@/components/artist/EditArtistDialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useArtists } from '@/hooks/queries/useArtists';
import { useCreateArtist } from '@/hooks/mutations/useCreateArtist';
import { useDeleteArtist } from '@/hooks/mutations/useDeleteArtist';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArtistsResponse } from '@/types/pocketbase.types';
const ArtistList = () => {
  const [newArtistName, setNewArtistName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<ArtistsResponse | null>(null);
  const { toast } = useToast();

  // React Query hooks
  const { data: artists = [], isLoading: loading, error } = useArtists();
  const createArtistMutation = useCreateArtist();
  const deleteArtistMutation = useDeleteArtist();

  // Handle errors from React Query
  if (error) {
    toast({
      title: 'Error',
      description: 'Could not load artists',
      variant: 'destructive',
    });
  }
  const handleAddArtist = async (e: React.FormEvent) => {
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
  };
  const handleDeleteArtist = (artist: ArtistsResponse) => {
    setArtistToDelete(artist);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteArtist = async () => {
    if (!artistToDelete) return;

    deleteArtistMutation.mutate(artistToDelete.id, {
      onSettled: () => {
        setShowDeleteConfirmDialog(false);
        setArtistToDelete(null);
      },
    });
  };

  const handleArtistUpdated = () => {
    // React Query will automatically refetch when invalidated by the mutation
  };
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
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

        <div className="rounded-lg bg-card text-card-foreground shadow">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : artists.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artist Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artists.map(artist => (
                  <TableRow key={artist.id}>
                    <TableCell className="font-medium">{artist.name}</TableCell>
                    <TableCell>
                      <Link
                        to={`/dashboard?artist=${encodeURIComponent(artist.name)}`}
                        className="flex items-center text-primary hover:underline"
                      >
                        <FileText className="mr-1 h-4 w-4" />
                        View projects
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <EditArtistDialog artist={artist} onArtistUpdated={handleArtistUpdated} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteArtist(artist)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">You haven't added any artists yet.</p>
            </div>
          )}
        </div>
      </div>
      {artistToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the artist "
                {artistToDelete.name}" and remove it from all associated projects.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setArtistToDelete(null);
                  setShowDeleteConfirmDialog(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteArtist}
                disabled={deleteArtistMutation.isPending}
              >
                {deleteArtistMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </MainLayout>
  );
};

export default ArtistList;
