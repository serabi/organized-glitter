/**
 * Artist Management Table Component
 * @author @serabi
 * @created 2025-01-09
 */

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArtistsResponse } from '@/types/pocketbase.types';
import { useDeleteArtist } from '@/hooks/mutations/useArtistMutations';
import EditArtistDialog from './EditArtistDialog';
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

/**
 * Props interface for the ArtistTable component
 */
interface ArtistTableProps {
  artists: ArtistsResponse[];
  loading: boolean;
}

/**
 * ArtistTable Component
 *
 * Renders a data table displaying user artists with management functionality.
 * Features include editing capabilities and secure deletion.
 */
const ArtistTable = ({ artists, loading }: ArtistTableProps) => {
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<ArtistsResponse | null>(null);
  const deleteArtistMutation = useDeleteArtist();

  const handleDeleteArtist = (artist: ArtistsResponse) => {
    setArtistToDelete(artist);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteArtist = async () => {
    if (!artistToDelete) return;

    deleteArtistMutation.mutate(
      { id: artistToDelete.id },
      {
        onSuccess: () => {
          setShowDeleteConfirmDialog(false);
          setArtistToDelete(null);
        },
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">You haven't added any artists yet.</p>
      </div>
    );
  }

  return (
    <>
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
                  <EditArtistDialog artist={artist} />
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
    </>
  );
};

export default ArtistTable;
